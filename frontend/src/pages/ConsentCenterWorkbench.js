
import React, { useEffect, useState } from 'react';
const TOKEN_KEY = Object.keys(localStorage).find((k) => k.endsWith('_token')) || 'personal_context_mcp_token';
const API_BASE = 'http://localhost:4063/api';
export default function ConsentCenterWorkbench(){
  const [rows,setRows]=useState([]);const [busy,setBusy]=useState(null);
  const load=()=>fetch(API_BASE+'/app-consents',{headers:{Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)}}).then(r=>r.json()).then(setRows);
  useEffect(()=>{load();},[]);
  const toggle=async(r)=>{
    setBusy(r.id);
    const next=r.status==='active'?'revoked':'active';
    await fetch(API_BASE+'/app-consents/'+r.id,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)},body:JSON.stringify({...r,status:next})});
    setBusy(null);load();
  };
  return (
    <div>
      <div className="page-header"><div><h2>Consent Center</h2><p>Toggle consent → real PUT to backend → status persists.</p></div></div>
      <div className="card">
        {rows.map(r=>(
          <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid #1e293b'}}>
            <div>
              <strong>{r.app_name}</strong>
              <div style={{color:'#94a3b8',fontSize:12,marginTop:2}}>scope: {r.scope} · fields: {r.allowed_fields}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span className={'badge '+(r.status||'')}>{r.status}</span>
              <button className={'btn '+(r.status==='active'?'':'secondary')} disabled={busy===r.id} onClick={()=>toggle(r)}>{busy===r.id?'…':r.status==='active'?'Revoke':'Activate'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}