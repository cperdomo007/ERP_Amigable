export const today = () => new Date().toLocaleDateString('en-CA', {timeZone:'America/Caracas'});
export const uid = () => crypto.randomUUID();
export const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export function saveCompany(db,data){
 const company=Object.fromEntries(['name','rif','address','phone','phone2','email','logo'].map(k=>[k,String(data[k]||'').trim()]));
 company.taxRate=Number(data.taxRate??0);
 if(!Number.isFinite(company.taxRate)||company.taxRate<0||company.taxRate>100)throw Error('El IVA debe estar entre 0 y 100%.');
 company.rif=company.rif.toUpperCase();
 if(!company.name||!company.rif)throw Error('Nombre de empresa y RIF son obligatorios.');
 if(!/^[VJEGPC]-?\d{8}-?\d$/.test(company.rif))throw Error('Ingresá un RIF con prefijo y nueve dígitos, por ejemplo J-12345678-9.');
 if(company.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email))throw Error('Correo electrónico inválido.');
 if(company.logo&&(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(company.logo)||company.logo.length>1450000))throw Error('Logo inválido o demasiado grande.');
 return {...db,company};
}
export const initial = () => ({version:1, contacts:[], products:[], warehouses:[{id:'principal',name:'Principal'}], movements:[], documents:[], payments:[], rate:0});
export const stock = (db, product, warehouse) => round(db.movements.filter(m=>m.product===product && (!warehouse || m.warehouse===warehouse)).reduce((s,m)=>s+m.qty,0));
export const reserved = (db,product,warehouse,excludeOrder) => round(db.documents.filter(d=>d.kind==='Pedido'&&d.status==='Confirmado'&&d.reservationActive===true&&d.id!==excludeOrder&&(!warehouse||d.warehouse===warehouse)&&!db.documents.some(i=>i.source===d.id&&i.kind==='Venta'&&i.status==='Confirmado')).reduce((sum,d)=>sum+d.lines.filter(l=>l.product===product).reduce((n,l)=>n+l.qty,0),0));
export const available = (db,product,warehouse,excludeOrder) => round(stock(db,product,warehouse)-reserved(db,product,warehouse,excludeOrder));
export function reserveOrder(db,id,active=true){
 const order=db.documents.find(d=>d.id===id&&d.kind==='Pedido'&&d.status==='Confirmado');
 if(!order||db.documents.some(d=>d.source===id&&d.kind==='Venta'&&d.status==='Confirmado'))throw Error('Solo se reservan órdenes confirmadas pendientes de facturar.');
 if(active)for(const l of order.lines)if(available(db,l.product,order.warehouse,id)<l.qty)throw Error('Stock disponible insuficiente para reservar toda la orden.');
 return {...db,documents:db.documents.map(d=>d.id===id?{...d,reservationActive:active}:d)};
}
export function transferStock(db,data){
 const p=db.products.find(p=>p.id===data.product),qty=round(data.qty);
 if(!p||!db.warehouses.some(w=>w.id===data.from)||!db.warehouses.some(w=>w.id===data.to)||data.from===data.to)throw Error('Seleccioná producto y dos depósitos diferentes.');
 if(p.hasSerial)throw Error('La transferencia por serial requiere trazabilidad de entradas; todavía no está disponible.');
 if(!Number.isFinite(qty)||qty<=0||!data.reason?.trim())throw Error('Indicá cantidad positiva y motivo.');
 if(available(db,p.id,data.from)<qty)throw Error('Stock disponible insuficiente en el depósito de origen.');
 const transfer=uid(),common={transfer,product:p.id,date:today(),type:'Transferencia',reason:data.reason.trim()};
 return {...db,movements:[...db.movements,{...common,id:uid(),warehouse:data.from,qty:-qty},{...common,id:uid(),warehouse:data.to,qty}]};
}
export const balance = (db,doc) => round(doc.total+db.documents.filter(d=>d.source===doc.id&&d.status==='Confirmado'&&['Nota de crédito','Nota de débito'].includes(d.kind)).reduce((sum,d)=>sum+(d.kind==='Nota de crédito'?-d.total:d.total),0)-db.payments.filter(p=>p.document===doc.id).reduce((s,p)=>s+p.amount,0));
export function saveContact(db, data) {
 if(!['Cliente','Proveedor','Ambos'].includes(data.kind))throw Error('Tipo de contacto inválido.');
 if(!Number.isSafeInteger(Number(data.days??0))||Number(data.days??0)<0)throw Error('El plazo debe ser un entero no negativo.');
 if(!data.name?.trim() || !data.rif?.trim()) throw Error('Nombre y RIF son obligatorios.');
 if(db.contacts.some(c=>c.rif.toUpperCase()===data.rif.trim().toUpperCase())) throw Error('Ya existe un contacto con ese RIF.');
 return {...db,contacts:[...db.contacts,{...data,id:uid(),name:data.name.trim(),rif:data.rif.trim().toUpperCase(),days:Number(data.days)||0}]};
}
export function updateContact(db,id,data){
 const existing=db.contacts.find(c=>c.id===id);
 if(!existing)throw Error('El contacto ya no existe.');
 if(db.documents.some(d=>d.contact===id&&d.side==='sale')&&!['Cliente','Ambos'].includes(data.kind))throw Error('Este contacto tiene ventas: conservá el tipo Cliente o Ambos.');
 if(db.documents.some(d=>d.contact===id&&d.side==='purchase')&&!['Proveedor','Ambos'].includes(data.kind))throw Error('Este contacto tiene compras: conservá el tipo Proveedor o Ambos.');
 const checked=saveContact({...db,contacts:db.contacts.filter(c=>c.id!==id)},data).contacts.at(-1);
 return {...db,contacts:db.contacts.map(c=>c.id===id?{...c,...checked,id}:c)};
}
export function saveProduct(db,data) {
 if(!String(data.unit||'').trim()||data.price===''||!['USD','VES'].includes(data.currency))throw Error('Completá UND, precio y moneda en General.');
 for(const key of ['weight','height','width','length'])if(data[key]!==undefined&&data[key]!==''&&(!Number.isFinite(Number(data[key]))||Number(data[key])<0))throw Error('Peso y dimensiones deben ser números no negativos.');
 if(data.imageUrl){try{const url=new URL(data.imageUrl);if(!['http:','https:'].includes(url.protocol))throw Error();}catch{throw Error('El enlace de imagen debe ser HTTP o HTTPS.');}}
 if(!data.name?.trim()||!data.sku?.trim()) throw Error('Nombre y SKU son obligatorios.');
 if(db.products.some(p=>p.sku.toUpperCase()===data.sku.trim().toUpperCase())) throw Error('El SKU ya está registrado.');
 for(const field of ['cost','price','minimum']) if(!Number.isFinite(Number(data[field]))||Number(data[field])<0) throw Error('Los importes y mínimos deben ser positivos o cero.');
 return {...db,products:[...db.products,{...data,id:uid(),sku:data.sku.trim().toUpperCase(),cost:round(data.cost),price:round(data.price),minimum:Number(data.minimum)}]};
}
export function updateProduct(db,id,data){
 if(!db.products.some(p=>p.id===id))throw Error('El producto ya no existe.');
 const checked=saveProduct({...db,products:db.products.filter(p=>p.id!==id)},data).products.at(-1);
 return {...db,products:db.products.map(p=>p.id===id?{...p,...checked,id}:p)};
}
export function adjust(db,data) {
 const qty=Number(data.qty);
 if(!db.products.some(p=>p.id===data.product)||!db.warehouses.some(w=>w.id===data.warehouse)) throw Error('Seleccioná producto y depósito.');
 if(!Number.isFinite(qty)||qty===0||!data.reason?.trim()) throw Error('Indicá una cantidad distinta de cero y un motivo.');
 if(available(db,data.product,data.warehouse)+qty<0) throw Error('El ajuste dejaría existencias disponibles negativas o consumiría una reserva.');
 return {...db,movements:[...db.movements,{...data,id:uid(),qty,date:today(),type:'Ajuste'}]};
}
export function createDocument(db,data) {
 if(data.kind==='Venta'){
  const order=db.documents.find(d=>d.id===data.source&&d.kind==='Pedido'&&d.status==='Confirmado');
  if(!order)throw Error('La factura solo se puede generar desde una orden de venta confirmada.');
  if(db.documents.some(d=>d.kind==='Venta'&&d.source===order.id))throw Error('Esta orden ya tiene una factura.');
 }

 const contact=db.contacts.find(c=>c.id===data.contact);
 if(!contact || !(contact.kind==='Ambos'||contact.kind===(data.side==='sale'?'Cliente':'Proveedor'))) throw Error('Seleccioná un contacto válido para esta operación.');
 if(!['USD','VES'].includes(data.currency)) throw Error('Moneda inválida.');
 if(data.currency==='VES' && !(Number(data.rate)>0)) throw Error('Configurá una tasa positiva para operaciones en bolívares.');
 if(!data.date||!data.due||data.due<data.date) throw Error('El vencimiento no puede ser anterior a la fecha.');
 if(!db.warehouses.some(w=>w.id===data.warehouse)) throw Error('Seleccioná depósito.');
 const seen=new Set();
 const lines=data.lines.map(original=>{
  const l={...original,taxRate:data.applyTax===false?0:(original.taxRate??db.company?.taxRate??0)};
  if(!db.products.some(p=>p.id===l.product)||seen.has(l.product)) throw Error('Seleccioná productos sin repetir líneas.');
  seen.add(l.product);
  if(!Number.isFinite(Number(l.qty))||Number(l.qty)<=0||!Number.isFinite(Number(l.price))||Number(l.price)<0) throw Error('Cantidad positiva y precio no negativo son obligatorios.');
  if(!Number.isFinite(Number(l.taxRate||0))||Number(l.taxRate||0)<0||Number(l.taxRate||0)>100)throw Error('El IVA debe estar entre 0 y 100%.');
  if(!Number.isFinite(Number(l.discount||0))||Number(l.discount||0)<0||Number(l.discount||0)>100)throw Error('El descuento debe estar entre 0 y 100%.');
  const serials=Array.isArray(l.serials)?l.serials.map(s=>String(s).trim()).filter(Boolean):String(l.serials||'').split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean);
  return {...l,qty:Number(l.qty),price:round(l.price),discount:Number(l.discount||0),taxRate:Number(l.taxRate||0),hasSerial:l.hasSerial??!!db.products.find(p=>p.id===l.product)?.hasSerial,serials};
 });
 if(!lines.length) throw Error('Agregá al menos un producto.');
 const allowed=data.side==='sale'?['Presupuesto','Pedido','Venta','Nota de entrega']:['Pedido de compra'];
 if(!allowed.includes(data.kind)) throw Error('Tipo de documento inválido.');
 const sequence=Math.max(db.documentSequence||0,0,...db.documents.map(d=>Number(d.number?.split('-').at(-1))||0))+1;
 const subtotal=round(lines.reduce((sum,l)=>sum+round(l.qty*l.price),0));
 const net=round(lines.reduce((sum,l)=>sum+round(l.qty*l.price*(1-l.discount/100)),0));
 const tax=round(lines.reduce((sum,l)=>sum+round(round(l.qty*l.price*(1-l.discount/100))*l.taxRate/100),0));
 const doc={...data,lines,subtotal,discountTotal:round(subtotal-net),taxTotal:tax,id:uid(),number:`${data.side==='sale'?'V':'C'}-${String(sequence).padStart(5,'0')}`,total:round(net+tax),rate:Number(data.rate)||0,status:'Borrador'};
 delete doc.reservationActive;
 return {...db,documentSequence:sequence,documents:[...db.documents,doc]};
}
export function updateDocument(db,id,data) {
 const old=db.documents.find(d=>d.id===id);
 if(!old)throw Error('Documento no disponible.');
 if(old.kind==='Pedido'&&old.reservationActive)throw Error('Liberá la reserva antes de editar la orden.');
 if(old.status!=='Borrador'&&!['Presupuesto','Pedido','Nota de entrega'].includes(old.kind))throw Error('Solo se pueden editar borradores de ventas.');
 if(db.documents.some(d=>d.source===id)||db.movements.some(m=>m.document===id)||db.payments.some(p=>p.document===id))throw Error('Este documento tiene operaciones relacionadas y no puede editarse.');
 const checked=createDocument({...db,documents:db.documents.filter(d=>d.id!==id)},{...old,...data,side:old.side,kind:old.kind}).documents.at(-1);
 if(old.status==='Confirmado'&&old.kind==='Nota de entrega')validateSerials(db,{...checked,id:old.id,source:old.source});
 return {...db,documents:db.documents.map(d=>d.id===id?{...checked,id:old.id,number:old.number,status:old.status,source:old.source}:d)};
}
export function confirmDocument(db,id) {
 const doc=db.documents.find(d=>d.id===id);
 if(!doc||doc.status!=='Borrador') throw Error('El documento ya fue confirmado o no existe.');
 let movements=[];
 if(['Venta','Nota de entrega'].includes(doc.kind))validateSerials(db,doc);
 if(doc.kind==='Venta') {
  for(const l of doc.lines) if(available(db,l.product,doc.warehouse,doc.source)<l.qty) throw Error('Stock disponible insuficiente. Revisá existencias y reservas de otras órdenes.');
  movements=doc.lines.map(l=>({id:uid(),product:l.product,warehouse:doc.warehouse,qty:-l.qty,date:doc.date,type:'Venta',reason:doc.number,document:doc.id}));
 }
 return {...db,documents:db.documents.map(d=>d.id===id?{...d,status:'Confirmado'}:d),movements:[...db.movements,...movements]};
}
export function convertDocument(db,id,kind) {
 const doc=db.documents.find(d=>d.id===id);
 if(!doc||doc.status!=='Confirmado'||doc.side!=='sale'||!((doc.kind==='Presupuesto'&&kind==='Pedido')||(doc.kind==='Pedido'&&kind==='Venta')||(doc.kind==='Venta'&&kind==='Nota de entrega'))) throw Error('Conversión no disponible.');
 if(db.documents.some(d=>d.source===id&&d.kind===kind)) throw Error('Este documento ya tiene un documento derivado de este tipo.');
 return createDocument(db,{...doc,id:undefined,kind,source:id,date:today(),due:doc.due<today()?today():doc.due});
}
export function receive(db,id,quantities,data={}) {
 const doc=db.documents.find(d=>d.id===id);
 if(!doc||doc.kind!=='Pedido de compra'||doc.status!=='Confirmado') throw Error('Seleccioná un pedido de compra confirmado.');
 const received=doc.received||{}; const lines=[];
 for(const line of doc.lines){
  const qty=Number(quantities[line.product]||0), pending=round(line.qty-(received[line.product]||0));
  if(!Number.isFinite(qty)||qty<0||qty>pending) throw Error('La recepción supera la cantidad pendiente.');
  if(qty>0) lines.push({...line,qty});
 }
 if(!lines.length) throw Error('Ingresá al menos una cantidad a recibir.');
 const subtotal=round(lines.reduce((n,l)=>n+round(l.qty*l.price),0));
 const net=round(lines.reduce((n,l)=>n+round(l.qty*l.price*(1-(l.discount||0)/100)),0));
 const taxTotal=round(lines.reduce((n,l)=>n+round(round(l.qty*l.price*(1-(l.discount||0)/100))*(l.taxRate||0)/100),0));
 const receipt={...doc,subtotal,discountTotal:round(subtotal-net),taxTotal,notes:data.notes??doc.notes,id:uid(),source:id,kind:'Recepción',number:`R-${String(Math.max(0,...db.documents.map(d=>Number(d.number?.split('-').at(-1))||0))+1).padStart(5,'0')}`,date:today(),due:doc.due<today()?today():doc.due,lines,total:round(net+taxTotal),received:undefined,status:'Confirmado'};
 const next={...received};for(const l of lines)next[l.product]=round((next[l.product]||0)+l.qty);
 const complete=doc.lines.every(l=>next[l.product]===l.qty);
 return {...db,documents:[...db.documents.map(d=>d.id===id?{...d,received:next,status:complete?'Recibido':'Confirmado'}:d),receipt],movements:[...db.movements,...lines.map(l=>({id:uid(),product:l.product,warehouse:doc.warehouse,qty:l.qty,date:receipt.date,type:'Recepción',reason:receipt.number,document:receipt.id}))]};
}
export function pay(db,data) {
 const doc=db.documents.find(d=>d.id===data.document);
 if(!doc||doc.status!=='Confirmado'||!['Venta','Recepción','Cuenta por cobrar','Cuenta por pagar'].includes(doc.kind)) throw Error('El documento no tiene una cuenta pendiente.');
 const amount=round(data.amount);
 if(!Number.isFinite(amount)||amount<=0||amount>balance(db,doc)) throw Error('El importe debe ser positivo y no superar el saldo.');
 if(!data.account?.trim()||!data.method||!data.date||data.date<doc.date) throw Error('Indicá cuenta, método y una fecha válida.');
 return {...db,payments:[...db.payments,{...data,id:uid(),amount,currency:doc.currency,rate:doc.rate,side:doc.side}]};
}
export {validateImport} from './backup-validation.mjs';

export function deleteDocument(db,id){
 const doc=db.documents.find(d=>d.id===id);
 if(!doc||doc.status!=='Borrador'||db.documents.some(d=>d.source===id)||db.movements.some(m=>m.document===id)||db.payments.some(p=>p.document===id))throw Error('Solo se pueden eliminar borradores sin operaciones relacionadas.');
 return {...db,documents:db.documents.filter(d=>d.id!==id)};
}

export function validateSerials(db,doc){
 const seen=new Set();
 for(const line of doc.lines){
  if(!line.hasSerial&&!db.products.find(p=>p.id===line.product)?.hasSerial)continue;
  const serials=line.serials||[];
  if(!Number.isInteger(line.qty)||serials.length!==line.qty)throw Error('Ingresá un serial por unidad para cada producto con serial. La cantidad debe ser entera.');
  for(const serial of serials){
   const normalized=serial.trim().toUpperCase();
   if(!normalized||seen.has(normalized))throw Error('Los seriales del documento no pueden estar vacíos ni repetidos.');
   seen.add(normalized);
   if(db.documents.some(d=>d.id!==doc.id&&d.status==='Confirmado'&&d.kind===doc.kind&&d.lines.some(l=>(l.serials||[]).some(s=>s.toUpperCase()===normalized))))throw Error('El serial '+serial+' ya está registrado en otro documento confirmado de este tipo.');
  }
 }
 const source=db.documents.find(d=>d.id===doc.source&&d.kind==='Venta');
 if(doc.kind==='Nota de entrega'&&source){
  for(const line of doc.lines){const original=source.lines.find(l=>l.product===line.product);if((original?.serials||[]).length&&(line.serials||[]).map(s=>s.toUpperCase()).sort().join('|')!==(original.serials||[]).map(s=>s.toUpperCase()).sort().join('|'))throw Error('La nota de entrega debe conservar los seriales de la factura de origen.');}
 }
}

export function invoiceFromOrder(db,id,data){
 const order=db.documents.find(d=>d.id===id&&d.kind==='Pedido'&&d.status==='Confirmado');
 if(!order)throw Error('Confirmá la orden antes de facturar.');
 const lines=order.lines.map(l=>({...l,serials:data.lines?.find(x=>x.product===l.product)?.serials||[]}));
 const next=createDocument(db,{...order,source:id,kind:'Venta',lines,date:data.date||today(),due:data.due||order.due,notes:data.notes??order.notes});
 return confirmDocument(next,next.documents.at(-1).id);
}
export function createInvoiceNote(db,orderId,data){
 const invoice=db.documents.find(d=>d.id===data.invoice&&d.kind==='Venta'&&d.status==='Confirmado'&&d.source===orderId);
 if(!invoice)throw Error('Seleccioná una factura confirmada de esta orden.');
 if(!['Nota de crédito','Nota de débito'].includes(data.kind))throw Error('Tipo de nota inválido.');
 const amount=round(data.amount);
 if(!Number.isFinite(amount)||amount<=0)throw Error('El importe debe ser positivo.');
 if(data.kind==='Nota de crédito'&&amount>balance(db,invoice))throw Error('El crédito no puede superar el saldo pendiente de la factura.');
 if(!data.reason?.trim()||!data.date||data.date<invoice.date)throw Error('Ingresá motivo y una fecha igual o posterior a la factura.');
 const sequence=Math.max(db.documentSequence||0,...db.documents.map(d=>Number(d.number?.split('-').at(-1))||0))+1;
 const note={id:uid(),number:`${data.kind==='Nota de crédito'?'NC':'ND'}-${String(sequence).padStart(5,'0')}`,kind:data.kind,side:'sale',source:invoice.id,order:orderId,contact:invoice.contact,currency:invoice.currency,rate:invoice.rate,date:data.date,due:invoice.due,warehouse:invoice.warehouse,status:'Confirmado',total:amount,lines:[{description:data.reason.trim(),qty:1,price:amount}],notes:data.reason.trim()};
 return {...db,documentSequence:sequence,documents:[...db.documents,note]};
}

export function createAccountEntry(db,data){
 const side=data.side;
 if(!['sale','purchase'].includes(side))throw Error('Tipo de cuenta inválido.');
 const contact=db.contacts.find(c=>c.id===data.contact);
 if(!contact||![side==='sale'?'Cliente':'Proveedor','Ambos'].includes(contact.kind))throw Error('Seleccioná un cliente o proveedor válido.');
 const total=round(data.amount),rate=Number(data.rate)||0;
 if(!Number.isFinite(total)||total<=0)throw Error('El importe debe ser positivo.');
 if(!['USD','VES'].includes(data.currency)||!Number.isFinite(rate)||rate<0||(data.currency==='VES'&&rate<=0))throw Error('Moneda o tasa inválida.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date||'')||!/^\d{4}-\d{2}-\d{2}$/.test(data.due||'')||data.due<data.date)throw Error('Indicá fechas válidas y vencimiento igual o posterior a la emisión.');
 if(!data.concept?.trim())throw Error('Ingresá el concepto de la cuenta.');
 const sequence=Math.max(db.documentSequence||0,0,...db.documents.map(d=>Number(d.number?.split('-').at(-1))||0))+1;
 const doc={id:uid(),number:`${side==='sale'?'CC':'CP'}-${String(sequence).padStart(5,'0')}`,kind:side==='sale'?'Cuenta por cobrar':'Cuenta por pagar',side,contact:contact.id,date:data.date,due:data.due,currency:data.currency,rate,total,subtotal:total,taxTotal:0,status:'Confirmado',manual:true,reference:String(data.reference||'').trim(),notes:data.concept.trim(),lines:[{description:data.concept.trim(),qty:1,price:total}]};
 return {...db,documentSequence:sequence,documents:[...db.documents,doc]};
}
