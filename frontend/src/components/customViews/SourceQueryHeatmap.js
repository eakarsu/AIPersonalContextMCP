import React, { useEffect, useState } from 'react';
import { API_BASE, getToken } from '../../services/api';

// VIZ 2 — Source-type x Query-type heatmap.
function cellColor(value, maxVal) {
  const t = maxVal > 0 ? Math.min(1, Math.max(0, value / maxVal)) : 0;
  const r = Math.round(15 + (59 - 15) * t);
  const g = Math.round(23 + (130 - 23) * t);
  const b = Math.round(42 + (246 - 42) * t);
  return `rgb(${r},${g},${b})`;
}

export default function SourceQueryHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/custom-views/source-query-heatmap`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!active) return; if (!ok) throw new Error(j.error || 'load failed'); setData(j); })
      .catch((e) => { if (active) setErr(e.message); });
    return () => { active = false; };
  }, []);

  if (err) return <div className="card" style={{ padding: 16 }} data-testid="source-query-heatmap">Error: {err}</div>;
  if (!data) return <div className="card" style={{ padding: 16 }} data-testid="source-query-heatmap">Loading heatmap…</div>;

  const { query_types = [], matrix = [], max_cell = 0 } = data;

  return (
    <div className="card" data-testid="source-query-heatmap" style={{ padding: 20 }}>
      <h3 style={{ marginTop: 0 }}>Source × Query Heatmap</h3>
      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 0 }}>
        Retrieval intensity across source types and query intents.
      </p>
      {matrix.length === 0 ? (
        <div style={{ color: '#94a3b8' }}>No data sources defined.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: 6, textAlign: 'left', color: '#94a3b8' }}>Source \ Query</th>
                {query_types.map((q) => (
                  <th key={q} style={{ padding: 6, color: '#cbd5e1', minWidth: 80, textAlign: 'center' }}>{q}</th>
                ))}
                <th style={{ padding: 6, color: '#64748b', textAlign: 'right' }}>total</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.source_type}>
                  <td style={{ padding: 6, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{row.source_type}</td>
                  {query_types.map((q) => {
                    const v = row.cells?.[q] ?? 0;
                    return (
                      <td
                        key={q}
                        title={`${row.source_type} × ${q}: ${v}`}
                        style={{
                          padding: 0,
                          width: 64,
                          height: 36,
                          textAlign: 'center',
                          background: cellColor(v, max_cell),
                          color: v > max_cell * 0.5 ? '#fff' : '#cbd5e1',
                          border: '1px solid #0f172a',
                          fontWeight: v > 0 ? 600 : 400,
                        }}
                      >
                        {v > 0 ? v : '·'}
                      </td>
                    );
                  })}
                  <td style={{ padding: 6, color: '#94a3b8', textAlign: 'right' }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
