// Apply pass 7 (full backlog implementation)
// NEEDS-CREDS — real Gmail / Google Calendar / Google Drive OAuth flows.
// These endpoints are wired so the UI can call them, but they 503 until
// GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are configured. We do NOT touch
// real provider SDKs in this pass.
//
// Routes:
//   GET  /api/oauth/:provider/status        — { configured: bool, provider }
//   GET  /api/oauth/:provider/authorize     — 503 with config instructions
//   GET  /api/oauth/:provider/callback      — 503 with config instructions
//   POST /api/oauth/:provider/sync          — 503 (ingestion worker stub)

const express = require('express');
const router = express.Router();

const ALLOWED = new Set(['gmail', 'google-calendar', 'google-drive']);

function envFor(provider) {
  if (provider === 'gmail')           return { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET', scope: 'https://www.googleapis.com/auth/gmail.readonly' };
  if (provider === 'google-calendar') return { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET', scope: 'https://www.googleapis.com/auth/calendar.readonly' };
  if (provider === 'google-drive')    return { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET', scope: 'https://www.googleapis.com/auth/drive.readonly' };
  return null;
}

function configured(env) {
  if (!env) return false;
  return !!(process.env[env.id] && process.env[env.secret]);
}

router.get('/:provider/status', (req, res) => {
  const provider = req.params.provider;
  if (!ALLOWED.has(provider)) return res.status(404).json({ error: `unknown provider: ${provider}` });
  const env = envFor(provider);
  res.json({
    provider,
    configured: configured(env),
    required_env: [env.id, env.secret],
    scope: env.scope,
  });
});

function notConfigured(res, provider, env) {
  return res.status(503).json({
    error: 'oauth_not_configured',
    provider,
    message: `Real ${provider} OAuth requires ${env.id} and ${env.secret} env vars + provider SDK wiring. ` +
             `Stub endpoint returns 503 until credentials are set.`,
    required_env: [env.id, env.secret],
    scope: env.scope,
  });
}

router.get('/:provider/authorize', (req, res) => {
  const provider = req.params.provider;
  if (!ALLOWED.has(provider)) return res.status(404).json({ error: `unknown provider: ${provider}` });
  const env = envFor(provider);
  if (!configured(env)) return notConfigured(res, provider, env);
  // Would normally 302 to Google consent screen — kept here as 501 so callers know
  // the wiring is intentional and the SDK call is missing.
  return res.status(501).json({ error: 'not_implemented', provider, note: 'SDK call to provider authorize URL pending' });
});

router.get('/:provider/callback', (req, res) => {
  const provider = req.params.provider;
  if (!ALLOWED.has(provider)) return res.status(404).json({ error: `unknown provider: ${provider}` });
  const env = envFor(provider);
  if (!configured(env)) return notConfigured(res, provider, env);
  return res.status(501).json({ error: 'not_implemented', provider, note: 'token exchange + store pending' });
});

router.post('/:provider/sync', (req, res) => {
  const provider = req.params.provider;
  if (!ALLOWED.has(provider)) return res.status(404).json({ error: `unknown provider: ${provider}` });
  const env = envFor(provider);
  if (!configured(env)) return notConfigured(res, provider, env);
  return res.status(501).json({ error: 'not_implemented', provider, note: 'ingestion worker pending' });
});

module.exports = router;
