// Apply pass 7 (full backlog implementation)
// Differential-privacy budget tracker.
//   GET    /api/dp-budgets               — list all budgets
//   POST   /api/dp-budgets               — create budget {app_name, scope, epsilon_total, notes}
//   PUT    /api/dp-budgets/:id           — update {epsilon_total, scope, notes, status}
//   DELETE /api/dp-budgets/:id           — remove
//   POST   /api/dp-budgets/:app/spend    — decrement remaining ε
//                                          body: { amount, reason?, scope?, disclosure_id? }
//                                          Returns 402 when budget exhausted (enforces exhaustion).
//   GET    /api/dp-budgets/:app/ledger   — recent spends for an app

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { fireWebhook } = require('../services/webhooks');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM dp_budgets ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireWriter, async (req, res) => {
  try {
    const { app_name, scope = null, epsilon_total = 1.0, notes = null } = req.body || {};
    if (!app_name) return res.status(400).json({ error: 'app_name required' });
    const eps = Math.max(0, Number(epsilon_total));
    const r = await pool.query(
      `INSERT INTO dp_budgets (app_name, scope, epsilon_total, epsilon_spent, epsilon_remaining, status, notes)
       VALUES ($1,$2,$3,0,$3,'active',$4) RETURNING *`,
      [app_name, scope, eps, notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireWriter, async (req, res) => {
  try {
    const { epsilon_total, scope, notes, status } = req.body || {};
    const cur = await pool.query('SELECT * FROM dp_budgets WHERE id=$1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'not found' });
    const row = cur.rows[0];
    const newTotal = epsilon_total != null ? Math.max(0, Number(epsilon_total)) : Number(row.epsilon_total);
    const spent = Number(row.epsilon_spent || 0);
    const remaining = Math.max(0, newTotal - spent);
    const r = await pool.query(
      `UPDATE dp_budgets
       SET epsilon_total=$1, epsilon_remaining=$2, scope=COALESCE($3,scope),
           notes=COALESCE($4,notes), status=COALESCE($5,status), updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [newTotal, remaining, scope ?? null, notes ?? null, status ?? null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireWriter, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM dp_budgets WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ message: 'deleted', row: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Spend epsilon — middleware-style decrement called from app code or on disclosure insert.
router.post('/:app/spend', requireWriter, async (req, res) => {
  try {
    const app_name = req.params.app;
    const { amount, reason = null, scope = null, disclosure_id = null } = req.body || {};
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'amount must be positive number' });

    // Find matching budget (prefer scoped match, else default app budget).
    let bq;
    if (scope) {
      bq = await pool.query(
        'SELECT * FROM dp_budgets WHERE app_name=$1 AND scope=$2 AND status=\'active\' ORDER BY id ASC LIMIT 1',
        [app_name, scope]
      );
    }
    if (!bq || !bq.rows.length) {
      bq = await pool.query(
        'SELECT * FROM dp_budgets WHERE app_name=$1 AND status=\'active\' ORDER BY id ASC LIMIT 1',
        [app_name]
      );
    }
    if (!bq.rows.length) return res.status(404).json({ error: `no active budget for app=${app_name}` });

    const b = bq.rows[0];
    const remaining = Number(b.epsilon_remaining || 0);
    if (amt > remaining) {
      // Enforce exhaustion — 402 Payment Required signals "budget exceeded".
      return res.status(402).json({
        error: 'dp_budget_exhausted',
        app_name,
        budget_id: b.id,
        remaining,
        requested: amt,
      });
    }

    const newSpent = Number(b.epsilon_spent || 0) + amt;
    const newRemaining = Number(b.epsilon_total || 0) - newSpent;
    const newStatus = newRemaining <= 0 ? 'exhausted' : 'active';
    const updated = await pool.query(
      `UPDATE dp_budgets
       SET epsilon_spent=$1, epsilon_remaining=$2, last_spent_at=NOW(), status=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [newSpent, newRemaining, newStatus, b.id]
    );

    await pool.query(
      `INSERT INTO dp_budget_spends (budget_id, app_name, amount, reason, disclosure_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [b.id, app_name, amt, reason, disclosure_id]
    );

    if (newStatus === 'exhausted') {
      fireWebhook('dp_budget.exhausted', {
        app_name, budget_id: b.id, epsilon_total: b.epsilon_total
      }).catch(() => {});
    }

    res.json({
      ok: true,
      app_name,
      budget: updated.rows[0],
      spent: amt,
      remaining: newRemaining,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:app/ledger', async (req, res) => {
  try {
    const app_name = req.params.app;
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
    const r = await pool.query(
      `SELECT id, budget_id, app_name, amount, reason, disclosure_id, created_at
       FROM dp_budget_spends WHERE app_name=$1 ORDER BY created_at DESC LIMIT $2`,
      [app_name, limit]
    );
    res.json({ app_name, count: r.rows.length, spends: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
