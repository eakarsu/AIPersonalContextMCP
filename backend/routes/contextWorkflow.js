const express = require('express');
const pool = require('../config/database');
const { validateSource, validateTransition } = require('../domain/contextPolicy');

const router = express.Router();
const tenantFor = (user) => String(user.tenant_id || user.tenantId || user.id);
const actorFor = (user) => String(user.id);

router.post('/sources', async (req, res) => {
  const client = await pool.connect();
  try {
    const input = validateSource(req.body || {});
    const { object_uri, idempotency_key, correlation_id } = req.body || {};
    if (!object_uri || !idempotency_key || !correlation_id) throw new Error('object_uri, idempotency_key, and correlation_id are required');
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    await client.query('BEGIN');
    let result = await client.query(
      `INSERT INTO context_sources
       (tenant_id, source_ref, object_version, object_uri, checksum, permission_version, captured_at, created_by, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING *`,
      [tenantId, input.source_ref, input.object_version, object_uri, input.checksum, input.permission_version, input.captured_at, actorId, idempotency_key]
    );
    const inserted = result.rows.length === 1;
    if (!inserted) result = await client.query('SELECT * FROM context_sources WHERE tenant_id=$1 AND idempotency_key=$2', [tenantId, idempotency_key]);
    const source = result.rows[0];
    await client.query(
      `INSERT INTO context_workflow_audit
       (tenant_id, source_id, actor_id, action, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'created','received',$4,$5)
       ON CONFLICT (tenant_id, correlation_id) DO NOTHING`,
      [tenantId, source.id, actorId, JSON.stringify({ source_ref: source.source_ref, object_version: source.object_version }), correlation_id]
    );
    await client.query('COMMIT');
    res.status(inserted ? 201 : 200).json(source);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.code === '23505' ? 409 : 400).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/sources/:sourceRef/transition', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    const { object_version, to_stage, expected_version, correlation_id, evidence = {} } = req.body || {};
    if (!object_version || !to_stage || !Number.isInteger(expected_version) || !correlation_id) throw new Error('object_version, to_stage, integer expected_version, and correlation_id are required');
    await client.query('BEGIN');
    const priorAudit = await client.query('SELECT source_id FROM context_workflow_audit WHERE tenant_id=$1 AND correlation_id=$2', [tenantId, correlation_id]);
    if (priorAudit.rows.length) {
      const existing = await client.query('SELECT * FROM context_sources WHERE id=$1', [priorAudit.rows[0].source_id]);
      await client.query('COMMIT');
      return res.json(existing.rows[0]);
    }
    const current = await client.query('SELECT * FROM context_sources WHERE tenant_id=$1 AND source_ref=$2 AND object_version=$3 FOR UPDATE', [tenantId, req.params.sourceRef, object_version]);
    if (!current.rows.length) throw Object.assign(new Error('context source not found'), { status: 404 });
    const source = current.rows[0];
    if (source.version !== expected_version) throw Object.assign(new Error('stale workflow version'), { status: 409 });
    validateTransition(source.stage, to_stage, { ...evidence, role: req.user.role, actorId, createdBy: source.created_by });
    const updated = await client.query('UPDATE context_sources SET stage=$1, version=version+1, updated_at=NOW() WHERE id=$2 RETURNING *', [to_stage, source.id]);
    await client.query(
      `INSERT INTO context_workflow_audit
       (tenant_id, source_id, actor_id, action, from_stage, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'transition',$4,$5,$6,$7)`,
      [tenantId, source.id, actorId, source.stage, to_stage, JSON.stringify(evidence), correlation_id]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || 400).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
