export const modules=['Clientes','Proveedores','Productos','Movimientos','Depósitos','Ventas','Compras','Caja y cuentas','Configuración'];
export function saveRole(db,data,id){
 const roles=db.roles||[];const name=String(data.name||'').trim();
 if(!name||roles.some(r=>r.id!==id&&r.name.toLowerCase()===name.toLowerCase()))throw Error('Nombre de rol vacío o duplicado.');
 if(id&&!roles.some(r=>r.id===id))throw Error('El rol no existe.');
 const role={id:id||crypto.randomUUID(),name,permissions:data.permissions||{},updatedAt:new Date().toISOString()};
 return {...db,roles:id?roles.map(r=>r.id===id?role:r):[...roles,role]};
}
export function saveUser(db,data,id){
 const users=db.users||[];const email=String(data.email||'').trim().toLowerCase(),username=String(data.username||'').trim();
 if(!data.name?.trim()||!username||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Completá nombre, usuario y correo válido.');
 if(users.some(u=>u.id!==id&&(u.email===email||u.username.toLowerCase()===username.toLowerCase())))throw Error('El correo o usuario ya existe.');
 if(!(db.roles||[]).some(r=>r.id===data.role))throw Error('Seleccioná un rol existente.');
 if(id&&!users.some(u=>u.id===id))throw Error('El usuario no existe.');
 const user={id:id||crypto.randomUUID(),name:data.name.trim(),username,email,identity:String(data.identity||'').trim(),phone:String(data.phone||'').trim(),role:data.role,active:!!data.active,updatedAt:new Date().toISOString()};
 return {...db,users:id?users.map(u=>u.id===id?user:u):[...users,user]};
}
