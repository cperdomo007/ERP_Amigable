import * as D from '../src/domain.mjs';
import {sumMoney,quantityRound} from '../src/decimal.mjs';
export function insights(db){return {asOf:D.today(),overdue:db.documents.filter(d=>['Venta','Recepción','Cuenta por cobrar','Cuenta por pagar'].includes(d.kind)&&d.status==='Confirmado'&&d.due<D.today()&&D.balance(db,d)>0).map(d=>({id:d.id,number:d.number,side:d.side,due:d.due,currency:d.currency,balance:D.balance(db,d)})),stock:db.products.filter(p=>D.available(db,p.id)<=p.minimum).map(p=>({id:p.id,sku:p.sku,name:p.name,available:D.available(db,p.id),minimum:p.minimum,suggestedQty:Math.max(0,quantityRound(p.minimum-D.available(db,p.id))),unit:p.unit}))}}
export function verifiedAnswer(db,question,from,to){const q=String(question||'').toLowerCase(),format=(n,c)=>`${n.toFixed(2)} ${c}`;let docs=[];
 if(q.includes('stock')||q.includes('reposici')){const rows=insights(db).stock;return {answer:rows.length?rows.map(r=>`${r.sku}: ${r.available} ${r.unit} disponibles; mínimo ${r.minimum}; reposición para alcanzar el mínimo: ${r.suggestedQty}.`).join('\n'):'No hay productos por debajo del mínimo disponible.',evidence:rows.map(r=>r.id),asOf:D.today()}}
 if(q.includes('venta'))docs=db.documents.filter(d=>d.kind==='Venta'&&d.status==='Confirmado'&&(!from||d.date>=from)&&(!to||d.date<=to));
 else if(q.includes('vencid')){const ids=new Set(insights(db).overdue.map(r=>r.id));docs=db.documents.filter(d=>ids.has(d.id))}
 else if(q.includes('cobrar'))docs=db.documents.filter(d=>d.side==='sale'&&['Venta','Cuenta por cobrar'].includes(d.kind)&&d.status==='Confirmado'&&D.balance(db,d)>0);
 else if(q.includes('pagar'))docs=db.documents.filter(d=>d.side==='purchase'&&['Recepción','Cuenta por pagar'].includes(d.kind)&&d.status==='Confirmado'&&D.balance(db,d)>0);
 else return {answer:'Puedo verificar ventas del período, stock disponible, cuentas vencidas, por cobrar y por pagar. La consulta no realiza cambios.',evidence:[],asOf:D.today()};
 const field=q.includes('venta')?d=>d.total:d=>D.balance(db,d);return {answer:['USD','VES'].map(c=>format(sumMoney(docs.filter(d=>d.currency===c).map(field)),c)).join('\n')+`\nBasado en ${docs.length} documentos confirmados.`,evidence:docs.map(d=>d.number),asOf:D.today()};
}
