import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {authenticate} from '../server/auth.mjs';
import {createApi} from '../server/auth-api.mjs';

test('Bearer y cookie resuelven el mismo usuario; credenciales inválidas no consultan sesiones',async()=>{
 const token='a'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
 const pool={execute:async(sql,args)=>{
  if(sql.includes('FROM SUMI_sessions')){assert.equal(args[0],hash);return [[{company_id:'empresa',user_id:'user'}]]}
  return [[{id:'user',username:'operador',active:1,is_owner:0,role:{permissions:{Ventas:{view:true}}}}]];
 }};
 assert.deepEqual(await authenticate(pool,'sumi_session='+token),await authenticate(pool,'','Bearer '+token));
 for(const value of ['Bearer invalid','Basic '+token,'','Bearer '+token+'x'])await assert.rejects(authenticate({execute:()=>assert.fail('No debe consultar MySQL')},'sumi_session='+token,value),e=>e.status===401);
});

test('API distingue Android nativo de orígenes web y exige token móvil',async()=>{
 let calls=0;
 const server=createApi({execute:async()=>{calls++;return [[]]}},{allowedOrigins:['https://erp.example.com']});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/api/erp/state`;
 try{
  for(const [headers,status] of [
   [{'X-ERP-Client':'mobile',Origin:'https://erp.example.com'},403],
   [{'X-ERP-Client':'web',Origin:'https://evil.example.com'},403],
   [{'X-ERP-Client':'web',Origin:'https://erp.example.com'},401],
   [{'X-ERP-Client':'mobile',Cookie:'sumi_session='+'a'.repeat(64)},401],
   [{'X-ERP-Client':'mobile',Authorization:'Bearer invalid'},401],
   [{'X-ERP-Client':'unknown'},403],
  ])assert.equal((await fetch(url,{headers})).status,status);
  assert.equal(calls,0);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
