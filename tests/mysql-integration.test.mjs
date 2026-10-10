import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPool} from '../server/mysql/connection.mjs';
import {bootstrap,loadState,saveState} from '../server/mysql/store.mjs';
import * as D from '../src/domain.mjs';
test('MySQL real: roundtrip, concurrencia, idempotencia y recuperación de respaldo',{skip:process.env.ERP_MYSQL_TEST!=='1'},async()=>{
 const pool=createPool(),company='test-'+randomUUID();let db=D.saveContact(D.initial(),{name:'Contacto de prueba',rif:'J-TEST',kind:'Ambos',days:0});
 db=D.saveProduct(db,{name:'Producto prueba',sku:'TEST',unit:'unidad',currency:'USD',cost:5,price:10,minimum:0});db=D.adjust(db,{product:db.products[0].id,warehouse:'principal',qty:5,reason:'Inicial'});
 db=D.createDocument(db,{kind:'Pedido',side:'sale',contact:db.contacts[0].id,warehouse:'principal',date:D.today(),due:D.today(),currency:'USD',rate:0,lines:[{product:db.products[0].id,qty:2,price:10}]});db=D.confirmDocument(db,db.documents.at(-1).id);db=D.invoiceFromOrder(db,db.documents.at(-1).id,{date:D.today(),due:D.today()});db=D.pay(db,{document:db.documents.at(-1).id,amount:5,account:'Caja prueba',method:'Efectivo',date:D.today()});
 try{
  const state=await bootstrap(pool,db,company);assert.equal(state.revision,0);assert.equal(D.stock(state.db,db.products[0].id),3);assert.equal(D.balance(state.db,state.db.documents.find(d=>d.kind==='Venta')),15);
  const next=D.adjust(state.db,{product:db.products[0].id,warehouse:'principal',qty:-1,reason:'Prueba de escritura'}),key=randomUUID();
  const requests=[{db:next,revision:0,requestKey:key},{db:next,revision:0,requestKey:randomUUID()}];
  const results=await Promise.allSettled(requests.map(r=>saveState(pool,r,company)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  const winner=requests[results.findIndex(r=>r.status==='fulfilled')];assert.equal((await saveState(pool,winner,company)).revision,1);
  const loaded=await loadState(pool,company);assert.equal(D.stock(loaded.db,db.products[0].id),2);assert.equal(loaded.revision,1);
  const [backups]=await pool.execute('SELECT snapshot FROM SUMI_backups WHERE company_id=?',[company]);assert.equal(backups.length,1);const snapshot=typeof backups[0].snapshot==='string'?JSON.parse(backups[0].snapshot):backups[0].snapshot;assert.equal(D.stock(D.validateImport(snapshot),db.products[0].id),3);
  const restore=await saveState(pool,{db:snapshot,revision:1,requestKey:randomUUID()},company);assert.equal(restore.revision,2);assert.equal(D.stock((await loadState(pool,company)).db,db.products[0].id),3);
  const broken=structuredClone(snapshot);broken.contacts[0].name='x'.repeat(300);await assert.rejects(saveState(pool,{db:broken,revision:2,requestKey:randomUUID()},company));assert.equal((await loadState(pool,company)).revision,2);
  const [audit]=await pool.execute('SELECT COUNT(*) AS count FROM SUMI_audit WHERE company_id=?',[company]);assert.equal(Number(audit[0].count),3);
 }finally{
  // Only this test's newly created company is removed; user data is never selected.
  await pool.execute('UPDATE SUMI_documents SET source_id=NULL WHERE company_id=?',[company]);
  for(const table of ['SUMI_document_lines','SUMI_payments','SUMI_movements','SUMI_documents','SUMI_users','SUMI_roles','SUMI_contacts','SUMI_products','SUMI_warehouses','SUMI_audit','SUMI_idempotency','SUMI_backups'])await pool.execute(`DELETE FROM ${table} WHERE company_id=?`,[company]);
  await pool.execute('DELETE FROM SUMI_companies WHERE id=?',[company]);await pool.end();
 }
});
