import {adjust,stock,round} from './domain.mjs';
const headers=['SKU','Depósito','Cantidad','Motivo'];
const normalize=s=>String(s??'').trim().normalize('NFC').toLowerCase();
async function workbook(){const m=await import('exceljs');return new (m.default||m).Workbook();}
export async function stockTemplate(){
 const book=await workbook(),sheet=book.addWorksheet('Ajustes');
 sheet.columns=headers.map((header,i)=>({header,width:[24,28,16,55][i]}));
 sheet.getColumn(1).numFmt='@';sheet.getRow(1).font={bold:true};
 sheet.views=[{state:'frozen',ySplit:1}];
 const help=book.addWorksheet('Instrucciones');help.getColumn(1).width=100;
 ['Ingresá una fila por movimiento, sin cambiar los encabezados.','Usá el SKU y el nombre del depósito tal como aparecen en el ERP.','Cantidad positiva = entrada; cantidad negativa = salida. No indica el saldo final.','Motivo obligatorio. No uses fórmulas. Máximo 500 ajustes por archivo.'].forEach(line=>help.addRow([line]));
 return book.xlsx.writeBuffer();
}
export function reviewStock(rows,db){
 const accepted=[],errors=[];let state=db;
 for(const {row,values} of rows){
  try{
   if(values.every(v=>v==null||v===''))continue;
   if(values.some(v=>v!=null&&typeof v==='object'))throw Error('No se admiten fórmulas ni celdas especiales.');
   const [sku,warehouseName,value,reason]=values;
   const products=db.products.filter(p=>normalize(p.sku)===normalize(sku)), warehouses=db.warehouses.filter(w=>normalize(w.name)===normalize(warehouseName));
   if(products.length!==1||warehouses.length!==1)throw Error('SKU o depósito inexistente o ambiguo.');
   const qty=typeof value==='number'?value:Number(String(value??'').trim().replace(',','.'));
   if((typeof value!=='number'&&!/^[+-]?\d+(?:[.,]\d{1,2})?$/.test(String(value??'').trim()))||!Number.isFinite(qty)||qty===0||round(qty)!==qty)throw Error('Cantidad distinta de cero, con hasta dos decimales.');
   const product=products[0],warehouse=warehouses[0], data={product:product.id,warehouse:warehouse.id,qty,reason:String(reason??'').trim()};
   state=adjust(state,data);
   accepted.push({row,data,sku:product.sku,name:product.name,warehouse:warehouse.name,stock:stock(state,product.id,warehouse.id)});
  }catch(e){errors.push('Fila '+row+': '+e.message)}
 }
 return {accepted,errors};
}
export async function readStockAdjustments(file,db){
 if(!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024)throw Error('Seleccioná un archivo .xlsx de hasta 5 MB.');
 const book=await workbook();try{await book.xlsx.load(await file.arrayBuffer())}catch{throw Error('No se pudo leer el archivo Excel.')}
 const sheet=book.getWorksheet('Ajustes')||book.worksheets[0];
 if(!sheet||sheet.rowCount>501)throw Error('Máximo 500 filas de ajustes.');
 if(headers.some((header,i)=>normalize(sheet.getCell(1,i+1).value)!==normalize(header)))throw Error('Usá los encabezados de la plantilla de ajustes.');
 const rows=[];for(let row=2;row<=sheet.rowCount;row++)rows.push({row,values:headers.map((_,i)=>sheet.getCell(row,i+1).value)});
 return reviewStock(rows,db);
}
