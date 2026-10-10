import {createHash} from 'node:crypto';
import {transaction} from './connection.mjs';
import {readRows} from './export-backup.mjs';
import {writeRows,importBackup} from './import-backup.mjs';
import {validateImport} from '../../src/backup-validation.mjs';
export const defaultCompany='empresa-local';
export class StoreError extends Error{constructor(status,message){super(message);this.status=status}}
export async function loadState(pool,company=defaultCompany){return transaction(pool,async c=>{
 const [rows]=await c.execute('SELECT revision FROM SUMI_companies WHERE id=? FOR UPDATE',[company]);if(!rows.length)throw new StoreError(404,'La empresa todavía no fue migrada.');
 return {db:await readRows(c,company),revision:Number(rows[0].revision)};
})}
export async function bootstrap(pool,db,company=defaultCompany){
 validateImport(db);try{await importBackup(pool,db,company)}catch(e){if(e.code!=='ER_DUP_ENTRY')throw e}
 return loadState(pool,company);
}
export async function listBackups(pool,company=defaultCompany){const [rows]=await pool.execute('SELECT revision,created_at FROM SUMI_backups WHERE company_id=? ORDER BY revision DESC LIMIT 50',[company]);return rows.map(r=>({revision:Number(r.revision),createdAt:r.created_at}))}
export async function loadBackup(pool,revision,company=defaultCompany){if(!Number.isSafeInteger(revision)||revision<0)throw new StoreError(400,'Versión inválida.');const [rows]=await pool.execute('SELECT snapshot FROM SUMI_backups WHERE company_id=? AND revision=?',[company,revision]);if(!rows.length)throw new StoreError(404,'Respaldo inexistente.');return validateImport(typeof rows[0].snapshot==='string'?JSON.parse(rows[0].snapshot):rows[0].snapshot)}
const collections=['contacts','products','warehouses','documents','movements','payments','roles','users'];
export async function saveState(pool,{db,revision,requestKey,input},company=defaultCompany,actor='local-desktop',transform=null){
 if(!transform)validateImport(db);if(!Number.isSafeInteger(revision)||revision<0||typeof requestKey!=='string'||!/^[a-zA-Z0-9-]{16,100}$/.test(requestKey))throw new StoreError(400,'Versión o clave de solicitud inválida.');
 const hash=createHash('sha256').update(JSON.stringify({payload:transform?input:db,revision,actor})).digest('hex');
 return transaction(pool,async c=>{
  const [rows]=await c.execute('SELECT revision FROM SUMI_companies WHERE id=? FOR UPDATE',[company]);if(!rows.length)throw new StoreError(404,'Empresa inexistente.');
  const [requests]=await c.execute('SELECT request_hash,response FROM SUMI_idempotency WHERE company_id=? AND request_key=?',[company,requestKey]);
  if(requests.length){if(requests[0].request_hash!==hash)throw new StoreError(409,'La clave de solicitud ya fue usada para otra operación.');return typeof requests[0].response==='string'?JSON.parse(requests[0].response):requests[0].response}
  if(Number(rows[0].revision)!==revision)throw new StoreError(409,'Los datos cambiaron en otra sesión. Recargá antes de repetir la operación.');
  const before=await readRows(c,company);
  if(transform)db=await transform(before,c);validateImport(db);
  await c.execute('INSERT INTO SUMI_backups(company_id,revision,snapshot) VALUES (?,?,?)',[company,revision,JSON.stringify(before)]);
  // FK-safe replacement inside one transaction, under the company revision lock.
  await c.execute('UPDATE SUMI_documents SET source_id=NULL WHERE company_id=?',[company]);
  for(const table of ['SUMI_payment_reversals','SUMI_refunds','SUMI_reconciliations','SUMI_closures','SUMI_serial_units','SUMI_filters','SUMI_document_lines','SUMI_payments','SUMI_movements','SUMI_documents','SUMI_users','SUMI_roles','SUMI_contacts','SUMI_products','SUMI_warehouses'])await c.execute(`DELETE FROM ${table} WHERE company_id=?`,[company]);
  await writeRows(c,db,company);
  const settings=Object.fromEntries(Object.entries(db).filter(([k])=>!collections.includes(k)));
  await c.execute('UPDATE SUMI_companies SET settings=?,name=?,revision=revision+1 WHERE id=?',[JSON.stringify(settings),db.company?.name||'Empresa local',company]);
  const details={revision:revision+1,changes:[...collections,'refunds','reconciliations','accountClosures','savedFilters','paymentReversals'].filter(k=>JSON.stringify(before[k]||[])!==JSON.stringify(db[k]||[])),actions:input?.restore?['backup.restore']:input?.commands?.map(cmd=>cmd.action)||['state.save'],operations:input?.commands?.map(cmd=>({action:cmd.action,target:typeof cmd.args?.[0]==='string'?cmd.args[0]:cmd.args?.[0]?.document||null,ids:cmd.ids,reason:cmd.action==='reopenPeriod'?cmd.args[1]:cmd.action==='returnGoods'?cmd.args[1]?.reason:undefined}))};
  await c.execute('INSERT INTO SUMI_audit(company_id,actor,action,details) VALUES (?,?,?,?)',[company,actor,input?'commands.execute':'state.save',JSON.stringify(details)]);
  const result={revision:revision+1,db};await c.execute('INSERT INTO SUMI_idempotency(company_id,request_key,request_hash,response) VALUES (?,?,?,?)',[company,requestKey,hash,JSON.stringify(result)]);return result;
 });
}
