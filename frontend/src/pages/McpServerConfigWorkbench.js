
import React, { useEffect, useState } from 'react';
const TOKEN_KEY = Object.keys(localStorage).find((k) => k.endsWith('_token')) || 'personal_context_mcp_token';
const API_BASE = 'http://localhost:4063/api';
export default function McpServerConfigWorkbench(){
  const [cfg,setCfg]=useState(null);const [clients,setClients]=useState([]);
  useEffect(()=>{
    fetch(API_BASE+'/mcp/config',{headers:{Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)}}).then(r=>r.json()).then(setCfg);
    fetch(API_BASE+'/mcp-clients',{headers:{Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)}}).then(r=>r.json()).then(setClients);
  },[]);
  const revoke=async(c)=>{
    await fetch(API_BASE+'/mcp-clients/'+c.id,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)},body:JSON.stringify({...c,status:'revoked'})});
    const r=await fetch(API_BASE+'/mcp-clients',{headers:{Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)}}); setClients(await r.json());
  };
  return (
    <div>
      <div className="page-header"><div><h2>MCP Server Config</h2><p>Dynamic config snippet · click "Revoke" to actually revoke an MCP client.</p></div></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="card">
          <h3 style={{margin:'0 0 12px',color:'#cbd5e1'}}>Add to your AI client config</h3>
          {!cfg?<div className="empty-state">Loading…</div>:<pre style={{background:'#0b1424',padding:12,borderRadius:8,fontSize:11,color:'#cbd5e1',overflow:'auto',maxHeight:380}}>{JSON.stringify(cfg,null,2)}</pre>}
        </div>
        <div className="card">
          <h3 style={{margin:'0 0 12px',color:'#cbd5e1'}}>Registered clients</h3>
          {clients.map(c=>(
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #1e293b'}}>
              <div>
                <strong>{c.name}</strong>
                <div style={{color:'#94a3b8',fontSize:11,fontFamily:'Menlo,monospace'}}>{c.public_key}</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span className={'badge '+(c.status||'')}>{c.status}</span>
                {c.status!=='revoked'&&<button className="btn secondary" onClick={()=>revoke(c)}>Revoke</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}