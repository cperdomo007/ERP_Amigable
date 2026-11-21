import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createApi} from './auth-api.mjs';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
export function createApplication(pool,{staticDirectory=null,...apiOptions}={}){
 const api=createApi(pool,apiOptions).listeners('request')[0],root=staticDirectory?resolve(staticDirectory):null;
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
  if(req.url==='/healthz'&&req.method==='GET'){
   try{await pool.query('SELECT 1');res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"ok":true}')}
   catch{res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"ok":false}')}return;
  }
  const pathname=(req.url||'/').split('?')[0];
  if(pathname==='/api/erp'||pathname.startsWith('/api/erp/'))return api(req,res);
  if(!root||!['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end();return}
  let path;try{path=resolve(root,'.'+decodeURIComponent(pathname))}catch{res.writeHead(400);res.end();return}
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return}
  try{
   if(path===root)path=resolve(root,'index.html');let bytes;
   try{bytes=await readFile(path)}catch(error){if(error.code!=='ENOENT'||extname(path))throw error;path=resolve(root,'index.html');bytes=await readFile(path)}
   res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':extname(path)==='.html'?'no-cache':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end()}
 });
}
