export const columns = ['Nombre','RIF','Tipo','Correo','Teléfono','Dirección','Plazo de pago (días)','ID (solo lectura)','Contacto'];
const norm = v => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function reviewRows(rows, contacts=[], type="Cliente") {
 const known=new Set(contacts.map(c=>norm(c.rif))), accepted=[], errors=[], duplicates=[];
 for(const [index,row] of rows.entries()) {
  const number=index+2;
  if(row.every(v=>v===null||v===undefined||String(v).trim()==='')) continue;
  if(row.some(v=>typeof v==='object'&&v!==null)){errors.push(`Fila ${number}: no se admiten fórmulas ni valores especiales.`);continue;}
  const [name,rif,kindValue,email,phone,address,daysValue,idValue,contactPerson]=columns.map((_,i)=>String(row[i]??'').trim());
  const kind=({[norm(type)]:type,'ambos':'Ambos'})[norm(kindValue||type)];
  const days=daysValue===''?0:Number(daysValue);
  let reason='';
  if(!name||!rif)reason='Nombre y RIF son obligatorios.';
  else if(!kind)reason=`Tipo debe ser ${type} o Ambos.`;
  else if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))reason='Correo inválido.';
  else if(!Number.isSafeInteger(days)||days<0)reason='El plazo debe ser un número entero no negativo.';
  if(reason){errors.push(`Fila ${number}: ${reason}`);continue;}
  if(known.has(norm(rif))){duplicates.push(`Fila ${number}: ${rif} ya existe; se omitirá.`);continue;}
  known.add(norm(rif));accepted.push({name,rif:rif.toUpperCase(),kind,email,phone,address,days,contactPerson});
 }
 return {accepted,errors,duplicates};
}
async function excel(){const mod=await import('exceljs');return mod.default||mod;}
export async function exportClients(contacts, template=false, type="Cliente"){
 const Excel=await excel();const book=new Excel.Workbook();const sheet=book.addWorksheet(type==='Cliente'?'Clientes':'Proveedores');
 sheet.columns=columns.map((header,i)=>({header,key:String(i),width:[32,20,14,32,22,45,24,40,32][i]}));
 for(const c of template?[]:contacts.filter(c=>c.kind===type||c.kind==='Ambos')) sheet.addRow([c.name,c.rif,c.kind,c.email||'',String(c.phone||''),c.address||'',Number(c.days)||0,c.id||'',c.contactPerson||'']);
 sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF153047'}};sheet.getRow(1).height=26;
 sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:'I1'};
 sheet.getColumn(2).numFmt='@';sheet.getColumn(5).numFmt='@';
 for(let r=2;r<=Math.max(sheet.rowCount,100);r++){sheet.getCell(r,3).dataValidation={type:'list',allowBlank:true,formulae:[`"${type},Ambos"`]};sheet.getCell(r,7).dataValidation={type:'whole',operator:'greaterThanOrEqual',allowBlank:true,formulae:[0]};}
 const help=book.addWorksheet('Instrucciones');help.getColumn(1).width=110;
 ['Importación de clientes — ERP Amigable','Completá la hoja Clientes sin cambiar los encabezados. Nombre y RIF son obligatorios.','Tipo: Cliente o Ambos. En blanco se interpreta como Cliente. Plazo: entero no negativo.','ID es el identificador interno del registro: se exporta como solo lectura y se ignora al importar.','Todos los campos del formulario están incluidos: nombre, RIF, tipo, correo, teléfono, dirección, plazo de pago y contacto.','Guardá teléfonos y RIF como texto para conservar ceros iniciales. No uses fórmulas.','La importación agrega clientes nuevos y omite RIF existentes; no modifica registros actuales.','Si hay errores, corregí el archivo y volvé a importarlo. Se muestra una vista previa antes de guardar.'].forEach(text=>help.addRow([text.replaceAll('Clientes',type==='Cliente'?'Clientes':'Proveedores').replaceAll('clientes',type==='Cliente'?'clientes':'proveedores').replaceAll('Cliente',type)]));
 return book.xlsx.writeBuffer();
}
export async function readClients(file,contacts,type="Cliente"){
 if(!/\.xlsx$/i.test(file.name))throw Error('Seleccioná un archivo .xlsx.');
 if(file.size>5*1024*1024)throw Error('El archivo no debe superar 5 MB.');
 const Excel=await excel(),book=new Excel.Workbook();
 try{await book.xlsx.load(await file.arrayBuffer())}catch{throw Error('No se pudo leer el archivo Excel. Revisá que sea un .xlsx válido.');}
 const sheet=book.getWorksheet(type==='Cliente'?'Clientes':'Proveedores')||book.worksheets[0];
 if(!sheet||sheet.rowCount>10001)throw Error('El archivo debe tener una hoja y como máximo 10.000 registros.');
 if(columns.some((c,i)=>i<7?norm(sheet.getRow(1).getCell(i+1).value)!==norm(c):(sheet.getRow(1).getCell(i+1).value!=null&&norm(sheet.getRow(1).getCell(i+1).value)!==norm(c))))throw Error('Los encabezados no coinciden. Descargá la plantilla Excel.');
 const rows=[];for(let r=2;r<=sheet.rowCount;r++) rows.push(columns.map((_,i)=>sheet.getRow(r).getCell(i+1).value));
 return reviewRows(rows,contacts,type);
}
