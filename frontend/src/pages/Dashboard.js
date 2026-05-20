import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';

const FEATURES = [
  { path: '/connectors', title: 'Connectors', icon: 'C', color: '#3b82f6', desc: 'Manage connectors.' },
  { path: '/data-sources', title: 'Data Sources', icon: 'S', color: '#3b82f6', desc: 'Manage data sources.' },
  { path: '/app-consents', title: 'App Consents', icon: 'K', color: '#3b82f6', desc: 'Manage app consents.' },
  { path: '/disclosure-log', title: 'Disclosure Log', icon: 'L', color: '#3b82f6', desc: 'Manage disclosure log.' },
  { path: '/mcp-clients', title: 'MCP Clients', icon: 'M', color: '#3b82f6', desc: 'Manage mcp clients.' },
  { path: '/schemas', title: 'Schemas', icon: 'C', color: '#3b82f6', desc: 'Manage schemas.' },
  { path: '/redaction-rules', title: 'Redaction Rules', icon: 'X', color: '#3b82f6', desc: 'Manage redaction rules.' },
  { path: '/ai/answer-from-context', title: 'AI · Answer App Query', icon: '*', color: '#8b5cf6', desc: 'Answer App Query' },
  { path: '/ai/consent-policy-check', title: 'AI · Consent Policy Check', icon: '*', color: '#8b5cf6', desc: 'Consent Policy Check' },
  { path: '/ai/audit-log', title: 'AI · Audit Disclosure Log', icon: '*', color: '#8b5cf6', desc: 'Audit Disclosure Log' },
  { path: '/ai/redaction-suggester', title: 'AI · Redaction Suggester', icon: '*', color: '#8b5cf6', desc: 'Redaction Suggester' },
  { path: '/ai/privacy-risk-score', title: 'AI · Privacy Risk Score', icon: '*', color: '#8b5cf6', desc: 'Privacy Risk Score' },
  { path: '/ai/intent-classifier', title: 'AI · Intent Classifier', icon: '*', color: '#8b5cf6', desc: 'Intent Classifier' },
  { path: '/ai/schema-extractor', title: 'AI · Schema Extractor', icon: '*', color: '#8b5cf6', desc: 'Schema Extractor' }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { getDashboardStats().then(setStats).catch((e) => setErr(e.message)); }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h2>Personal Context MCP</h2>
        <p>One personal data layer. Apps query via LLM with selective disclosure.</p>
      </div>
      {err && <div className="ai-error">Stats unavailable: {err}</div>}
      {stats && (
        <div className="stats-grid">
          <div className="stat"><div className="stat-label">Connectors</div><div className="stat-value">{stats.connectors?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Data Sources</div><div className="stat-value">{stats.data_sources?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">App Consents</div><div className="stat-value">{stats.app_consents?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Disclosure Log</div><div className="stat-value">{stats.disclosure_log?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">MCP Clients</div><div className="stat-value">{stats.mcp_clients?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Schemas</div><div className="stat-value">{stats.schemas?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Redaction Rules</div><div className="stat-value">{stats.redaction_rules?.total ?? '—'}</div></div>
        </div>
      )}
      <h3 style={{ color: '#cbd5e1', margin: '8px 0 14px', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 }}>Capabilities</h3>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div key={f.path} className="feature-card" style={{ ['--card-color']: f.color }} onClick={() => navigate(f.path)}>
            <div className="feature-card-icon" style={{ background: f.color + '22', color: f.color }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
