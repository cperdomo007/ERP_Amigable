import http from 'node:http';
import {createPool} from './mysql/connection.mjs';
import {loadState,bootstrap,saveState,listBackups,loadBackup} from './mysql/store.mjs';
const pool=createPool(),origin='http://127.0.0.1:5173';
const server=http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 // Local desktop only. No CORS, no LAN binding, custom header disallows simple CSRF.
 if(req.headers['x-erp-client']!=='desktop'||(req.headers.origin&&req.headers.origin!==origin))return send(403,{error:'Origen no autorizado.'});
 try{
  if(req.method==='GET'&&req.url==='/api/erp/state')return send(200,await loadState(pool));
  if(req.method==='GET'&&req.url==='/api/erp/backups')return send(200,await listBackups(pool));
  if(req.method==='GET'&&/^\/api\/erp\/backups\/\d+$/.test(req.url))return send(200,await loadBackup(pool,Number(req.url.split('/').at(-1))));
  if(req.method!=='POST'||!['/api/erp/bootstrap','/api/erp/state'].includes(req.url))return send(404,{error:'Ruta no disponible.'});
  let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>20*1024*1024)return send(413,{error:'Respaldo demasiado grande (máximo 20 MB).'});chunks.push(chunk)}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return send(400,{error:'JSON inválido.'})}
  return send(200,req.url.endsWith('bootstrap')?await bootstrap(pool,body.db):await saveState(pool,body));
 }catch(e){const status=e.status||(e.message.startsWith('Respaldo inválido')?400:503);send(status,{error:status===503?'MySQL no pudo completar la operación. Los datos no se guardaron.':e.message});console.error('API ERP:',e.code||e.name)}
});
server.listen(3002,'127.0.0.1',()=>console.log('API ERP MySQL: http://127.0.0.1:3002'));
process.on('SIGTERM',()=>server.close(async()=>{await pool.end();process.exit(0)}));
