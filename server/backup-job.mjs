import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {exportBackup} from './mysql/export-backup.mjs';
export async function backupToFiles(pool){const directory=resolve('backups');await mkdir(directory,{recursive:true});const [companies]=await pool.query('SELECT id,revision FROM SUMI_companies');let count=0;for(const company of companies){const db=await exportBackup(pool,company.id),safe=company.id.replace(/[^A-Za-z0-9_-]/g,'_'),stamp=new Date().toISOString().replace(/[:.]/g,'-'),path=resolve(directory,`${safe}-${stamp}-v${company.revision}.json`);if(!path.startsWith(directory+'\\')&&!path.startsWith(directory+'/'))throw Error('Ruta de respaldo inválida.');await writeFile(path,JSON.stringify(db),{flag:'wx',mode:0o600});count++}return count}
export function scheduleBackups(pool){const run=()=>backupToFiles(pool).catch(e=>console.error('Respaldo de archivos:',e.code||e.name));run();const timer=setInterval(run,60*60*1000);timer.unref();return timer}
