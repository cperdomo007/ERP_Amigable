// El token permanece en memoria nativa. Nunca se entrega al JavaScript del ERP.
export function createMobileTransport(bridge,target=globalThis,timeoutMs=65000){
 const pending=new Map();let sequence=0;
 target.addEventListener('pyme360-response',event=>{
  const result=event.detail,entry=pending.get(result?.id);if(!entry)return;
  pending.delete(result.id);clearTimeout(entry.timer);
  if(result.status>=200&&result.status<300)entry.resolve(result.data);
  else{const error=new Error(result.data?.error||'No se pudo conectar al servidor.');error.status=result.status;error.code=result.data?.code;entry.reject(error)}
 });
 return (path,body)=>new Promise((resolve,reject)=>{
  const id=String(++sequence),timer=setTimeout(()=>{pending.delete(id);reject(new Error('El servidor no respondió. Revisá la conexión antes de reintentar.'))},timeoutMs);
  pending.set(id,{resolve,reject,timer});
  try{bridge.request(id,path,body===undefined?'':JSON.stringify(body))}catch(error){clearTimeout(timer);pending.delete(id);reject(error)}
 });
}
