import test from 'node:test';
import assert from 'node:assert/strict';
import {createMobileTransport} from '../src/mobile-transport.mjs';

function setup(timeout){
 const target=new EventTarget(),calls=[];
 const request=createMobileTransport({request:(...args)=>calls.push(args)},target,timeout);
 const respond=(id,status,data)=>{const event=new Event('pyme360-response');event.detail={id,status,data};target.dispatchEvent(event)};
 return {request,calls,respond};
}
test('móvil correlaciona respuestas fuera de orden y serializa comandos sin modificar el cuerpo',async()=>{
 const {request,calls,respond}=setup();
 const a=request('state'),body={revision:3,requestKey:'key',commands:[],patch:{},expectedActor:{company:'c',userId:'u'}},b=request('commands',body);
 assert.equal(calls[0][2],'');assert.deepEqual(JSON.parse(calls[1][2]),body);
 respond(calls[1][0],200,{revision:4});respond('unknown',200,{});respond(calls[0][0],200,{revision:3});
 assert.deepEqual(await b,{revision:4});assert.deepEqual(await a,{revision:3});
});
test('móvil propaga sesión vencida y conflicto de identidad a los controles del ERP',async()=>{
 const {request,calls,respond}=setup();
 const a=request('state');respond(calls[0][0],401,{error:'Sesión vencida'});await assert.rejects(a,e=>e.status===401);
 const b=request('commands',{});respond(calls[1][0],409,{error:'Cambió la sesión',code:'SESSION_CHANGED'});await assert.rejects(b,e=>e.status===409&&e.code==='SESSION_CHANGED');
});
test('móvil limita espera y tolera respuestas tardías',async()=>{
 const {request,calls,respond}=setup(5);await assert.rejects(request('state'),/no respondió/);respond(calls[0][0],200,{});
 const broken=createMobileTransport({request:()=>{throw Error('Bridge unavailable')}},new EventTarget());await assert.rejects(broken('state'),/Bridge unavailable/);
});
