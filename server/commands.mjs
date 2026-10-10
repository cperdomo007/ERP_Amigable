import * as D from '../src/domain.mjs';
import * as A from '../src/access.mjs';
import {saveState,StoreError} from './mysql/store.mjs';
import {resolveActor,requirePermission} from './auth.mjs';
const mutations=['saveCompany','saveContact','updateContact','saveProduct','updateProduct','adjust','createDocument','updateDocument','confirmDocument','convertDocument','receive','pay','deleteDocument','invoiceFromOrder','createInvoiceNote','createAccountEntry','reserveOrder','transferStock','saveRole','saveUser','returnGoods','refund','reconcilePayment','closePeriod','reopenPeriod','saveFilter','reversePayment'];
export function permissionFor(action,args,db){
 if(action==='saveFilter')return [args[0].scope==='Inventario'?'Productos':'Caja y cuentas','view'];
 if(['refund','reconcilePayment','closePeriod','reopenPeriod','reversePayment'].includes(action))return ['Caja y cuentas','edit'];
 if(['saveRole','saveUser','saveCompany'].includes(action))return ['Configuración',action==='saveCompany'||args[1]?'edit':'create'];
 if(['saveContact','updateContact'].includes(action)){const data=action==='saveContact'?args[0]:args[1];return [data.kind==='Proveedor'?'Proveedores':'Clientes',action==='saveContact'?'create':'edit']}
 if(['saveProduct','updateProduct'].includes(action))return ['Productos',action==='saveProduct'?'create':'edit'];
 if(['adjust','transferStock'].includes(action))return ['Movimientos','create'];
 if(action==='pay')return ['Caja y cuentas','create'];
 if(action==='receive')return ['Compras','create'];
 if(action==='reserveOrder')return ['Ventas','edit'];
 if(action==='createAccountEntry')return ['Caja y cuentas','create'];
 const doc=action==='createDocument'?args[0]:db.documents.find(d=>d.id===args[0]);return [doc?.side==='purchase'?'Compras':'Ventas',['updateDocument','confirmDocument','deleteDocument'].includes(action)?'edit':'create'];
}
export async function executeCommands(pool,actor,body){
 if(body.expectedActor?.company!==actor.company||body.expectedActor?.userId!==actor.userId){const error=new StoreError(409,'Cambió el usuario o empresa de la sesión. Se debe recargar la vista.');error.code='SESSION_CHANGED';throw error}
 const commands=body.commands||[];if(!Array.isArray(commands)||commands.length>10000||!body.patch||typeof body.patch!=='object'||Array.isArray(body.patch))throw new StoreError(400,'Operaciones inválidas.');
 const input={commands,patch:body.patch,restore:body.restore};
 return saveState(pool,{revision:body.revision,requestKey:body.requestKey,input},actor.company,actor.userId,async(before,connection)=>{
  const current=await resolveActor(connection,actor.company,actor.userId);let db=before;
  if(body.restore){requirePermission(current,'Configuración','edit');D.validateImport(body.restore);db={...structuredClone(body.restore),users:before.users||[],roles:before.roles||[]}}
  else{
   for(const cmd of commands){if(!cmd||!mutations.includes(cmd.action)||!Array.isArray(cmd.args))throw new StoreError(400,'Comando no disponible.');const permission=permissionFor(cmd.action,cmd.args,db);requirePermission(current,...permission);
    if(['saveContact','updateContact'].includes(cmd.action)){const data=cmd.action==='saveContact'?cmd.args[0]:cmd.args[1],old=db.contacts.find(c=>c.id===cmd.args[0]);if(data.kind==='Ambos'||old?.kind==='Ambos')requirePermission(current,'Proveedores',permission[1])}
    if(cmd.action==='saveFilter'){cmd.args[0].owner=current.userId;if(cmd.args[1]&&(db.savedFilters||[]).find(f=>f.id===cmd.args[1])?.owner!==current.userId)throw new StoreError(403,'Filtro ajeno.')}
    const previous=db;db=D.replayIds(cmd.ids,()=>({...D,...A}[cmd.action](db,...cmd.args)));if(cmd.action!=='reopenPeriod')D.assertOpenPeriods(previous,db);
   }
   for(const [key,value] of Object.entries(body.patch)){
    if(['rate','warehouses','company'].includes(key))requirePermission(current,key==='warehouses'?'Depósitos':'Configuración','edit');
    else if(['taxSettings','taxControls','taxes','taxRetentions','taxRetentionSequence','salesFiscalRecords','purchaseFiscalRecords'].includes(key))requirePermission(current,'Impuestos','edit');
    else throw new StoreError(403,'Campo fuera del alcance permitido: '+key);
    db={...db,[key]:value};
   }
  }
  // Owner profiles survive restores; ordinary writes cannot disable the last owner.
  const [owners]=await connection.execute('SELECT user_id FROM SUMI_credentials WHERE company_id=? AND is_owner=TRUE',[actor.company]);
  for(const owner of owners){const old=(before.users||[]).find(u=>u.id===owner.user_id),user=(db.users||[]).find(u=>u.id===owner.user_id);if(body.restore&&old){db={...db,users:[...(db.users||[]).filter(u=>u.id!==old.id),old]};const role=before.roles.find(r=>r.id===old.role);db.roles=[...(db.roles||[]).filter(r=>r.id!==role.id),role]}else if(!user?.active)throw new StoreError(400,'El propietario debe permanecer activo.')}
  return db;
 });
}
