import {randomBytes,randomUUID} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {createPool} from './mysql/connection.mjs';
import {loadState,saveState,defaultCompany} from './mysql/store.mjs';
import {hashPassword} from './auth.mjs';
import {modules} from '../src/access.mjs';
const pool=createPool();try{
 const [owners]=await pool.execute('SELECT user_id FROM SUMI_credentials WHERE company_id=? AND is_owner=TRUE',[defaultCompany]);
 if(owners.length)console.log('Administrador existente: no se modificaron credenciales.');else{
  const {db,revision}=await loadState(pool),role={id:randomUUID(),name:'Administrador del sistema',permissions:Object.fromEntries(modules.map(m=>[m,{view:true,create:true,edit:true}]))},user={id:randomUUID(),role:role.id,name:'Administrador',username:'admin',email:'admin@erp.local',active:true},password=randomBytes(18).toString('base64url');
  await mkdir('work',{recursive:true});await writeFile('work/ERP-admin-access.txt',`Empresa: ${defaultCompany}\nUsuario: admin\nContraseña: ${password}\n`,{flag:'wx',mode:0o600});
  await saveState(pool,{db:{...db,roles:[...(db.roles||[]),role],users:[...(db.users||[]),user]},revision,requestKey:randomUUID()});
  await pool.execute('INSERT INTO SUMI_credentials(company_id,user_id,password_hash,is_owner) VALUES (?,?,?,TRUE)',[defaultCompany,user.id,await hashPassword(password)]);console.log('Administrador creado. Credenciales en work/ERP-admin-access.txt (excluido de Git).');
 }
}finally{await pool.end()}
