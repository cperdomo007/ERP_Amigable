import {initial,validateImport} from './domain.mjs';
const KEY='erp-amigable-v1';
async function request(path,body){
 const response=await fetch('/api/erp/'+path,{method:body?'POST':'GET',headers:{'X-ERP-Client':'desktop',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
 const result=await response.json();if(!response.ok){const error=new Error(result.error||'No se pudo conectar con MySQL.');error.status=response.status;throw error}return result;
}
export async function loadDatabase(){
 try{return await request('state')}catch(e){if(e.status!==404)throw e}
 const raw=localStorage.getItem(KEY);let db;
 try{db=raw===null?initial():validateImport(JSON.parse(raw))}catch{throw Error('Los datos locales no son válidos. Se conservaron sin reemplazarlos; recuperá un respaldo antes de migrar.')}
 // The original localStorage copy stays untouched, including after a successful migration.
 return request('bootstrap',{db});
}
export async function saveDatabase(db,revision,requestKey){return request('state',{db:validateImport(db),revision,requestKey})}
