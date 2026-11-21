import {createPool} from './mysql/connection.mjs';
import {createApplication} from './application.mjs';
import {scheduleBackups} from './backup-job.mjs';
const host=process.env.ERP_HOST||'127.0.0.1',port=Number(process.env.PORT||3002);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT inválido.');
const pool=createPool(),server=createApplication(pool,{staticDirectory:process.env.ERP_SERVE_WEB==='true'?'dist':null});
const backupTimer=process.env.ERP_FILE_BACKUPS==='false'?null:scheduleBackups(pool);
server.listen(port,host,()=>console.log(`API Pyme 360: http://${host}:${port}`));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{clearInterval(backupTimer);server.close(async()=>{await pool.end();process.exit(0)})});
