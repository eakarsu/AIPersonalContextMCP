import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ConnectorsPage from './pages/ConnectorsPage';
import DataSourcesPage from './pages/DataSourcesPage';
import AppConsentsPage from './pages/AppConsentsPage';
import DisclosureLogPage from './pages/DisclosureLogPage';
import McpClientsPage from './pages/McpClientsPage';
import SchemasPage from './pages/SchemasPage';
import RedactionRulesPage from './pages/RedactionRulesPage';
import AIAnswerFromContextPage from './pages/AIAnswerFromContextPage';
import AIConsentPolicyCheckPage from './pages/AIConsentPolicyCheckPage';
import AIAuditLogPage from './pages/AIAuditLogPage';
import AIRedactionSuggesterPage from './pages/AIRedactionSuggesterPage';
import AIPrivacyRiskScorePage from './pages/AIPrivacyRiskScorePage';
import AIIntentClassifierPage from './pages/AIIntentClassifierPage';
import AISchemaExtractorPage from './pages/AISchemaExtractorPage';
import ConsentCenterWorkbench from './pages/ConsentCenterWorkbench';
import McpServerConfigWorkbench from './pages/McpServerConfigWorkbench';
import CustomViewsPage from './pages/CustomViewsPage';
import { getToken } from './services/api';
import './App.css';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getToken()) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function Shell() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main" style={{ padding: 0 }}>
        <Topbar />
        <div style={{ padding: '24px 32px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/connectors" element={<ConnectorsPage />} />
            <Route path="/data-sources" element={<DataSourcesPage />} />
            <Route path="/app-consents" element={<AppConsentsPage />} />
            <Route path="/disclosure-log" element={<DisclosureLogPage />} />
            <Route path="/mcp-clients" element={<McpClientsPage />} />
            <Route path="/schemas" element={<SchemasPage />} />
            <Route path="/redaction-rules" element={<RedactionRulesPage />} />
            <Route path="/ai/answer-from-context" element={<AIAnswerFromContextPage />} />
            <Route path="/ai/consent-policy-check" element={<AIConsentPolicyCheckPage />} />
            <Route path="/ai/audit-log" element={<AIAuditLogPage />} />
            <Route path="/ai/redaction-suggester" element={<AIRedactionSuggesterPage />} />
            <Route path="/ai/privacy-risk-score" element={<AIPrivacyRiskScorePage />} />
            <Route path="/ai/intent-classifier" element={<AIIntentClassifierPage />} />
            <Route path="/ai/schema-extractor" element={<AISchemaExtractorPage />} />
            <Route path="/wb/consent-center" element={<ConsentCenterWorkbench />} />
            <Route path="/wb/mcp-server-config" element={<McpServerConfigWorkbench />} />
            <Route path="/custom-views" element={<CustomViewsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<RequireAuth><Shell /></RequireAuth>} />
      </Routes>
    </Router>
  );
}
