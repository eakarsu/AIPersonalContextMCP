// Apply pass 7 (full backlog implementation)
// MCP JSON-RPC live console: list tools, invoke tools/call.
import React, { useEffect, useState } from 'react';
import { getMcpManifest, callMcpRpc, oauthStatus } from '../services/api';

export default function McpRpcConsolePage() {
  const [manifest, setManifest] = useState(null);
  const [selected, setSelected] = useState('');
  const [argsText, setArgsText] = useState('{}');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [oauth, setOauth] = useState({});

  useEffect(() => { (async () => {
    try { const m = await getMcpManifest(); setManifest(m); if (m.tools?.[0]) setSelected(m.tools[0].name); }
    catch (e) { setErr(e.message); }
    for (const p of ['gmail', 'google-calendar', 'google-drive']) {
      try { const s = await oauthStatus(p); setOauth((cur) => ({ ...cur, [p]: s })); } catch (_) {}
    }
  })(); }, []);

  const tool = manifest?.tools?.find((t) => t.name === selected);

  const invoke = async () => {
    setBusy(true); setErr(null); setResult(null);
    let parsed = {};
    try { parsed = argsText.trim() ? JSON.parse(argsText) : {}; }
    catch (e) { setErr(`args is not valid JSON: ${e.message}`); setBusy(false); return; }
    try {
      const r = await callMcpRpc('tools/call', { name: selected, arguments: parsed });
      setResult(r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const listTools = async () => {
    setBusy(true); setErr(null); setResult(null);
    try { const r = await callMcpRpc('tools/list', {}); setResult(r); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div data-testid="mcp-rpc-console-page">
      <div className="page-header">
        <div>
          <h2>MCP JSON-RPC Console</h2>
          <p>Live JSON-RPC 2.0 surface at <code>POST /api/mcp/rpc</code>. Methods: initialize, tools/list, tools/call.</p>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>OAuth Provider Status (NEEDS-CREDS → 503 until configured)</h3>
        <table style={{ width: '100%' }}>
          <thead><tr><th>Provider</th><th>Configured</th><th>Required env</th><th>Scope</th></tr></thead>
          <tbody>
            {Object.keys(oauth).map((p) => (
              <tr key={p}>
                <td>{p}</td>
                <td><span className={'badge ' + (oauth[p].configured ? 'active' : 'revoked')}>{String(oauth[p].configured)}</span></td>
                <td>{(oauth[p].required_env || []).join(', ')}</td>
                <td style={{ fontSize: 12 }}>{oauth[p].scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!manifest ? <div className="empty-state">Loading manifest…</div> : (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>Tools ({manifest.tools.length}) — protocol {manifest.protocolVersion}</h3>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ width: '100%', padding: 8 }}>
            {manifest.tools.map((t) => <option key={t.name} value={t.name}>{t.name} — {t.description}</option>)}
          </select>
          {tool && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              <strong>Input schema:</strong> <code>{JSON.stringify(tool.inputSchema)}</code>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <label>Arguments (JSON)</label>
            <textarea value={argsText} onChange={(e) => setArgsText(e.target.value)} style={{ width: '100%', minHeight: 100, fontFamily: 'monospace' }} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button className="btn ai" disabled={busy || !selected} onClick={invoke}>{busy ? '…' : 'tools/call'}</button>
            <button className="btn secondary" disabled={busy} onClick={listTools}>tools/list (raw)</button>
          </div>
        </div>
      )}

      {result && (
        <div className="card">
          <h3>JSON-RPC Result</h3>
          <pre style={{ background: '#0b1220', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 480 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
