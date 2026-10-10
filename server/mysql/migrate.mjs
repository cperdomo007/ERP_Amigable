import {readFile} from 'node:fs/promises';
import {createPool} from './connection.mjs';
const pool=createPool();
try{
 const sql=await readFile(new URL('./schema.sql',import.meta.url),'utf8');
 // Additive DDL only. MySQL commits DDL implicitly; rerunning resumes safely.
 for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await pool.query(statement);
 await pool.execute('INSERT IGNORE INTO SUMI_migrations(version) VALUES (?)',['001-initial']);
 await pool.execute('INSERT IGNORE INTO SUMI_migrations(version) VALUES (?)',['002-automatic-backups']);
 console.log('Esquema SUMI_ preparado. No se modificaron registros existentes.');
}catch(error){console.error('Migración no completada:',error.code||error.message);process.exitCode=1}finally{await pool.end()}
