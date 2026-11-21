import React,{useState} from 'react';

const endpoints={
 qa:'https://qa.unidigital.global/digitalinvoice-core',
 production:'https://www.unidigital.global/digitalinvoice-core'
};

export default function FiscalBillingSettings({settings,save}){
 const [environment,setEnvironment]=useState(settings?.environment==='production'?'production':'qa');
 return <section className="card company-card">
  <div className="section-heading"><div><h2>Facturación fiscal</h2><p>Unidigital · DigitalInvoice</p></div><span className="badge amber">Emisión no conectada</span></div>
  <form onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);save({environment,series:String(fields.get('series')||'').trim()})}}>
   <div className="form-grid">
    <label className="field"><span>Ambiente</span><select value={environment} onChange={e=>setEnvironment(e.target.value)}><option value="qa">Pruebas (Sandbox)</option><option value="production">Producción</option></select></label>
    <label className="field"><span>URL de la API</span><input readOnly value={endpoints[environment]}/></label>
    <label className="field"><span>Serie asignada por Unidigital</span><input name="series" maxLength={120} defaultValue={settings?.series||''}/></label>
   </div>
   <div className="alert">Esta pantalla guarda la configuración de la empresa. Para conectar la emisión, el servidor deberá autenticar la cuenta de Unidigital y consultar las series habilitadas. Las credenciales se configurarán en el servidor.</div>
   <div className="form-actions"><a href="https://docs.unidigital.global/" target="_blank" rel="noreferrer">Documentación de Unidigital</a><button type="submit" className="primary">Guardar configuración</button></div>
  </form>
 </section>;
}
