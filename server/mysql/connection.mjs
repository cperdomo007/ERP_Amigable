import mysql from 'mysql2/promise';
import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
export function createPool(){
 const database=process.env.MYSQL_DATABASE,user=process.env.MYSQL_USER;
 if(!database||!user)throw Error('Configurá MYSQL_DATABASE y MYSQL_USER en .env.');
 return mysql.createPool({host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT||3306),database,user,password:process.env.MYSQL_PASSWORD||'',connectionLimit:5,charset:'utf8mb4',decimalNumbers:false,multipleStatements:false});
}
export async function transaction(pool,fn){const connection=await pool.getConnection();try{await connection.beginTransaction();const result=await fn(connection);await connection.commit();return result}catch(error){await connection.rollback();throw error}finally{connection.release()}}
