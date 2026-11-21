import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile} from 'node:fs/promises';
process.env.VITE_APP_TARGET='android';
const root=fileURLToPath(new URL('../',import.meta.url));
// Carpeta exclusiva de recursos generados: Vite retira los bundles de compilaciones anteriores.
const flutter=process.argv.includes('--flutter');
const target=fileURLToPath(new URL(flutter?'../mobile/assets/web/':'../android/app/src/main/assets/web/',import.meta.url));
await build({root,base:'./',build:{outDir:target,emptyOutDir:true}});
if(flutter){
 const index=target+'index.html',html=await readFile(index,'utf8');
 const bridge=`<script>window.Pyme360Native={request:(id,path,body)=>Pyme360Flutter.postMessage(JSON.stringify({kind:'request',id,path,body})),exportFile:(name,mime,base64)=>Pyme360Flutter.postMessage(JSON.stringify({kind:'export',name,mime,base64})),printDocument:()=>Pyme360Flutter.postMessage(JSON.stringify({kind:'print',html:document.documentElement.outerHTML}))};</script>`;
 await writeFile(index,html.replace('<head>','<head>'+bridge));
}
console.log('Interfaz Pyme 360 preparada para Android.');
