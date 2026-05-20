import React, { useEffect, useState } from 'react';
import { API_BASE, getToken } from '../../services/api';

// VIZ 1 — Context Retrieval Frequency (last N days bar chart).
export default function RetrievalFrequencyChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/custom-views/retrieval-frequency?days=14`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!active) return; if (!ok) throw new Error(j.error || 'load failed'); setData(j); })
      .catch((e) => { if (active) setErr(e.message); });
    return () => { active = false; };
  }, []);

  if (err) return <div className="card" style={{ padding: 16 }} data-testid="retrieval-frequency-chart">Error: {err}</div>;
  if (!data) return <div className="card" style={{ padding: 16 }} data-testid="retrieval-frequency-chart">Loading retrieval frequency…</div>;

  const series = data.series || [];
  const maxVal = Math.max(1, ...series.map((b) => b.retrievals));
  const width = 560;
  const height = 220;
  const padL = 36;
  const padB = 30;
  const padT = 16;
  const padR = 12;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const barW = series.length ? Math.max(4, innerW / series.length - 4) : 0;

  return (
    <div className="card" data-testid="retrieval-frequency-chart" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>Context Retrieval Frequency</h3>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>last {data.days} days</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
        <span>Total: <strong style={{ color: '#e2e8f0' }}>{data.total_retrievals}</strong></span>
        <span>Avg/day: <strong style={{ color: '#e2e8f0' }}>{data.avg_per_day}</strong></span>
        <span>Peak: <strong style={{ color: '#e2e8f0' }}>{data.peak_count}</strong>{data.peak_day ? ` (${data.peak_day})` : ''}</span>
      </div>
      <svg width={width} height={height} style={{ marginTop: 8, maxWidth: '100%' }}>
        <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#1e293b" />
        <line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke="#1e293b" />
        {[0, 0.5, 1].map((t, i) => {
          const y = padT + innerH - t * innerH;
          const val = Math.round(maxVal * t);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="#1e293b" strokeDasharray="3,3" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">{val}</text>
            </g>
          );
        })}
        {series.map((b, i) => {
          const h = (b.retrievals / maxVal) * innerH;
          const x = padL + i * (innerW / Math.max(series.length, 1)) + 2;
          const y = padT + innerH - h;
          const showLabel = series.length <= 14 || i % 2 === 0;
          return (
            <g key={b.day}>
              <rect x={x} y={y} width={barW} height={h} fill="#3b82f6" rx="2">
                <title>{`${b.day}: ${b.retrievals} retrievals, ${b.apps} apps`}</title>
              </rect>
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={padT + innerH + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                >
                  {b.day.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {series.length === 0 && <div style={{ color: '#94a3b8', marginTop: 8 }}>No retrievals recorded.</div>}
    </div>
  );
}
