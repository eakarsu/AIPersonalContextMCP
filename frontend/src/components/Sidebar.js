import React from 'react';
import { NavLink } from 'react-router-dom';
import { logout, getStoredUser } from '../services/api';

const CRUD_LINKS = [
  { to: '/connectors', label: 'Connectors' },
  { to: '/data-sources', label: 'Data Sources' },
  { to: '/app-consents', label: 'App Consents' },
  { to: '/disclosure-log', label: 'Disclosure Log' },
  { to: '/mcp-clients', label: 'MCP Clients' },
  { to: '/schemas', label: 'Schemas' },
  { to: '/redaction-rules', label: 'Redaction Rules' },
];

const AI_LINKS = [
  { to: '/ai/answer-from-context', label: 'AI · Answer App Query' },
  { to: '/ai/consent-policy-check', label: 'AI · Consent Policy Check' },
  { to: '/ai/audit-log', label: 'AI · Audit Disclosure Log' },
  { to: '/ai/redaction-suggester', label: 'AI · Redaction Suggester' },
  { to: '/ai/privacy-risk-score', label: 'AI · Privacy Risk Score' },
  { to: '/ai/intent-classifier', label: 'AI · Intent Classifier' },
  { to: '/ai/schema-extractor', label: 'AI · Schema Extractor' },
  // Apply pass 7 (full backlog implementation)
  { to: '/ai/context-summarizer', label: 'AI · Context Summarizer' },
  { to: '/ai/relevance-scorer',   label: 'AI · Relevance Scorer' },
  { to: '/ai/query-rewriter',     label: 'AI · Query Rewriter' },
  { to: '/ai/conflict-detector',  label: 'AI · Conflict Detector' },
];

const CUSTOM_LINKS = [
  { to: '/wb/consent-center', label: 'Consent Center' },
  { to: '/wb/mcp-server-config', label: 'MCP Server Config' },
  { to: '/custom-views', label: 'Context Views' },
  // Apply pass 7 (full backlog implementation)
  { to: '/dp-budgets',        label: 'DP Budgets' },
  { to: '/share-graph',       label: 'Share-with-AI Dashboard' },
  { to: '/recall-and-forget', label: 'Recall & Forget' },
  { to: '/context-bundle',    label: 'Context Bundle Export' },
  { to: '/mcp-rpc-console',   label: 'MCP RPC Console' },
  { to: '/disclosure-simulator', label: 'Disclosure Simulator' },
];

export default function Sidebar() {
  const user = getStoredUser();
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h1>PERSONAL CONTEXT MCP</h1>
        <p>One personal data layer. Apps query via LLM with selective disclosure.</p>
      </div>
      <NavLink to="/" end>Dashboard</NavLink>
      <div className="sidebar-group-label">Data</div>
      {CRUD_LINKS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
      <div className="sidebar-group-label">AI Features</div>
      {AI_LINKS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
      {CUSTOM_LINKS.length > 0 && <div className="sidebar-group-label">Workbenches</div>}
      {CUSTOM_LINKS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
      <div className="sidebar-user">
        {user && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || user.email}</div>
            <div className="sidebar-user-role">{user.role || 'user'}</div>
          </div>
        )}
        <button className="btn secondary sidebar-logout" onClick={logout}>Sign Out</button>
      </div>
    </nav>
  );
}
