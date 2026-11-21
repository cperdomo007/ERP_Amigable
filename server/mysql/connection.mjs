import mysql from 'mysql2/promise';
import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
export function createPool(){
 return mysql.createPool({...connectionOptions(process.env),connectionLimit:5,charset:'utf8mb4',decimalNumbers:false,multipleStatements:false});
}
export function connectionOptions(env){
 const url=env.DATABASE_URL?new URL(env.DATABASE_URL):null;
 if(url&&!['mysql:','mysql2:'].includes(url.protocol))throw Error('DATABASE_URL debe ser MySQL.');
 const database=url?decodeURIComponent(url.pathname.slice(1)):env.MYSQL_DATABASE,user=url?decodeURIComponent(url.username):env.MYSQL_USER;
 if(!database||!user)throw Error('Configurá MYSQL_DATABASE y MYSQL_USER en .env.');
 return {host:url?url.hostname:(env.MYSQL_HOST||'127.0.0.1'),port:Number(url?.port||env.MYSQL_PORT||3306),database,user,password:url?decodeURIComponent(url.password):(env.MYSQL_PASSWORD||''),...(env.DATABASE_SSL==='true'?{ssl:{rejectUnauthorized:true,...(env.DATABASE_SSL_CA?{ca:env.DATABASE_SSL_CA}:{})}}:{})};
}
export async function transaction(pool,fn){const connection=await pool.getConnection();try{await connection.beginTransaction();const result=await fn(connection);await connection.commit();return result}catch(error){await connection.rollback();throw error}finally{connection.release()}}
