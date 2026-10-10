import test from 'node:test';
import assert from 'node:assert/strict';
import {saveSalesRecord,salesRow,salesSummary} from '../src/sales-book.mjs';
const db={contacts:[{id:'c',kind:'Cliente'}]},data={supplier:'c',period:'202610',invoiceDate:'2026-10-08',invoice:'001',control:'00-001',documentType:'01',origin:'Interna',generalBase:1000,generalRate:16,retained:0};
test('libro ventas calcula débitos y resta notas de crédito sin tocar caja',()=>{const next=saveSalesRecord(db,data),row=next.salesFiscalRecords[0];assert.equal(row.total,1160);assert.equal(row.generalTax,160);const credit=salesRow({...data,documentType:'03',generalBase:100});assert.equal(salesSummary([row,credit]).Internageneral.tax,144);assert.equal(next.payments,undefined);assert.throws(()=>saveSalesRecord(next,data),/duplicado/);});
