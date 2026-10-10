import {round} from './domain.mjs';
export function bookRollup(db,side){
 const kinds=side==='sale'?['Venta','Nota de crédito','Nota de débito']:['Recepción'];
 return db.documents.filter(d=>d.status==='Confirmado'&&d.side===side&&kinds.includes(d.kind)).map(d=>{
 const factor=d.currency==='VES'?1:Number(d.rate)||0;
 const source=db.documents.find(x=>x.id===d.source);
 const retentions=(db.taxRetentions||[]).filter(r=>r.document===d.id&&r.type==='IVA');
 const tax=round((d.taxTotal||0)*factor),net=round((d.total-(d.taxTotal||0))*factor);
 const rates=[...new Set(d.lines.filter(l=>Number(l.taxRate)>0).map(l=>Number(l.taxRate)))];
 const zeroBase=round(d.lines.filter(l=>!Number(l.taxRate)).reduce((sum,l)=>sum+round(l.qty*l.price*(1-(l.discount||0)/100)),0)*factor);
 const isNote=['Nota de crédito','Nota de débito'].includes(d.kind);
 return {id:d.id,automatic:true,period:d.date.slice(0,7).replace('-',''),supplier:d.contact,invoiceDate:d.date,invoice:retentions.find(r=>r.fiscalInvoice)?.fiscalInvoice||d.number,control:(db.taxControls||{})[d.id]||retentions.find(r=>r.fiscalControl)?.fiscalControl||'',origin:'Interna',documentType:d.kind==='Nota de crédito'?'03':d.kind==='Nota de débito'?'02':'01',affectedInvoice:isNote?source?.number||'':'',debitNote:d.kind==='Nota de débito'?d.number:'',creditNote:d.kind==='Nota de crédito'?d.number:'',voucher:retentions.map(r=>r.number).filter(Boolean).join(', '),retentionDate:retentions[0]?.date||'',total:round(d.total*factor),exempt:zeroBase,notSubject:0,exonerated:0,generalBase:round(net-zeroBase),generalRate:rates.length===1?rates[0]:0,generalTax:tax,reducedBase:0,reducedRate:0,reducedTax:0,additionalBase:0,additionalRate:0,additionalTax:0,retained:round(retentions.reduce((sum,r)=>sum+(r.fiscalRetained!==undefined&&r.fiscalRetained!==''?Number(r.fiscalRetained):r.currency==='VES'?r.amount:r.amount*factor),0)),pending:!factor?'Sin tasa para convertir a Bs.':isNote?'Clasificación fiscal de la nota pendiente':rates.length>1?'Desglose por alícuota pendiente':!((db.taxControls||{})[d.id]||retentions.some(r=>r.fiscalControl))?'Número de control pendiente':''};
 });
}
