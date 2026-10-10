import {createPool} from './mysql/connection.mjs';
import {createApi} from './auth-api.mjs';
import {scheduleBackups} from './backup-job.mjs';
const pool=createPool(),server=createApi(pool);scheduleBackups(pool);server.listen(3002,'127.0.0.1',()=>console.log('API ERP autenticada: http://127.0.0.1:3002'));process.on('SIGTERM',()=>server.close(async()=>{await pool.end();process.exit(0)}));
