// Read-only validation: preserve compatible fields and never repair a backup silently.
export function validateImport(db) {
 const fail=(path,message)=>{throw Error(`Respaldo inválido (${path}): ${message}.`)};
 const object=(v,p)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(p,'se esperaba un objeto')};
 const text=(v,p)=>{if(typeof v!=='string'||!v.trim())fail(p,'texto obligatorio')};
 const number=(v,p,min=0,max=Infinity)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(p,'número fuera de rango')};
 const choice=(v,p,values)=>{if(!values.includes(v))fail(p,'valor no permitido')};
 const date=(v,p)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T12:00:00Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)fail(p,'fecha inválida')};
 const unique=(rows,key,p)=>{const seen=new Set();for(const r of rows){text(r[key],p+'.'+key);const value=r[key].trim().toUpperCase();if(seen.has(value))fail(p+'.'+key,'valor duplicado');seen.add(value)}};
 object(db,'base');if(db.version!==1)fail('version','versión no compatible');number(db.rate,'rate');
 const inspect=(value,path)=>{if(typeof value==='number'&&!Number.isFinite(value))fail(path,'número no finito');if(value&&typeof value==='object')for(const [key,child] of Object.entries(value))inspect(child,path+'.'+key)};inspect(db,'base');
 const maps={};
 for(const key of ['contacts','products','warehouses','movements','documents','payments','roles','users','taxes','taxRetentions']){
  if(db[key]===undefined&&['roles','users','taxes','taxRetentions'].includes(key)){maps[key]=new Map();continue}
  if(!Array.isArray(db[key]))fail(key,'se esperaba una lista');
  const map=new Map();db[key].forEach((row,i)=>{const p=`${key}[${i}]`;object(row,p);text(row.id,p+'.id');if(map.has(row.id))fail(p+'.id','identificador duplicado');map.set(row.id,row)});maps[key]=map;
 }
 const ref=(key,id,p)=>{if(!maps[key].has(id))fail(p,'referencia inexistente');return maps[key].get(id)};
 for(const c of maps.contacts.values()){text(c.name,'contacts.name');text(c.rif,'contacts.rif');choice(c.kind,'contacts.kind',['Cliente','Proveedor','Ambos']);if(c.days!==undefined){number(c.days,'contacts.days');if(!Number.isSafeInteger(c.days))fail('contacts.days','plazo no entero')}}
 unique(db.contacts,'rif','contacts');unique(db.products,'sku','products');
 for(const p of maps.products.values()){text(p.name,'products.name');text(p.unit,'products.unit');choice(p.currency,'products.currency',['USD','VES']);for(const k of ['cost','price','minimum'])number(p[k],'products.'+k)}
 for(const w of maps.warehouses.values())text(w.name,'warehouses.name');
 const kinds={sale:['Presupuesto','Pedido','Venta','Nota de entrega','Nota de crédito','Nota de débito','Cuenta por cobrar'],purchase:['Pedido de compra','Recepción','Cuenta por pagar']};
 for(const d of maps.documents.values()){
  const p=`documents.${d.id}`;choice(d.side,p+'.side',['sale','purchase']);choice(d.kind,p+'.kind',kinds[d.side]);choice(d.status,p+'.status',d.kind==='Pedido de compra'?['Borrador','Confirmado','Recibido']:['Borrador','Confirmado']);
  text(d.number,p+'.number');const c=ref('contacts',d.contact,p+'.contact');if(!['Ambos',d.side==='sale'?'Cliente':'Proveedor'].includes(c.kind))fail(p+'.contact','tipo de contacto incompatible');
  choice(d.currency,p+'.currency',['USD','VES']);number(d.rate,p+'.rate');if(d.currency==='VES'&&d.rate<=0)fail(p+'.rate','tasa positiva obligatoria');number(d.total,p+'.total');
  date(d.date,p+'.date');date(d.due,p+'.due');if(d.due<d.date)fail(p+'.due','vencimiento anterior a emisión');
  const manual=['Cuenta por cobrar','Cuenta por pagar','Nota de crédito','Nota de débito'].includes(d.kind);
  if(!manual||d.warehouse!==undefined)ref('warehouses',d.warehouse,p+'.warehouse');
  if(!Array.isArray(d.lines)||!d.lines.length)fail(p+'.lines','líneas obligatorias');
  const seen=new Set();for(const l of d.lines){object(l,p+'.lines');number(l.qty,p+'.qty',Number.MIN_VALUE);number(l.price,p+'.price');if(manual)text(l.description,p+'.description');else{ref('products',l.product,p+'.product');if(seen.has(l.product))fail(p+'.product','producto repetido');seen.add(l.product)}
   for(const k of ['discount','taxRate'])if(l[k]!==undefined)number(l[k],p+'.'+k,0,100);
   if(l.serials!==undefined&&(!Array.isArray(l.serials)||l.serials.some(s=>typeof s!=='string'||!s.trim())))fail(p+'.serials','lista de seriales inválida');
  }
  for(const k of ['subtotal','discountTotal','taxTotal'])if(d[k]!==undefined)number(d[k],p+'.'+k);
  if(d.source!==undefined){const source=ref('documents',d.source,p+'.source');const expected={'Pedido':'Presupuesto','Venta':'Pedido','Nota de entrega':'Venta','Recepción':'Pedido de compra','Nota de crédito':'Venta','Nota de débito':'Venta'}[d.kind];if(source.id===d.id||source.side!==d.side||source.contact!==d.contact||source.currency!==d.currency||(expected&&source.kind!==expected))fail(p+'.source','origen incompatible')}
  if(d.order!==undefined)ref('documents',d.order,p+'.order');
  if(d.received!==undefined){object(d.received,p+'.received');for(const [id,qty] of Object.entries(d.received)){const line=d.lines.find(l=>l.product===id);if(!line)fail(p+'.received','producto ajeno al pedido');number(qty,p+'.received',0,line.qty)}}
 }
 unique(db.documents,'number','documents');
 for(const d of maps.documents.values()){const seen=new Set([d.id]);let node=d;while(node.source!==undefined){if(seen.has(node.source))fail('documents.source','ciclo de documentos');seen.add(node.source);node=maps.documents.get(node.source)}}
 for(const m of maps.movements.values()){ref('products',m.product,'movements.product');ref('warehouses',m.warehouse,'movements.warehouse');number(m.qty,'movements.qty',-Infinity);if(m.qty===0)fail('movements.qty','cantidad cero');date(m.date,'movements.date');choice(m.type,'movements.type',['Ajuste','Venta','Recepción']);if(m.document!==undefined)ref('documents',m.document,'movements.document')}
 for(const p of maps.payments.values()){const d=ref('documents',p.document,'payments.document');if(d.status!=='Confirmado'||!['Venta','Recepción','Cuenta por cobrar','Cuenta por pagar'].includes(d.kind))fail('payments.document','documento no admite pagos');number(p.amount,'payments.amount',Number.MIN_VALUE);number(p.rate,'payments.rate');if(p.currency!==d.currency||p.side!==d.side)fail('payments','moneda o tipo incompatible');text(p.account,'payments.account');text(p.method,'payments.method');date(p.date,'payments.date');if(p.date<d.date)fail('payments.date','pago anterior a emisión')}
 if(db.company!==undefined){object(db.company,'company');text(db.company.name,'company.name');text(db.company.rif,'company.rif');if(db.company.taxRate!==undefined)number(db.company.taxRate,'company.taxRate',0,100)}
 for(const r of maps.roles.values()){text(r.name,'roles.name');object(r.permissions,'roles.permissions');for(const permissions of Object.values(r.permissions)){object(permissions,'roles.permissions');for(const value of Object.values(permissions))if(typeof value!=='boolean')fail('roles.permissions','permiso no booleano')}}
 unique(db.roles||[],'name','roles');unique(db.users||[],'username','users');unique(db.users||[],'email','users');
 for(const u of maps.users.values()){text(u.name,'users.name');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email))fail('users.email','correo inválido');ref('roles',u.role,'users.role');if(typeof u.active!=='boolean')fail('users.active','estado inválido')}
 for(const t of maps.taxes.values()){text(t.code,'taxes.code');text(t.name,'taxes.name');choice(t.type,'taxes.type',['IVA','ISLR','Otro']);number(t.rate,'taxes.rate',0,100);if(typeof t.active!=='boolean')fail('taxes.active','estado inválido')}
 unique(db.taxes||[],'code','taxes');
 for(const r of maps.taxRetentions.values()){const d=ref('documents',r.document,'taxRetentions.document');ref('contacts',r.contact,'taxRetentions.contact');if(r.contact!==d.contact||r.side!==d.side||r.currency!==d.currency)fail('taxRetentions','documento incompatible');choice(r.type,'taxRetentions.type',['IVA','ISLR']);date(r.date,'taxRetentions.date');number(r.base,'taxRetentions.base',Number.MIN_VALUE);number(r.rate,'taxRetentions.rate',0,100);number(r.amount,'taxRetentions.amount')}
 if(db.taxSettings!==undefined){object(db.taxSettings,'taxSettings');if(db.taxSettings.alternateSupplier){const c=ref('contacts',db.taxSettings.alternateSupplier,'taxSettings.alternateSupplier');if(!['Proveedor','Ambos'].includes(c.kind))fail('taxSettings.alternateSupplier','contacto no proveedor')}}
 if(db.taxControls!==undefined){object(db.taxControls,'taxControls');const seen=new Set();for(const [id,value] of Object.entries(db.taxControls)){ref('documents',id,'taxControls');text(value,'taxControls');if(seen.has(value))fail('taxControls','control duplicado');seen.add(value)}}
 for(const k of ['documentSequence','taxRetentionSequence'])if(db[k]!==undefined){number(db[k],k);if(!Number.isSafeInteger(db[k]))fail(k,'secuencia no entera')}
 return db;
}
