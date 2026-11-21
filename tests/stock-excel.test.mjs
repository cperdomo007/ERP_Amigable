import test from 'node:test';
import assert from 'node:assert/strict';
import Excel from 'exceljs';
import {stockTemplate,readStockAdjustments} from '../src/stock-excel.mjs';
import {initial} from '../src/domain.mjs';

test('la plantilla importa entradas y salidas en orden y detecta stock insuficiente sin guardar',async()=>{
 const db={...initial(),products:[{id:'p',sku:'001',name:'Producto'}]};
 const book=new Excel.Workbook();await book.xlsx.load(await stockTemplate());
 const ws=book.getWorksheet('Ajustes');
 ws.addRow(['001','Principal','2,50','Entrada']);ws.addRow(['001','Principal',-1,'Salida']);ws.addRow(['001','Principal',-2,'Salida excesiva']);ws.addRow(['001','Principal',{formula:'1+1',result:2},'Fórmula']);
 const bytes=await book.xlsx.writeBuffer();
 const review=await readStockAdjustments({name:'ajustes.xlsx',size:bytes.byteLength,arrayBuffer:async()=>bytes},db);
 assert.deepEqual(review.accepted.map(r=>r.stock),[2.5,1.5]);
 assert.match(review.errors[0],/Fila 4.*existencias/);
 assert.match(review.errors[1],/Fila 5.*fórmulas/);
 assert.equal(db.movements.length,0);
});
