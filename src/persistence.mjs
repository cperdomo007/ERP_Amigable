export const authEvents=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('sumi-auth'):null;
authEvents?.unref?.();
export async function apiRequest(path,body){
 const response=await fetch('/api/erp/'+path,{method:body?'POST':'GET',headers:{'X-ERP-Client':'desktop',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
 const result=await response.json();if(!response.ok){const error=new Error(result.error||'No se pudo conectar con MySQL.');error.status=response.status;error.code=result.code;throw error}return result;
}
export const loadDatabase=()=>apiRequest('state');
export const loginDatabase=async data=>{const result=await apiRequest('auth/login',data);authEvents?.postMessage({type:'changed'});return result};
export const logoutDatabase=async()=>{const result=await apiRequest('auth/logout',{});authEvents?.postMessage({type:'changed'});return result};
export const saveDatabase=(payload,revision,requestKey)=>apiRequest('commands',{...payload,revision,requestKey});
