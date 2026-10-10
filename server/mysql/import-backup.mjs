import {readFile} from 'node:fs/promises';
import {createPool,transaction} from './connection.mjs';
import {validateImport} from '../../src/backup-validation.mjs';
export async function importBackup(pool,db,companyId){
 validateImport(db);
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(companyId))throw Error('ID de empresa inválido.');
 return transaction(pool,async c=>{
  // A new company only: never overwrite another import or existing enterprise.
  const extras=Object.fromEntries(Object.entries(db).filter(([k])=>!['contacts','products','warehouses','documents','movements','payments','roles','users'].includes(k)));
  await c.execute('INSERT INTO SUMI_companies(id,name,settings) VALUES (?,?,?)',[companyId,db.company?.name||'Empresa importada',JSON.stringify(extras)]);
  await writeRows(c,db,companyId);
  const counts=Object.fromEntries(['contacts','products','warehouses','documents','movements','payments'].map(k=>[k,db[k].length]));
  await c.execute('INSERT INTO SUMI_audit(company_id,actor,action,details) VALUES (?,?,?,?)',[companyId,'local-cli','backup.import',JSON.stringify(counts)]);
  return counts;
 });
}
export async function writeRows(c,db,companyId){
  const insert=async(table,columns,values)=>c.execute(`INSERT INTO ${table} (company_id,${columns}) VALUES (${values.map(()=>'?').join(',')},?)`,[companyId,...values]);
  for(const r of db.roles||[])await insert('SUMI_roles','id,name,payload',[r.id,r.name,JSON.stringify(r)]);
  for(const u of db.users||[])await insert('SUMI_users','id,role_id,username,email,active,payload',[u.id,u.role,u.username,u.email,u.active,JSON.stringify(u)]);
  for(const r of db.contacts)await insert('SUMI_contacts','id,rif,name,payload',[r.id,r.rif,r.name,JSON.stringify(r)]);
  for(const r of db.products)await insert('SUMI_products','id,sku,name,cost,price,minimum_qty,payload',[r.id,r.sku,r.name,String(r.cost),String(r.price),String(r.minimum),JSON.stringify(r)]);
  for(const r of db.warehouses)await insert('SUMI_warehouses','id,name,payload',[r.id,r.name,JSON.stringify(r)]);
  for(const r of db.documents)await insert('SUMI_documents','id,contact_id,warehouse_id,number,kind,status,currency,total,exchange_rate,payload',[r.id,r.contact,r.warehouse??null,r.number,r.kind,r.status,r.currency,String(r.total),String(r.rate),JSON.stringify(r)]);
  // Second pass permits valid backups whose derived documents precede their source.
  for(const r of db.documents){if(r.source)await c.execute('UPDATE SUMI_documents SET source_id=? WHERE company_id=? AND id=?',[r.source,companyId,r.id]);for(const [i,l] of r.lines.entries())await insert('SUMI_document_lines','document_id,line_number,product_id,qty,price,payload',[r.id,i+1,l.product??null,String(l.qty),String(l.price),JSON.stringify(l)])}
  for(const r of db.movements)await insert('SUMI_movements','id,product_id,warehouse_id,document_id,qty,payload',[r.id,r.product,r.warehouse,r.document??null,String(r.qty),JSON.stringify(r)]);
  for(const r of db.payments)await insert('SUMI_payments','id,document_id,amount,payload',[r.id,r.document,String(r.amount),JSON.stringify(r)]);
  for(const r of db.refunds||[])await insert('SUMI_refunds','id,document_id,amount,payload',[r.id,r.document,String(r.amount),JSON.stringify(r)]);
  for(const r of db.paymentReversals||[])await insert('SUMI_payment_reversals','id,payment_id,document_id,amount,payload',[r.id,r.payment,r.document,String(r.amount),JSON.stringify(r)]);
  for(const r of db.reconciliations||[])await insert('SUMI_reconciliations','id,payment_id,amount,payload',[r.id,r.payment,String(r.amount),JSON.stringify(r)]);
  for(const r of db.accountClosures||[])await insert('SUMI_closures','id,side,currency,status,start_date,end_date,total,balance,payload',[r.id,r.side,r.currency,r.status,r.from,r.to,String(r.totals.total),String(r.totals.balance),JSON.stringify(r)]);
  for(const r of db.serialUnits||[])await insert('SUMI_serial_units','serial,product_id,warehouse_id,document_id,status,payload',[r.serial,r.product,r.warehouse,r.document??null,r.status,JSON.stringify(r)]);
  for(const r of db.savedFilters||[])await insert('SUMI_filters','id,user_id,scope,payload',[r.id,r.owner,r.scope,JSON.stringify(r)]);
}
if(process.argv[1]&&import.meta.url===(await import('node:url')).pathToFileURL(process.argv[1]).href){
 let pool;try{const [path,companyId]=process.argv.slice(2);if(!path||!companyId)throw Error('Uso: npm run db:import -- respaldo.json ID_EMPRESA');const db=JSON.parse(await readFile(path,'utf8'));validateImport(db);pool=createPool();console.log(await importBackup(pool,db,companyId))}catch(error){console.error('Importación no completada:',error.code||error.message);process.exitCode=1}finally{if(pool)await pool.end()}
}
