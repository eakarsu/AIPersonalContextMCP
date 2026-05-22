// Apply pass 7 (full backlog implementation)
// Recall-and-forget engine UI.
// (a) revoke consent (b) review forget queue (c) complete a forget request
import React, { useEffect, useState } from 'react';
import { app_consentsApi, forgetRequestsApi, revokeConsent } from '../services/api';

export default function RecallAndForgetPage() {
  const [consents, setConsents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const [c, r] = await Promise.all([app_consentsApi.list(), forgetRequestsApi.list()]);
      setConsents(c); setRequests(r);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const revoke = async (id, reason) => {
    setBusy(id); setErr(null); setMsg(null);
    try {
      const r = await revokeConsent(id, reason || 'user_revoked');
      setMsg(`Revoked consent ${id}. Forget request ${r.forget_request?.id} created. Fields: ${r.fields_to_purge || '(none)'} (prev disclosures: ${r.previously_disclosed_count}).`);
      load();
    } catch (e) { setErr(e.message); } finally { setBusy(null); }
  };
  const complete = async (id) => {
    setBusy(`fr-${id}`); setErr(null); setMsg(null);
    try { await forgetRequestsApi.complete(id); setMsg(`Forget request ${id} completed; forget.completed webhook fired.`); load(); }
    catch (e) { setErr(e.message); } finally { setBusy(null); }
  };

  return (
    <div data-testid="recall-and-forget-page">
      <div className="page-header">
        <div>
          <h2>Recall &amp; Forget</h2>
          <p>Revoke consent → enqueue forget → fire consent.revoked + forget.requested webhooks → complete forget.</p>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}
      {msg && <div className="card" style={{ background: '#0c2218', borderColor: '#16a34a', marginBottom: 12 }}>{msg}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Active Consents</h3>
        {consents.length === 0 && <div className="empty-state">No consents.</div>}
        <table style={{ width: '100%' }}>
          <thead><tr><th>App</th><th>Scope</th><th>Fields</th><th>Status</th><th /></tr></thead>
          <tbody>
            {consents.map((c) => (
              <tr key={c.id}>
                <td>{c.app_name}</td><td>{c.scope || '-'}</td><td>{c.allowed_fields || '-'}</td>
                <td><span className={'badge ' + (c.status || '')}>{c.status || 'unknown'}</span></td>
                <td>
                  <button className="btn ai" disabled={busy === c.id || c.status === 'revoked'} onClick={() => revoke(c.id)}>
                    {busy === c.id ? '…' : (c.status === 'revoked' ? 'Already revoked' : 'Revoke & Forget')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Forget Queue</h3>
        {requests.length === 0 && <div className="empty-state">No forget requests on file.</div>}
        <table style={{ width: '100%' }}>
          <thead><tr><th>ID</th><th>App</th><th>Fields to purge</th><th>Reason</th><th>Status</th><th>Webhook</th><th /></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>#{r.id}</td><td>{r.app_name}</td>
                <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.fields_to_purge || '(none)'}</td>
                <td>{r.reason || '-'}</td>
                <td><span className={'badge ' + (r.status || '')}>{r.status}</span></td>
                <td>{r.webhook_fired ? 'fired' : '—'}</td>
                <td>
                  {r.status !== 'completed' && (
                    <button className="btn" disabled={busy === `fr-${r.id}`} onClick={() => complete(r.id)}>
                      {busy === `fr-${r.id}` ? '…' : 'Mark complete'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
