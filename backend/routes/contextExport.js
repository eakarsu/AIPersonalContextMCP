// Apply pass 7 (full backlog implementation)
// POST /api/export/context-bundle  — signed JSON bundle of user's consents + disclosures
//                                    + schemas + redaction rules. Used for GDPR portability.
// GET  /api/export/context-bundle  — convenience GET equivalent.
//
// Bundle is signed with HMAC-SHA256 using JWT_SECRET so downstream verifiers can
// confirm authenticity without DB access.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

async function buildBundle(filter) {
  const where = filter && filter.app_name ? `WHERE app_name ILIKE $1` : '';
  const params = filter && filter.app_name ? [`%${filter.app_name}%`] : [];

  const [consents, disclosures, schemas, redactionRules, forget, dpBudgets] = await Promise.all([
    pool.query(`SELECT * FROM app_consents ${where} ORDER BY id DESC`, params),
    pool.query(`SELECT * FROM disclosure_log ${where} ORDER BY id DESC LIMIT 1000`, params),
    pool.query(`SELECT * FROM schemas ORDER BY id DESC`),
    pool.query(`SELECT * FROM redaction_rules ORDER BY id DESC`),
    pool.query(`SELECT * FROM forget_requests ${where} ORDER BY id DESC`, params).catch(() => ({ rows: [] })),
    pool.query(`SELECT * FROM dp_budgets ${where} ORDER BY id DESC`, params).catch(() => ({ rows: [] })),
  ]);

  const payload = {
    generated_at: new Date().toISOString(),
    bundle_version: '1.0',
    scope: filter && filter.app_name ? { app_name: filter.app_name } : { full_export: true },
    counts: {
      consents: consents.rows.length,
      disclosures: disclosures.rows.length,
      schemas: schemas.rows.length,
      redaction_rules: redactionRules.rows.length,
      forget_requests: forget.rows.length,
      dp_budgets: dpBudgets.rows.length,
    },
    consents: consents.rows,
    disclosures: disclosures.rows,
    schemas: schemas.rows,
    redaction_rules: redactionRules.rows,
    forget_requests: forget.rows,
    dp_budgets: dpBudgets.rows,
  };

  const canonical = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(canonical).digest('hex');
  return { payload, signature, algorithm: 'HMAC-SHA256' };
}

router.post('/context-bundle', async (req, res) => {
  try {
    const bundle = await buildBundle(req.body || {});
    res.json({ ok: true, ...bundle });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/context-bundle', async (req, res) => {
  try {
    const filter = req.query.app_name ? { app_name: req.query.app_name } : null;
    const bundle = await buildBundle(filter);
    res.json({ ok: true, ...bundle });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
