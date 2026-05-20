import React, { useEffect, useState } from 'react';
import { API_BASE, getToken } from '../../services/api';

// NON-VIZ 1 — Context Profile printable export.
export default function ContextProfilePDF() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [appName, setAppName] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/custom-views/context-profile-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ app_name: appName || null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'load failed');
      setData(j);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function downloadPdf() {
    if (!data) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const safe = (s) => String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const html = `<!doctype html><html><head><title>Personal Context Profile</title>
      <style>
        body { font-family: -apple-system, Segoe UI, sans-serif; margin: 32px; color: #0f172a; }
        h1 { border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
        h2 { margin-top: 28px; color: #1e293b; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 12px; }
        th { background: #f1f5f9; }
        .meta { color: #64748b; font-size: 12px; margin-bottom: 12px; }
        pre { background: #f8fafc; padding: 12px; border-left: 4px solid #3b82f6; font-size: 11px; overflow: auto; }
      </style></head><body>
      <h1>Personal Context Profile</h1>
      <div class="meta">Generated ${new Date(data.generated_at).toLocaleString()} — scope: ${safe(JSON.stringify(data.scope))}</div>
      <h2>Connectors (${data.counts.connectors})</h2>
      <table><thead><tr><th>Name</th><th>Provider</th><th>Status</th><th>Last Synced</th></tr></thead><tbody>
      ${(data.connectors || []).map((c) => `<tr><td>${safe(c.name)}</td><td>${safe(c.provider)}</td><td>${safe(c.status)}</td><td>${safe(c.last_synced)}</td></tr>`).join('')}
      </tbody></table>
      <h2>Data Sources (${data.counts.data_sources})</h2>
      <table><thead><tr><th>Connector</th><th>Type</th><th>Schema</th><th>Status</th></tr></thead><tbody>
      ${(data.data_sources || []).map((d) => `<tr><td>${safe(d.connector_name)}</td><td>${safe(d.source_type)}</td><td>${safe(d.schema_name)}</td><td>${safe(d.status)}</td></tr>`).join('')}
      </tbody></table>
      <h2>App Consents (${data.counts.consents})</h2>
      <table><thead><tr><th>App</th><th>Scope</th><th>Allowed Fields</th><th>Status</th></tr></thead><tbody>
      ${(data.consents || []).map((c) => `<tr><td>${safe(c.app_name)}</td><td>${safe(c.scope)}</td><td>${safe(c.allowed_fields)}</td><td>${safe(c.status)}</td></tr>`).join('')}
      </tbody></table>
      <h2>Recent Disclosures (${data.counts.recent_disclosures})</h2>
      <table><thead><tr><th>App</th><th>Fields</th><th>Purpose</th><th>When</th></tr></thead><tbody>
      ${(data.recent_disclosures || []).map((d) => `<tr><td>${safe(d.app_name)}</td><td>${safe(d.fields_disclosed)}</td><td>${safe(d.purpose)}</td><td>${safe(d.disclosed_at)}</td></tr>`).join('')}
      </tbody></table>
      <h2>Redaction Rules (${data.counts.redaction_rules})</h2>
      <table><thead><tr><th>Field</th><th>Rule</th><th>Reason</th><th>Status</th></tr></thead><tbody>
      ${(data.redaction_rules || []).map((r) => `<tr><td>${safe(r.field)}</td><td>${safe(r.rule)}</td><td>${safe(r.reason)}</td><td>${safe(r.status)}</td></tr>`).join('')}
      </tbody></table>
      <h2>Plain-text summary</h2>
      <pre>${safe(data.text)}</pre>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 350);
  }

  return (
    <div className="card" data-testid="context-profile-pdf" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Context Profile (PDF Export)</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            placeholder="filter by app name (optional)"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            style={{ background: '#0b1424', border: '1px solid #1e293b', color: '#e2e8f0', padding: '6px 8px', borderRadius: 4, fontSize: 12 }}
          />
          <button className="btn secondary" onClick={load} disabled={loading}>{loading ? '…' : 'Reload'}</button>
          <button className="btn" onClick={downloadPdf} disabled={!data}>Export PDF</button>
        </div>
      </div>
      {err && <div className="ai-error" style={{ marginTop: 8 }}>{err}</div>}
      {data && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
            <Stat label="Connectors" value={data.counts.connectors} />
            <Stat label="Data Sources" value={data.counts.data_sources} />
            <Stat label="Consents" value={data.counts.consents} />
            <Stat label="Recent Disclosures" value={data.counts.recent_disclosures} />
            <Stat label="Redaction Rules" value={data.counts.redaction_rules} />
          </div>
          <pre style={{ background: '#0b1424', padding: 10, marginTop: 10, borderRadius: 6, fontSize: 11, maxHeight: 220, overflow: 'auto', color: '#cbd5e1' }}>
            {data.text}
          </pre>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#0b1424', padding: 10, borderRadius: 6 }}>
      <div style={{ color: '#94a3b8', fontSize: 11 }}>{label}</div>
      <div style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
