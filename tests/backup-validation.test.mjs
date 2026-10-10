import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../src/domain.mjs';
function fixture(){
 let db=D.saveContact(D.initial(),{name:'Contacto',rif:'J-123',kind:'Ambos',days:0});
 db=D.saveProduct(db,{name:'Producto',sku:'P1',unit:'unidad',currency:'USD',cost:5,price:10,minimum:1});
 const base={contact:db.contacts[0].id,warehouse:'principal',currency:'USD',rate:50,date:D.today(),due:D.today(),lines:[{product:db.products[0].id,qty:3,price:10}]};
 db=D.createDocument(db,{...base,side:'purchase',kind:'Pedido de compra'});const po=db.documents.at(-1).id;db=D.confirmDocument(db,po);db=D.receive(db,po,{[db.products[0].id]:3});
 db=D.createDocument(db,{...base,side:'sale',kind:'Pedido'});const order=db.documents.at(-1).id;db=D.confirmDocument(db,order);db=D.invoiceFromOrder(db,order,{date:D.today(),due:D.today()});const invoice=db.documents.at(-1).id;
 db=D.createInvoiceNote(db,order,{invoice,kind:'Nota de crédito',amount:2,date:D.today(),reason:'Ajuste'});db=D.pay(db,{document:invoice,amount:5,date:D.today(),account:'Caja',method:'Efectivo'});
 db=D.createAccountEntry(db,{...base,side:'purchase',amount:20,concept:'Saldo inicial'});
 db.roles=[{id:'role',name:'Operador',permissions:{Ventas:{view:true}}}];db.users=[{id:'user',name:'Usuario',username:'user',email:'user@example.com',role:'role',active:true}];
 db.taxSettings={alternateSupplier:base.contact};db.taxControls={[invoice]:'CTRL'};db.taxes=[{id:'tax',code:'IVA',name:'IVA',type:'IVA',rate:16,active:true}];
 db.taxRetentions=[{id:'ret',document:invoice,contact:base.contact,currency:'USD',side:'sale',type:'IVA',date:D.today(),base:10,rate:1,amount:0.1,fiscalBase:''}];db.custom={retained:true};return db;
}
test('roundtrip conserva datos, extensiones, stock y saldos',()=>{const db=fixture(),copy=JSON.parse(JSON.stringify(db)),before=structuredClone(copy);assert.equal(D.validateImport(copy),copy);assert.deepEqual(copy,before);assert.equal(D.stock(copy,copy.products[0].id),D.stock(db,db.products[0].id));assert.equal(D.balance(copy,copy.documents.find(d=>d.kind==='Venta')),23);assert.deepEqual(D.validateImport(D.initial()),D.initial());});
const cases=[
 ['ID duplicado',db=>db.contacts.push({...db.contacts[0]}),/identificador duplicado/],
 ['RIF duplicado',db=>db.contacts.push({...db.contacts[0],id:'other'}),/duplicado/],
 ['contacto inexistente',db=>db.documents[0].contact='missing',/referencia inexistente/],
 ['producto inexistente',db=>db.documents[0].lines[0].product='missing',/referencia inexistente/],
 ['estado inválido',db=>db.documents[0].status='X',/valor no permitido/],
 ['tipo inválido',db=>db.documents[0].kind='X',/valor no permitido/],
 ['fecha imposible',db=>db.documents[0].date='2026-02-30',/fecha inválida/],
 ['importe infinito',db=>db.documents[0].total=Infinity,/no finito/],
 ['cantidad negativa',db=>db.documents[0].lines[0].qty=-1,/fuera de rango/],
 ['origen inexistente',db=>db.documents[0].source='missing',/referencia inexistente/],
 ['ciclo',db=>db.documents[0].source=db.documents[1].id,/ciclo/],
 ['pago incompatible',db=>db.payments[0].currency='VES',/incompatible/],
 ['rol inexistente',db=>db.users[0].role='missing',/referencia inexistente/],
 ['permiso inválido',db=>db.roles[0].permissions.Ventas.view='sí',/booleano/],
 ['retención huérfana',db=>db.taxRetentions[0].document='missing',/referencia inexistente/],
 ['control huérfano',db=>db.taxControls.missing='X',/referencia inexistente/],
 ['lista inválida',db=>db.products=null,/lista/],
 ['fila nula',db=>db.contacts[0]=null,/objeto/]
];
for(const [name,corrupt,expected] of cases)test(`rechaza ${name} sin modificar datos`,()=>{const current=fixture(),before=structuredClone(current),candidate=structuredClone(current);corrupt(candidate);const corrupted=structuredClone(candidate);assert.throws(()=>D.validateImport(candidate),expected);assert.deepEqual(candidate,corrupted);assert.deepEqual(current,before)});
