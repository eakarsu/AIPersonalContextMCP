// Apply pass 7 (full backlog implementation)
// Recall-and-forget engine.
//   GET    /api/forget-requests              — list all forget requests
//   GET    /api/forget-requests/:id          — single
//   POST   /api/forget-requests              — manual creation
//   POST   /api/forget-requests/:id/complete — mark complete, fire forget.completed webhook
//   POST   /api/app-consents/:id/revoke      — (a) revoke consent, (b) collect previously-disclosed
//                                              fields, (c) create forget_request, (d) fire
//                                              consent.revoked + forget.requested webhooks,
//                                              (e) log forget action into disclosure_log.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { fireWebhook } = require('../services/webhooks');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM forget_requests ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM forget_requests WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireWriter, async (req, res) => {
  try {
    const { app_name, consent_id = null, fields_to_purge = null, reason = null } = req.body || {};
    if (!app_name) return res.status(400).json({ error: 'app_name required' });
    const r = await pool.query(
      `INSERT INTO forget_requests (app_name, consent_id, fields_to_purge, reason, status, requested_by)
       VALUES ($1,$2,$3,$4,'pending',$5) RETURNING *`,
      [app_name, consent_id, fields_to_purge, reason, req.user?.email || 'unknown']
    );
    fireWebhook('forget.requested', { row: r.rows[0] }).catch(() => {});
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/complete', requireWriter, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE forget_requests
       SET status='completed', completed_at=NOW(), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    fireWebhook('forget.completed', { row: r.rows[0] }).catch(() => {});
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
