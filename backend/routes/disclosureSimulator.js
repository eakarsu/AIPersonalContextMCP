const express = require('express');
const router = express.Router();

router.post('/simulate', (req, res) => {
  const request = String(req.body?.request || 'Summarize my recent health, calendar, and finance context for a travel booking assistant.');
  const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes : ['calendar.read', 'health.read', 'finance.read'];
  const appTrust = Number(req.body?.app_trust ?? 0.55);
  const sensitive = scopes.filter((scope) => /health|finance|location|messages|contacts/i.test(scope));
  const score = Math.min(100, Math.round(sensitive.length * 24 + scopes.length * 6 + (1 - appTrust) * 30));
  res.json({
    request,
    score,
    tier: score >= 75 ? 'deny_or_manual_approval' : score >= 50 ? 'redact_and_confirm' : 'allow_minimized',
    allowedScopes: scopes.filter((scope) => !sensitive.includes(scope)),
    redactedScopes: sensitive,
    disclosurePlan: score >= 50
      ? 'Return a minimized context bundle, mask sensitive fields, and require explicit per-app consent.'
      : 'Return scoped context with disclosure log entry.',
  });
});

module.exports = router;
