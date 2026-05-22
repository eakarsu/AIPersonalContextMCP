const API_BASE = 'http://localhost:4063/api';
const TOKEN_KEY = 'personal_context_mcp_token';
const USER_KEY = 'personal_context_mcp_user';

export { API_BASE };
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };
export const getStoredUser = () => { try { const r = localStorage.getItem(USER_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
export const setStoredUser = (u) => { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {} };
export function logout() { setToken(null); setStoredUser(null); if (typeof window !== 'undefined') window.location.assign('/login'); }
export function getRole() { return (getStoredUser()?.role || 'viewer').toLowerCase(); }
export function canWrite() { return ['commander', 'analyst'].includes(getRole()); }
export function isCommander() { return getRole() === 'commander'; }

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (res.status === 401 && !url.startsWith('/auth/login')) { logout(); throw new Error('Session expired'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function crud(base) {
  return {
    list: () => request(`/${base}`),
    get: (id) => request(`/${base}/${id}`),
    create: (data) => request(`/${base}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d) => request(`/${base}/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id) => request(`/${base}/${id}`, { method: 'DELETE' }),
    bulkImport: (csv) => request(`/${base}/bulk-import`, { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csv }),
    listAttachments: (id) => request(`/${base}/${id}/attachments`),
    uploadAttachment: async (id, file) => {
      const token = getToken();
      const form = new FormData(); form.append('file', file);
      const res = await fetch(`${API_BASE}/${base}/${id}/attachments`, {
        method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      return data;
    },
  };
}

export const login = (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request('/auth/me');

export const connectorsApi = crud('connectors');
export const data_sourcesApi = crud('data-sources');
export const app_consentsApi = crud('app-consents');
export const disclosure_logApi = crud('disclosure-log');
export const mcp_clientsApi = crud('mcp-clients');
export const schemasApi = crud('schemas');
export const redaction_rulesApi = crud('redaction-rules');

export const aiAnswerFromContext = (body) => request('/ai/answer-from-context', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiConsentPolicyCheck = (body) => request('/ai/consent-policy-check', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiAuditLog = (body) => request('/ai/audit-log', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiRedactionSuggester = (body) => request('/ai/redaction-suggester', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPrivacyRiskScore = (body) => request('/ai/privacy-risk-score', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiIntentClassifier = (body) => request('/ai/intent-classifier', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiSchemaExtractor = (body) => request('/ai/schema-extractor', { method: 'POST', body: JSON.stringify(body || {}) });
// Apply pass 7 (full backlog implementation)
export const aiContextSummarizer = (body) => request('/ai/context-summarizer', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiRelevanceScorer   = (body) => request('/ai/relevance-scorer',   { method: 'POST', body: JSON.stringify(body || {}) });
export const aiQueryRewriter     = (body) => request('/ai/query-rewriter',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiConflictDetector  = (body) => request('/ai/conflict-detector',  { method: 'POST', body: JSON.stringify(body || {}) });

export const dpBudgetsApi = {
  list: () => request('/dp-budgets'),
  create: (d) => request('/dp-budgets', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/dp-budgets/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/dp-budgets/${id}`, { method: 'DELETE' }),
  spend: (app, body) => request(`/dp-budgets/${encodeURIComponent(app)}/spend`, { method: 'POST', body: JSON.stringify(body) }),
  ledger: (app) => request(`/dp-budgets/${encodeURIComponent(app)}/ledger`),
};

export const forgetRequestsApi = {
  list: () => request('/forget-requests'),
  get: (id) => request(`/forget-requests/${id}`),
  create: (d) => request('/forget-requests', { method: 'POST', body: JSON.stringify(d) }),
  complete: (id) => request(`/forget-requests/${id}/complete`, { method: 'POST', body: JSON.stringify({}) }),
};

export const revokeConsent = (id, reason) =>
  request(`/app-consents/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason: reason || 'user_revoked' }) });

export const getShareGraph = () => request('/custom-views/share-graph');

export const getContextBundle = (app_name) => {
  const qs = app_name ? `?app_name=${encodeURIComponent(app_name)}` : '';
  return request(`/export/context-bundle${qs}`);
};

export const getMcpManifest = () => request('/mcp/rpc/manifest');
export const callMcpRpc = (method, params, id = 1) =>
  request('/mcp/rpc', { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id, method, params: params || {} }) });
export const disclosureSimulate = (body) => request('/disclosure-simulator/simulate', { method: 'POST', body: JSON.stringify(body || {}) });

export const oauthStatus = (provider) => request(`/oauth/${provider}/status`);

export const getAIHistory = (feature, limit = 25) => {
  const qs = new URLSearchParams({ ...(feature ? { feature } : {}), limit: String(limit) }).toString();
  return request(`/ai/history?${qs}`);
};
export const getAISamples = (feature) => {
  const qs = new URLSearchParams({ feature: feature || '' }).toString();
  return request(`/ai/samples?${qs}`);
};

export const getDashboardStats = () => request('/dashboard');

export const getNotifications = () => request('/notifications');
export const getUnreadNotifications = () => request('/notifications/unread');
export const markNotificationRead = (id) => request(`/notifications/${id}/read`, { method: 'POST' });
export const markAllNotificationsRead = () => request('/notifications/mark-all-read', { method: 'POST' });

export const webhooksApi = {
  list: () => request('/webhooks'),
  create: (d) => request('/webhooks', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/webhooks/${id}`, { method: 'DELETE' }),
  test: (event, payload) => request('/webhooks/test', { method: 'POST', body: JSON.stringify({ event, payload }) }),
  deliveries: (id) => request(`/webhooks/${id}/deliveries`),
};
