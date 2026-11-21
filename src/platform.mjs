export const isAndroid=import.meta.env?.VITE_APP_TARGET==='android';
export const appName='Pyme 360';

if(typeof document!=='undefined')document.title=appName;
if(isAndroid&&typeof document!=='undefined'){
 document.title=appName;
 document.addEventListener('DOMContentLoaded',()=>document.body.classList.add('pyme360-mobile'));
 document.body?.classList.add('pyme360-mobile');
 const bridge=window.Pyme360Native;
 if(bridge){
  window.print=()=>bridge.printDocument();
  const save=async anchor=>{
   try{
    const response=await fetch(anchor.href),blob=await response.blob(),reader=new FileReader();
    reader.onload=()=>bridge.exportFile(anchor.download||'Pyme360',blob.type||'application/octet-stream',String(reader.result).split(',')[1]);reader.readAsDataURL(blob);
   }catch{window.alert('No se pudo preparar la descarga. Intentá nuevamente.')}
  };
  const click=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){
   if(this.download&&(this.href.startsWith('blob:')||this.href.startsWith('data:'))){void save(this);return}
   return click.call(this);
  };
 }
}
