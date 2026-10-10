import http from 'node:http';
import {loadState,listBackups,loadBackup,StoreError} from './mysql/store.mjs';
import {authenticate,login,projectState,requirePermission,setCredential,resolveActor} from './auth.mjs';
import {executeCommands} from './commands.mjs';
import {insights,verifiedAnswer} from './insights.mjs';
import {geminiExplanation} from './gemini-explanation.mjs';
export function createApi(pool){return http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 if(req.headers['x-erp-client']!=='desktop'||(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:5173'))return send(403,{error:'Origen no autorizado.'});
 try{
  let body={};if(req.method==='POST'){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>20*1024*1024)return send(413,{error:'Solicitud demasiado grande.'});chunks.push(chunk)}try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{throw new StoreError(400,'JSON inválido.')}}
  if(req.method==='POST'&&req.url==='/api/erp/auth/login'){const result=await login(pool,body);res.setHeader('Set-Cookie',`sumi_session=${result.token}; HttpOnly; SameSite=Strict; Path=/api/erp; Max-Age=28800`);return send(200,projectState(await loadState(pool,result.actor.company),result.actor))}
  const actor=await authenticate(pool,req.headers.cookie);
  if(req.method==='POST'&&req.url==='/api/erp/auth/logout'){await pool.execute('DELETE FROM SUMI_sessions WHERE token_hash=?',[actor.tokenHash]);res.setHeader('Set-Cookie','sumi_session=; HttpOnly; SameSite=Strict; Path=/api/erp; Max-Age=0');return send(200,{ok:true})}
  if(req.method==='GET'&&req.url==='/api/erp/state')return send(200,projectState(await loadState(pool,actor.company),actor));
  if(req.method==='GET'&&req.url==='/api/erp/alerts'){const result=insights(projectState(await loadState(pool,actor.company),actor).db);if(!actor.owner&&!actor.permissions.Productos?.view&&!actor.permissions.Movimientos?.view&&!actor.permissions.Ventas?.view&&!actor.permissions.Compras?.view)result.stock=[];return send(200,result)}
  if(req.method==='POST'&&req.url==='/api/erp/assistant'){if(typeof body.question!=='string'||!body.question.trim()||body.question.length>4000)throw new StoreError(400,'Pregunta inválida.');const q=body.question.toLowerCase();if(q.includes('stock')||q.includes('reposici')){if(!actor.owner&&!actor.permissions.Movimientos?.view&&!actor.permissions.Ventas?.view&&!actor.permissions.Compras?.view)requirePermission(actor,'Productos')}else if(q.includes('venta'))requirePermission(actor,'Ventas');else if(q.includes('cobrar')||q.includes('pagar')||q.includes('vencid'))requirePermission(actor,'Caja y cuentas');if(body.from&&body.to&&body.from>body.to)throw new StoreError(400,'Período invertido.');const verified=verifiedAnswer(projectState(await loadState(pool,actor.company),actor).db,body.question,body.from,body.to);if(body.mode==='gemini'){const generated=await geminiExplanation(body.question,verified);return send(200,{...verified,...generated})}return send(200,verified)}
  if(req.method==='POST'&&req.url==='/api/erp/commands'){const result=await executeCommands(pool,actor,body);return send(200,projectState(result,await resolveActor(pool,actor.company,actor.userId)))}
  if(req.method==='POST'&&req.url==='/api/erp/auth/credential'){await setCredential(pool,actor,body.userId,body.password);return send(200,{ok:true})}
  if(req.method==='GET'&&req.url==='/api/erp/backups'){requirePermission(actor,'Configuración');return send(200,await listBackups(pool,actor.company))}
  if(req.method==='GET'&&/^\/api\/erp\/backups\/\d+$/.test(req.url)){requirePermission(actor,'Configuración','edit');return send(200,await loadBackup(pool,Number(req.url.split('/').at(-1)),actor.company))}
  if(req.method==='GET'&&req.url==='/api/erp/audit'){requirePermission(actor,'Configuración');const [rows]=await pool.execute('SELECT a.id,COALESCE(u.username,a.actor) AS actor,a.action,a.details,a.created_at FROM SUMI_audit a LEFT JOIN SUMI_users u ON u.company_id=a.company_id AND u.id=a.actor WHERE a.company_id=? ORDER BY a.id DESC LIMIT 200',[actor.company]);return send(200,rows)}
  return send(404,{error:'Ruta no disponible.'});
 }catch(e){const status=e.status||(e.code?503:400);send(status,{error:status===503?'MySQL no pudo completar la operación.':e.message,...(e.code==='SESSION_CHANGED'?{code:e.code}:{})});if(status===503)console.error('API ERP:',e.code||e.name)}
})}
