import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../server/application.mjs';
import {connectionOptions} from '../server/mysql/connection.mjs';
test('DATABASE_URL selecciona Railway y TLS verifica certificados',()=>{
 const options=connectionOptions({DATABASE_URL:'mysql://user:p%40ss@host.example:1234/railway',DATABASE_SSL:'true',DATABASE_SSL_CA:'certificate'});
 assert.equal(options.database,'railway');assert.equal(options.password,'p@ss');assert.equal(options.port,1234);assert.deepEqual(options.ssl,{rejectUnauthorized:true,ca:'certificate'});
 assert.throws(()=>connectionOptions({DATABASE_URL:'postgres://user:pass@host/db'}));assert.equal(connectionOptions({MYSQL_DATABASE:'local',MYSQL_USER:'local'}).ssl,undefined);
});
test('hosting conserva autenticación, bloquea escape y oculta errores de salud',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pyme360-hosting-'));await writeFile(join(root,'index.html'),'<h1>Pyme 360</h1>');let unavailable=false;
 const server=createApplication({query:async()=>{if(unavailable)throw Error('secret');return [[{one:1}]]}},{staticDirectory:root});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.match(await (await fetch(base)).text(),/Pyme 360/);assert.equal((await fetch(base+'/healthz')).status,200);
  assert.equal((await fetch(base+'/api/erp/state',{headers:{'X-ERP-Client':'mobile'}})).status,401);
  assert.equal((await fetch(base+'/missing.js')).status,404);assert.equal((await fetch(base+'/%2e%2e%2f.env')).status,403);
  unavailable=true;const result=await fetch(base+'/healthz');assert.equal(result.status,503);assert.deepEqual(await result.json(),{ok:false});
 }finally{await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true})}
});
