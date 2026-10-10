import React,{useEffect,useState} from 'react';
export default function BackupHistory({restore}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function request(path){const r=await fetch('/api/erp/'+path,{headers:{'X-ERP-Client':'desktop'}});const result=await r.json();if(!r.ok)throw Error(result.error);return result}
 async function refresh(){setLoading(true);setError('');try{setRows(await request('backups'))}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{refresh()},[]);
 async function choose(revision){setLoading(true);try{const db=await request('backups/'+revision);restore(db)}catch(e){setError(e.message)}finally{setLoading(false)}}
 return <section className="card"><div className="section-heading"><h3>Respaldos automáticos de MySQL</h3><button disabled={loading} onClick={refresh}>Actualizar historial</button></div><p className="hint">Cada guardado conserva la versión anterior. Restaurar pasa por una confirmación y también respalda la versión actual.</p>{error&&<p role="alert">{error}</p>}<div className="table-wrap"><table><thead><tr><th>Versión</th><th>Fecha del respaldo</th><th>Acción</th></tr></thead><tbody>{rows.map(r=><tr key={r.revision}><td>{r.revision}</td><td>{new Date(r.createdAt).toLocaleString('es-VE')}</td><td><button disabled={loading} onClick={()=>choose(r.revision)}>Revisar restauración</button></td></tr>)}{!rows.length&&<tr><td colSpan="3">Todavía no hay cambios respaldados.</td></tr>}</tbody></table></div></section>;
}
