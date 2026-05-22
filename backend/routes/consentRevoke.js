// Apply pass 7 (full backlog implementation)
// POST /api/app-consents/:id/revoke
// Single endpoint that:
//   (a) flips app_consents.status -> 'revoked'
//   (b) collects previously-disclosed fields from disclosure_log
//   (c) creates a forget_requests row with those fields
//   (d) fires consent.revoked + forget.requested webhooks
//   (e) logs forget action into disclosure_log (purpose='consent_revoked')
// Mounted at /api/app-consents (extending the CRUD router with a sibling route).

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { fireWebhook } = require('../services/webhooks');

router.post('/:id/revoke', requireWriter, async (req, res) => {
  try {
    const id = req.params.id;
    const { reason = 'user_revoked' } = req.body || {};

    const cq = await pool.query('SELECT * FROM app_consents WHERE id=$1', [id]);
    if (!cq.rows.length) return res.status(404).json({ error: 'consent not found' });
    const consent = cq.rows[0];

    // (a) flip status
    const upd = await pool.query(
      `UPDATE app_consents SET status='revoked', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id]
    );

    // (b) collect previously-disclosed fields for this app
    const disclosures = await pool.query(
      `SELECT id, fields_disclosed, purpose, disclosed_at
       FROM disclosure_log WHERE app_name=$1 ORDER BY id DESC`,
      [consent.app_name]
    );
    const fieldSet = new Set();
    for (const d of disclosures.rows) {
      String(d.fields_disclosed || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean).forEach((f) => fieldSet.add(f));
    }
    String(consent.allowed_fields || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean).forEach((f) => fieldSet.add(f));
    const fieldsToPurge = Array.from(fieldSet).join(', ');

    // (c) create forget_requests row
    const fr = await pool.query(
      `INSERT INTO forget_requests (app_name, consent_id, fields_to_purge, reason, status, requested_by, webhook_fired)
       VALUES ($1,$2,$3,$4,'pending',$5,TRUE) RETURNING *`,
      [consent.app_name, consent.id, fieldsToPurge, reason, req.user?.email || 'unknown']
    );

    // (e) log forget action into disclosure_log
    let forgetLog = null;
    try {
      const dl = await pool.query(
        `INSERT INTO disclosure_log (app_name, fields_disclosed, purpose, disclosed_at)
         VALUES ($1,$2,$3,NOW()) RETURNING *`,
        [consent.app_name, fieldsToPurge || '(none)', `consent_revoked:${reason}`]
      );
      forgetLog = dl.rows[0];
    } catch (e) {
      console.warn('[consent-revoke] disclosure log insert failed:', e.message);
    }

    // (d) fire webhooks (fan-out to downstream apps)
    const consentPayload = { event_kind: 'consent.revoked', consent: upd.rows[0], reason };
    const forgetPayload = { event_kind: 'forget.requested', forget_request: fr.rows[0] };
    Promise.allSettled([
      fireWebhook('consent.revoked', consentPayload),
      fireWebhook('forget.requested', forgetPayload),
    ]).catch(() => {});

    res.json({
      ok: true,
      consent: upd.rows[0],
      forget_request: fr.rows[0],
      disclosure_log_entry: forgetLog,
      fields_to_purge: fieldsToPurge,
      previously_disclosed_count: disclosures.rows.length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
