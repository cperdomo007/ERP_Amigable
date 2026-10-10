import {uid,round} from './domain.mjs';
import {decimal,sumMoney} from './decimal.mjs';
export const amounts=['exempt','notSubject','exonerated','generalBase','reducedBase','additionalBase','retained'];
export function salesRow(record){const r={...record};for(const k of amounts)r[k]=Number(r[k]||0);for(const k of ['generalRate','reducedRate','additionalRate'])r[k]=Number(r[k]||0);for(const group of ['general','reduced','additional'])r[group+'Tax']=round(decimal(r[group+'Base']).times(r[group+'Rate']).div(100));r.total=sumMoney([r.exempt,r.notSubject,r.exonerated,r.generalBase,r.reducedBase,r.additionalBase,r.generalTax,r.reducedTax,r.additionalTax]);return r;}
export function saveSalesRecord(db,data,id){
 if(!(db.contacts||[]).some(c=>c.id===data.supplier&&['Cliente','Ambos'].includes(c.kind)))throw Error('Seleccioná un cliente.');
 if(!/^\d{4}(0[1-9]|1[0-2])$/.test(data.period||''))throw Error('El período debe tener formato AAAAMM.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data.invoiceDate||'')||!data.invoice?.trim()||!data.control?.trim())throw Error('Fecha, factura y control son obligatorios.');
 if(!['01','02','03'].includes(data.documentType)||!['Interna','Exportación'].includes(data.origin))throw Error('Tipo u origen inválido.');
 if(data.documentType!=='01'&&!data.affectedInvoice?.trim())throw Error('Las notas requieren factura afectada.');
 for(const k of amounts.concat(['generalRate','reducedRate','additionalRate']))if(!Number.isFinite(Number(data[k]||0))||Number(data[k]||0)<0||(k.endsWith('Rate')&&Number(data[k])>100))throw Error('Importes no negativos y porcentajes entre 0 y 100.');
 const records=db.salesFiscalRecords||[];
 if(id&&!records.some(r=>r.id===id))throw Error('Registro no disponible.');
 if(records.some(r=>r.id!==id&&r.supplier===data.supplier&&r.invoice===data.invoice.trim()&&r.documentType===data.documentType))throw Error('Documento del cliente duplicado.');
 const row=salesRow({...data,invoice:data.invoice.trim(),control:data.control.trim(),id:id||uid()});
 if(row.retained>round(row.generalTax+row.reducedTax+row.additionalTax))throw Error('La retención no puede superar el IVA registrado.');
 if(row.retained>0&&(!data.voucher?.trim()||!data.retentionDate))throw Error('Indicá comprobante y fecha de retención.');
 return {...db,salesFiscalRecords:id?records.map(r=>r.id===id?row:r):[...records,row]};
}
export function salesSummary(rows){const summary={};for(const origin of ['Interna','Exportación'])for(const group of ['general','reduced','additional']){const list=rows.filter(r=>r.origin===origin);summary[origin+group]={base:round(list.reduce((s,r)=>s+(r.documentType==='03'?-1:1)*r[group+'Base'],0)),tax:round(list.reduce((s,r)=>s+(r.documentType==='03'?-1:1)*r[group+'Tax'],0))};}return summary;}
