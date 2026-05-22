import React, { useState } from 'react';
import { disclosureSimulate } from '../services/api';

export default function DisclosureSimulatorPage() {
  const [payload, setPayload] = useState(JSON.stringify({ request: 'Summarize my recent health, calendar, and finance context for a travel booking assistant.', scopes: ['calendar.read', 'health.read', 'finance.read'], app_trust: 0.55 }, null, 2));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    try { setResult(await disclosureSimulate(JSON.parse(payload))); }
    catch (err) { setError(err.message || 'Simulation failed'); }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>Disclosure Simulator</h1><p>Preview which personal context scopes should be allowed, redacted, or escalated before an MCP client receives data.</p></div>
      <div className="grid two">
        <section className="card"><textarea className="input mono" rows={16} value={payload} onChange={(event) => setPayload(event.target.value)} /><button className="btn primary" onClick={run}>Simulate Disclosure</button>{error && <p className="error">{error}</p>}</section>
        <section className="card">{result ? <><h2>{result.tier} · {result.score}</h2><p>{result.disclosurePlan}</p><p className="muted">Allowed: {result.allowedScopes.join(', ') || 'none'}</p><p className="muted">Redacted: {result.redactedScopes.join(', ') || 'none'}</p></> : <p className="muted">Disclosure plan appears here.</p>}</section>
      </div>
    </div>
  );
}
