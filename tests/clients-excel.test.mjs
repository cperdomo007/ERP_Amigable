import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRows,exportClients,readClients} from '../src/clients-excel.mjs';
test('clientes y proveedores exportan todos los campos e ID; plantilla comparte encabezados',async()=>{
 const {default:Excel}=await import('exceljs');
 for(const type of ['Cliente','Proveedor']){
  const record={id:'interno-123',name:'Empresa',rif:'J-003',kind:type,email:'correo@ejemplo.com',phone:'04120001234',address:'Dirección completa',days:15,contactPerson:'María Pérez'};
  const book=new Excel.Workbook();await book.xlsx.load(await exportClients([record],false,type));const sheet=book.worksheets[0];
  assert.deepEqual(sheet.getRow(2).values.slice(1),[record.name,record.rif,type,record.email,record.phone,record.address,15,record.id,record.contactPerson]);
  const template=new Excel.Workbook();await template.xlsx.load(await exportClients([],true,type));assert.deepEqual(template.worksheets[0].getRow(1).values,sheet.getRow(1).values);
  const bytes=await exportClients([record],false,type);const review=await readClients({name:'contactos.xlsx',size:bytes.byteLength,arrayBuffer:async()=>bytes},[],type);assert.equal(review.accepted[0].address,record.address);assert.equal(review.accepted[0].id,undefined);assert.equal(review.accepted[0].contactPerson,record.contactPerson);
 }
});
test('validación por fila, duplicados y teléfonos como texto',()=>{
 const result=reviewRows([['Empresa','j-1','Cliente','a@b.com','04120001234','Caracas',30],['Repetido','J-1','','','','',0],['Sin RIF','','Cliente'],['Fórmula',{formula:'1+1'},'Cliente'],['Plazo','J-2','Cliente','','','',-1]],[]);
 assert.equal(result.accepted.length,1);assert.equal(result.duplicates.length,1);assert.equal(result.errors.length,3);assert.equal(result.accepted[0].phone,'04120001234');
 assert.equal(reviewRows([['Existente','J-1','Cliente']], [{rif:'j-1'}]).duplicates.length,1);
});
test('exportación XLSX puede reimportarse conservando datos y excluyendo proveedores',async()=>{
 const contacts=[{name:'Empresa',rif:'J-001',kind:'Ambos',email:'a@b.com',phone:'04120001234',address:'Caracas',days:30},{name:'Proveedor',rif:'J-002',kind:'Proveedor'}];
 const bytes=await exportClients(contacts);const result=await readClients({name:'clientes.xlsx',size:bytes.byteLength,arrayBuffer:async()=>bytes},[]);
 assert.equal(result.errors.length,0);assert.equal(result.accepted.length,1);assert.equal(result.accepted[0].phone,'04120001234');assert.equal(result.accepted[0].days,30);
});
