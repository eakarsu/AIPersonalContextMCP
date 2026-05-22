// Apply pass 7 (full backlog implementation)
// "What each AI knows about you" — share-graph dashboard
// apps × fields × last-disclosed matrix.
import React, { useEffect, useState } from 'react';
import { getShareGraph } from '../services/api';

export default function ShareGraphPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => { (async () => {
    try { setData(await getShareGraph()); } catch (e) { setErr(e.message); }
  })(); }, []);

  if (err) return <div className="ai-error">{err}</div>;
  if (!data) return <div className="empty-state">Loading…</div>;

  return (
    <div data-testid="share-graph-page">
      <div className="page-header">
        <div>
          <h2>Share-with-AI Dashboard</h2>
          <p>What each app/AI knows about you, grouped by app, with last-disclosed timestamps and purposes.</p>
        </div>
        <div className="page-header-actions">
          <div className="badge">{data.app_count} apps</div>
          <div className="badge">{data.field_count} unique fields</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <strong>All known fields:</strong>{' '}
        {data.all_fields.length === 0 ? '—' : data.all_fields.join(', ')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 12 }}>
        {data.apps.map((a) => {
          const isOpen = !!expanded[a.app_name];
          return (
            <div key={a.app_name} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{a.app_name}</h3>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>
                    scope: {a.scope || '-'} · status: <span className={'badge ' + (a.status || '')}>{a.status || 'unknown'}</span>
                  </div>
                </div>
                <button className="btn secondary" onClick={() => setExpanded({ ...expanded, [a.app_name]: !isOpen })}>
                  {isOpen ? 'Hide' : 'Show'} fields ({a.fields.length})
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Total disclosures: <strong>{a.total_disclosures}</strong>
              </div>
              {isOpen && (
                <table style={{ width: '100%', marginTop: 8, fontSize: 13 }}>
                  <thead><tr><th>Field</th><th>Count</th><th>Last disclosed</th><th>Purposes</th><th>Source</th></tr></thead>
                  <tbody>
                    {a.fields.map((f) => (
                      <tr key={f.field}>
                        <td>{f.field}</td>
                        <td>{f.count}</td>
                        <td>{f.last_disclosed ? new Date(f.last_disclosed).toLocaleString() : '—'}</td>
                        <td>{(f.purposes || []).join(', ') || '—'}</td>
                        <td><span className="badge">{f.source}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
