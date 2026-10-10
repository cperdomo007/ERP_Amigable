const headers=['Nombre','SKU','Unidad','Moneda','Costo','Precio','Stock mínimo','Activo','Link de la imagen','Peso (kg)','Alto (cm)','Ancho (cm)','Largo (cm)','Stock total (solo lectura)','ID (solo lectura)','Tiene serial'];
const norm=v=>String(v??'').trim().toUpperCase();
export function reviewProducts(rows,products=[],update=false){
 const known=new Set(products.map(p=>norm(p.sku))),accepted=[],errors=[],duplicates=[];
 rows.forEach((row,i)=>{
  if(row.every(v=>v==null||String(v).trim()===''))return;
  if(row.some(v=>v!==null&&typeof v==='object')){errors.push(`Fila ${i+2}: no se admiten fórmulas ni valores especiales.`);return;}
  const [name,sku,unit,cur,costValue,priceValue,minValue,activeValue,imageUrl,weightValue,heightValue,widthValue,lengthValue,stockValue,idValue,serialValue]=headers.map((_,j)=>String(row[j]??'').trim());
  const currency=norm(cur||'USD'),cost=Number(costValue||0),price=Number(priceValue),minimum=Number(minValue||0);
  let reason='';if(!name||!sku||!unit||!priceValue)reason='Nombre, SKU, unidad y precio son obligatorios.';
  else if(!['USD','VES'].includes(currency))reason='Moneda debe ser USD o VES.';
  else if([cost,price,minimum].some(n=>!Number.isFinite(n)||n<0))reason='Costo, precio y mínimo deben ser números no negativos.';
  const hasSerial=['SI','SÍ','TRUE','1'].includes(norm(serialValue));
  if(serialValue&&!['SI','SÍ','NO','TRUE','FALSE','1','0'].includes(norm(serialValue)))reason='Tiene serial debe ser Sí o No.';
  const active=activeValue===''?true:['SI','SÍ','TRUE','1'].includes(norm(activeValue));
  const logistics={weight:weightValue===''?'':Number(weightValue),height:heightValue===''?'':Number(heightValue),width:widthValue===''?'':Number(widthValue),length:lengthValue===''?'':Number(lengthValue)};
  if(activeValue&&!['SI','SÍ','NO','TRUE','FALSE','1','0'].includes(norm(activeValue)))reason='Activo debe ser Sí o No.';
  if(Object.values(logistics).some(v=>v!==''&&(!Number.isFinite(v)||v<0)))reason='Peso y dimensiones deben ser números no negativos.';
  if(imageUrl){try{if(!['http:','https:'].includes(new URL(imageUrl).protocol))throw Error();}catch{reason='Link de imagen inválido; utilizá HTTP o HTTPS.';}}
  if(reason){errors.push(`Fila ${i+2}: ${reason}`);return;}
  if(update){const existing=products.find(p=>norm(p.sku)===norm(sku));if(!existing){errors.push(`Fila ${i+2}: SKU ${sku} no existe.`);return;}if(accepted.some(p=>p.sku===norm(sku))){errors.push(`Fila ${i+2}: SKU ${sku} repetido en el archivo.`);return;}accepted.push({name,sku:norm(sku),unit,currency,cost,price,minimum,active,hasSerial,imageUrl,...logistics,id:existing.id});return;}
  if(known.has(norm(sku))){duplicates.push(`Fila ${i+2}: SKU ${sku} existente; se omitirá.`);return;}
  known.add(norm(sku));accepted.push({name,sku:norm(sku),unit,currency,cost,price,minimum,active,hasSerial,imageUrl,...logistics});
 });return {accepted,errors,duplicates};
}
async function excel(){const m=await import('exceljs');return m.default||m;}
export async function exportProducts(products,template=false){
 const Excel=await excel(),book=new Excel.Workbook(),sheet=book.addWorksheet('Productos');
 sheet.columns=headers.map((header,i)=>({header,width:[32,22,18,14,18,18,18,14,55,18,18,18,18,26,40,18][i]}));
 if(!template)products.forEach(p=>sheet.addRow([p.name,p.sku,p.unit,p.currency,p.cost,p.price,p.minimum,p.active===false?'No':'Sí',p.imageUrl||'',p.weight??'',p.height??'',p.width??'',p.length??'',p.stockTotal??0,p.id||'',p.hasSerial?'Sí':'No']));
 sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF153047'}};sheet.getRow(1).height=26;sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter='A1:P1';sheet.getColumn(2).numFmt='@';
 sheet.getColumn(8).eachCell((cell,row)=>{if(row>1)cell.dataValidation={type:'list',allowBlank:true,formulae:['"Sí,No"']}});
 const help=book.addWorksheet('Instrucciones');help.getColumn(1).width=100;
 ['Completá Productos sin cambiar los encabezados. Nombre, SKU, unidad y precio son obligatorios.','Moneda: USD o VES. Costo, precio y stock mínimo deben ser números no negativos.','No uses fórmulas. Los SKU existentes se omiten; no se actualizan productos actuales.','Activo y Tiene serial: Sí o No. Peso en kg y dimensiones en cm. Link de imagen HTTP/HTTPS. Stock total e ID son solo lectura y no se importan.','Actualizar por Excel reemplaza los campos de los SKU existentes; Importar productos agrega nuevos y omite duplicados.','Esta importación carga el catálogo, no las existencias. Registrá stock mediante recepciones o ajustes.'].forEach(t=>help.addRow([t]));
 return book.xlsx.writeBuffer();
}
export async function readProducts(file,products,update=false){
 if(!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024)throw Error('Seleccioná un .xlsx de hasta 5 MB.');
 const Excel=await excel(),book=new Excel.Workbook();try{await book.xlsx.load(await file.arrayBuffer())}catch{throw Error('Archivo Excel inválido.');}
 const sheet=book.getWorksheet('Productos')||book.worksheets[0];if(!sheet||sheet.rowCount>10001)throw Error('Máximo 10.000 productos por archivo.');
 if(headers.some((h,i)=>i<7?norm(h)!==norm(sheet.getRow(1).getCell(i+1).value):(sheet.getRow(1).getCell(i+1).value!=null&&norm(h)!==norm(sheet.getRow(1).getCell(i+1).value))))throw Error('Encabezados incorrectos. Utilizá la plantilla de productos.');
 const rows=[];for(let r=2;r<=sheet.rowCount;r++)rows.push(headers.map((_,i)=>sheet.getRow(r).getCell(i+1).value));return reviewProducts(rows,products,update);
}
