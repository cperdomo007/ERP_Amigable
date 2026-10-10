const clean=v=>String(v??'').trim();
function text(v,label){const s=clean(v);if(!s||/[\x00-\x1f]/.test(s))throw Error(label+': valor obligatorio sin tabulaciones ni saltos de línea.');return s;}
function rif(v){const s=clean(v).toUpperCase().replace(/-/g,'');if(!/^[VJEGPC]\d{9}$/.test(s))throw Error('RIF inválido: prefijo y nueve dígitos.');return s;}
function decimal(v,label){if(clean(v)===''||!Number.isFinite(Number(v))||Number(v)<0)throw Error(label+': número no negativo obligatorio.');return Number(v).toFixed(2);}
function period(v){const s=clean(v);if(!/^\d{4}(0[1-9]|1[0-2])$/.test(s))throw Error('Período inválido: AAAAMM.');return s;}
function date(v){const s=clean(v),d=new Date(s+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)throw Error('Fecha inválida.');return s;}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function encode(s){if([...s].some(c=>c.codePointAt(0)>255))throw Error('El archivo contiene caracteres fuera de ISO-8859-1.');return Uint8Array.from([...s].map(c=>c.charCodeAt(0)));}
export function fiscalExport(records,agent,type){
 if(!records.length)throw Error('No hay retenciones para exportar.');
 const agentRif=rif(agent),rows=[],errors=[],seen=new Set();let selectedPeriod;
 records.forEach((r,i)=>{try{
 const p=period(r.period);if(selectedPeriod&&selectedPeriod!==p)throw Error('Exportá un solo período por archivo.');selectedPeriod=p;
 const retainedRif=rif(r.retainedRif),invoice=text(r.fiscalInvoice,'Factura'),control=text(r.fiscalControl,'Número de control');
 const key=[retainedRif,invoice,control,r.number||'',r.conceptCode||''].join('|');if(seen.has(key))throw Error('Registro fiscal duplicado.');seen.add(key);
 if(type==='IVA'){
  const invoiceDate=date(r.invoiceDate),operation=r.operation||'C',documentType=r.documentType||'01';
  if(!['C','V'].includes(operation)||!['01','02','03'].includes(documentType))throw Error('Operación o tipo de documento inválido.');
  const voucher=text(r.number,'Comprobante');if(!/^\d{14}$/.test(voucher))throw Error('El comprobante IVA debe tener 14 dígitos.');
  const taxRate=decimal(r.taxAliquot,'Alícuota');if(Number(taxRate)>100)throw Error('Alícuota fuera de rango.');
  const affected=documentType==='01'?'0':text(r.affectedInvoice,'Factura afectada');
  rows.push([agentRif,p,invoiceDate,operation,documentType,retainedRif,invoice,control,decimal(r.fiscalTotal,'Total Bs.'),decimal(r.fiscalBase,'Base Bs.'),decimal(r.fiscalRetained,'IVA retenido Bs.'),affected,voucher,decimal(r.exemptAmount,'Exento Bs.'),taxRate,clean(r.caseNumber)||'0'].map(v=>text(v,'Campo')).join('\t'));
 }else if(type==='ISLR'){
  const operationDate=date(r.date);if(operationDate.slice(0,7).replace('-','')!==p)throw Error('Fecha de operación fuera del período.');
  const code=text(r.conceptCode,'Código de concepto');if(!/^\d{3}$/.test(code))throw Error('Código de concepto: tres dígitos.');
  const rate=decimal(r.rate,'Porcentaje');if(Number(rate)>100)throw Error('Porcentaje fuera de rango.');
  const values={RifRetenido:retainedRif,NumeroFactura:invoice,NumeroControl:control,FechaOperacion:operationDate.split('-').reverse().join('/'),CodigoConcepto:code,MontoOperacion:decimal(r.fiscalBase,'Monto operación Bs.'),PorcentajeRetencion:rate};
  rows.push('  <DetalleRetencion>\r\n'+Object.entries(values).map(([tag,value])=>'    <'+tag+'>'+escape(value)+'</'+tag+'>').join('\r\n')+'\r\n  </DetalleRetencion>');
 }else throw Error('Tipo de exportación inválido.');
 }catch(e){errors.push('Registro '+(i+1)+': '+e.message)}});
 if(errors.length)throw Error(errors.join('\n'));
 const content=type==='IVA'?rows.join('\r\n')+'\r\n':'<?xml version="1.0" encoding="ISO-8859-1"?>\r\n<RelacionRetencionesISLR RifAgente="'+agentRif+'" Periodo="'+selectedPeriod+'">\r\n'+rows.join('\r\n')+'\r\n</RelacionRetencionesISLR>\r\n';
 return {bytes:encode(content),content,period:selectedPeriod,count:rows.length,extension:type==='IVA'?'txt':'xml'};
}
