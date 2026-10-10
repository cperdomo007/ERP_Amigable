import {writeFile} from 'node:fs/promises';
import {createPool,transaction} from './connection.mjs';
import {validateImport} from '../../src/backup-validation.mjs';
const json=v=>typeof v==='string'?JSON.parse(v):v;
export async function exportBackup(pool,companyId){return transaction(pool,c=>readRows(c,companyId))}
export async function readRows(c,companyId){
 const [companies]=await c.execute('SELECT settings FROM SUMI_companies WHERE id=? FOR UPDATE',[companyId]);if(!companies.length)throw Error('Empresa inexistente.');
 const db=json(companies[0].settings);
 for(const [key,table] of Object.entries({paymentReversals:'SUMI_payment_reversals',refunds:'SUMI_refunds',reconciliations:'SUMI_reconciliations',accountClosures:'SUMI_closures',serialUnits:'SUMI_serial_units',savedFilters:'SUMI_filters'})){const [rows]=await c.execute(`SELECT payload FROM ${table} WHERE company_id=?`,[companyId]);if(rows.length||!db[key])db[key]=rows.map(r=>json(r.payload))}
 for(const [key,table] of Object.entries({contacts:'SUMI_contacts',products:'SUMI_products',warehouses:'SUMI_warehouses',documents:'SUMI_documents',movements:'SUMI_movements',payments:'SUMI_payments',roles:'SUMI_roles',users:'SUMI_users'})){
  const [rows]=await c.execute(`SELECT payload FROM ${table} WHERE company_id=?`,[companyId]);db[key]=rows.map(r=>json(r.payload));
 }
 return validateImport(db);
}
if(process.argv[1]&&import.meta.url===(await import('node:url')).pathToFileURL(process.argv[1]).href){let pool;try{const [companyId,path]=process.argv.slice(2);if(!path||!companyId)throw Error('Uso: npm run db:export -- ID_EMPRESA archivo.json');pool=createPool();const db=await exportBackup(pool,companyId);await writeFile(path,JSON.stringify(db,null,2),{flag:'wx'});console.log('Respaldo exportado y validado.')}catch(error){console.error('Exportación no completada:',error.code||error.message);process.exitCode=1}finally{if(pool)await pool.end()}}
