// Apply pass 7 (full backlog implementation)
// Signed context bundle export — GDPR portability surface.
import React, { useState } from 'react';
import { getContextBundle } from '../services/api';

export default function ContextBundleExportPage() {
  const [app, setApp] = useState('');
  const [bundle, setBundle] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setErr(null); setBundle(null);
    try { setBundle(await getContextBundle(app || null)); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const download = () => {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `context-bundle-${app || 'full'}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="context-bundle-export-page">
      <div className="page-header">
        <div>
          <h2>Context Bundle Export</h2>
          <p>Signed JSON bundle: consents + disclosures + schemas + redaction rules + forget requests + DP budgets. HMAC-SHA256 signature for downstream verification.</p>
        </div>
      </div>
      {err && <div className="ai-error">{err}</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="form-grid">
          <div className="form-group"><label>Filter by app (optional)</label><input value={app} onChange={(e) => setApp(e.target.value)} placeholder="leave blank for full export" /></div>
        </div>
        <button className="btn ai" disabled={busy} onClick={run}>{busy ? '…' : 'Generate Bundle'}</button>
        {bundle && <button className="btn secondary" style={{ marginLeft: 8 }} onClick={download}>Download JSON</button>}
      </div>

      {bundle && (
        <div className="card">
          <h3>Bundle</h3>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            <strong>Generated:</strong> {bundle.payload.generated_at} ·{' '}
            <strong>Algorithm:</strong> {bundle.algorithm} ·{' '}
            <strong>Signature:</strong> <code style={{ fontSize: 11 }}>{bundle.signature.slice(0, 32)}…</code>
          </div>
          <div style={{ marginBottom: 8 }}>
            {Object.entries(bundle.payload.counts).map(([k, v]) => (
              <span key={k} className="badge" style={{ marginRight: 6 }}>{k}: {v}</span>
            ))}
          </div>
          <pre style={{ background: '#0b1220', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 480, fontSize: 11 }}>
            {JSON.stringify(bundle.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
