// Custom Views for AIPersonalContextMCP
// 2 VIZ: context retrieval frequency chart + source x query-type heatmap
// 2 NON-VIZ: context profile PDF + retrieval rules editor (CRUD over source weights)
// Mounted at /api/custom-views BEFORE the 404 handler.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ---------------------------------------------------------------------------
// In-memory retrieval rules store (source weight per source_type/connector).
// Used to influence selective-disclosure scoring in /custom-views/retrieval-rules.
// ---------------------------------------------------------------------------
let _ruleId = 1;
const defaultRules = () => ([
  { id: _ruleId++, source_type: 'gmail',     connector_name: 'Gmail Sync',      weight: 70,  redact_pii: true,  notes: 'High-signal personal mail' },
  { id: _ruleId++, source_type: 'calendar',  connector_name: 'Google Calendar', weight: 55,  redact_pii: false, notes: 'Schedule context only' },
  { id: _ruleId++, source_type: 'notes',     connector_name: 'Apple Notes',     weight: 80,  redact_pii: true,  notes: 'Personal knowledge base' },
  { id: _ruleId++, source_type: 'files',     connector_name: 'iCloud Drive',    weight: 40,  redact_pii: true,  notes: 'Lower weight, broad surface' },
  { id: _ruleId++, source_type: 'contacts',  connector_name: 'Contacts',        weight: 60,  redact_pii: true,  notes: 'Identity-adjacent data' },
]);
let retrievalRules = defaultRules();

const QUERY_TYPES = ['lookup', 'summarize', 'recommend', 'extract', 'verify'];

// =====================================================================
// VIZ 1: GET /api/custom-views/retrieval-frequency
// Time-bucketed counts of context retrievals (from disclosure_log).
// Returns last 14 days, one bucket per day.
// =====================================================================
router.get('/retrieval-frequency', async (req, res) => {
  try {
    const days = Math.max(1, Math.min(60, parseInt(req.query.days || '14', 10)));
    const sql = `
      SELECT DATE(COALESCE(disclosed_at, created_at))::text AS day,
             COUNT(*)::int                                  AS retrievals,
             COUNT(DISTINCT app_name)::int                  AS apps
      FROM disclosure_log
      WHERE COALESCE(disclosed_at, created_at) >= NOW() - ($1::int || ' days')::interval
      GROUP BY DATE(COALESCE(disclosed_at, created_at))
      ORDER BY day ASC
    `;
    const r = await pool.query(sql, [days]);
    const buckets = r.rows.map((row) => ({
      day: row.day,
      retrievals: parseInt(row.retrievals || 0, 10),
      apps: parseInt(row.apps || 0, 10),
    }));

    // Fill missing days with zeros so charts render a continuous axis.
    const series = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = buckets.find((b) => b.day === key);
      series.push({ day: key, retrievals: found ? found.retrievals : 0, apps: found ? found.apps : 0 });
    }

    const total = series.reduce((s, b) => s + b.retrievals, 0);
    const peakBucket = series.reduce((p, b) => (b.retrievals > p.retrievals ? b : p), { retrievals: 0, day: null });

    res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      days,
      total_retrievals: total,
      avg_per_day: series.length ? +(total / series.length).toFixed(2) : 0,
      peak_day: peakBucket.day,
      peak_count: peakBucket.retrievals,
      series,
    });
  } catch (err) {
    console.error('retrieval-frequency error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// VIZ 2: GET /api/custom-views/source-query-heatmap
// Matrix: rows = data_sources.source_type, cols = synthetic query_type.
// Cell values are derived from real counts (data_sources + disclosure_log)
// distributed across query types using a deterministic hash so the heatmap
// is stable across reloads but reflects current data shape.
// =====================================================================
router.get('/source-query-heatmap', async (req, res) => {
  try {
    const dsRes = await pool.query(
      "SELECT source_type, COUNT(*)::int AS n FROM data_sources GROUP BY source_type ORDER BY source_type ASC"
    );
    const discRes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM disclosure_log"
    );
    const disclosureTotal = parseInt(discRes.rows[0]?.total || 0, 10);

    let sourceTypes = dsRes.rows.map((r) => r.source_type).filter(Boolean);
    if (sourceTypes.length === 0) {
      sourceTypes = ['gmail', 'calendar', 'notes', 'files', 'contacts'];
    }

    // Distribute counts deterministically across QUERY_TYPES.
    function hash(s) {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0);
    }

    const matrix = [];
    let maxCell = 0;
    for (const st of sourceTypes) {
      const base = dsRes.rows.find((r) => r.source_type === st);
      const sourceCount = (base ? base.n : 0) + Math.max(1, Math.floor(disclosureTotal / Math.max(sourceTypes.length, 1)));
      const cells = {};
      let rowTotal = 0;
      for (const qt of QUERY_TYPES) {
        const weight = ((hash(st + ':' + qt) % 9) + 1); // 1..9
        const cell = Math.round(sourceCount * weight / 10);
        cells[qt] = cell;
        rowTotal += cell;
        if (cell > maxCell) maxCell = cell;
      }
      matrix.push({
        source_type: st,
        cells,
        total: rowTotal,
      });
    }

    res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      query_types: QUERY_TYPES,
      source_types: sourceTypes,
      max_cell: maxCell,
      matrix,
    });
  } catch (err) {
    console.error('source-query-heatmap error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// NON-VIZ 1: POST /api/custom-views/context-profile-pdf
// Builds a printable Personal Context Profile summary suitable for
// "Save as PDF" from a browser print dialog. We return both a structured
// JSON payload and a plain-text rendering.
// Body: { app_name? }  - optional filter for app_consents/disclosure_log.
// =====================================================================
router.post('/context-profile-pdf', async (req, res) => {
  try {
    const { app_name = null } = req.body || {};

    const [connectors, dataSources, consents, recentDisclosures, redactionRules] = await Promise.all([
      pool.query("SELECT id, name, provider, status, last_synced FROM connectors ORDER BY id ASC LIMIT 25"),
      pool.query("SELECT id, connector_name, source_type, status, schema_name FROM data_sources ORDER BY id ASC LIMIT 25"),
      app_name
        ? pool.query("SELECT id, app_name, scope, allowed_fields, status, expires_at FROM app_consents WHERE app_name ILIKE $1 ORDER BY id ASC LIMIT 25", [`%${app_name}%`])
        : pool.query("SELECT id, app_name, scope, allowed_fields, status, expires_at FROM app_consents ORDER BY id DESC LIMIT 25"),
      app_name
        ? pool.query("SELECT id, app_name, fields_disclosed, purpose, disclosed_at FROM disclosure_log WHERE app_name ILIKE $1 ORDER BY COALESCE(disclosed_at, created_at) DESC LIMIT 10", [`%${app_name}%`])
        : pool.query("SELECT id, app_name, fields_disclosed, purpose, disclosed_at FROM disclosure_log ORDER BY COALESCE(disclosed_at, created_at) DESC LIMIT 10"),
      pool.query("SELECT id, field, rule, reason, status FROM redaction_rules ORDER BY id ASC LIMIT 25"),
    ]);

    const lines = [];
    lines.push('=================================================');
    lines.push('      PERSONAL CONTEXT MCP — CONTEXT PROFILE     ');
    lines.push('=================================================');
    lines.push(`Generated:        ${new Date().toISOString()}`);
    lines.push(`Scope:            ${app_name ? 'app=' + app_name : 'full profile'}`);
    lines.push(`Connectors:       ${connectors.rows.length}`);
    lines.push(`Data sources:     ${dataSources.rows.length}`);
    lines.push(`App consents:     ${consents.rows.length}`);
    lines.push(`Redaction rules:  ${redactionRules.rows.length}`);
    lines.push('');

    lines.push('--- Connectors ---');
    if (!connectors.rows.length) lines.push('  (none configured)');
    connectors.rows.forEach((c, i) =>
      lines.push(`  ${i + 1}. ${c.name} [${c.provider || '-'}] - ${c.status || '-'} (synced ${c.last_synced || 'never'})`)
    );
    lines.push('');

    lines.push('--- Data Sources ---');
    if (!dataSources.rows.length) lines.push('  (none configured)');
    dataSources.rows.forEach((d, i) =>
      lines.push(`  ${i + 1}. ${d.connector_name} / ${d.source_type} schema=${d.schema_name || '-'} [${d.status || '-'}]`)
    );
    lines.push('');

    lines.push('--- App Consents ---');
    if (!consents.rows.length) lines.push('  (none on file)');
    consents.rows.forEach((c, i) =>
      lines.push(`  ${i + 1}. ${c.app_name} scope=${c.scope || '-'} fields=${c.allowed_fields || '-'} [${c.status || '-'}]`)
    );
    lines.push('');

    lines.push('--- Recent Disclosures ---');
    if (!recentDisclosures.rows.length) lines.push('  (none on file)');
    recentDisclosures.rows.forEach((d, i) =>
      lines.push(`  ${i + 1}. [${(d.disclosed_at || '').toString().slice(0, 10)}] ${d.app_name}: ${d.fields_disclosed} (${d.purpose || '-'})`)
    );
    lines.push('');

    lines.push('--- Redaction Rules ---');
    if (!redactionRules.rows.length) lines.push('  (none defined)');
    redactionRules.rows.forEach((r, i) =>
      lines.push(`  ${i + 1}. field=${r.field} rule=${(r.rule || '').toString().slice(0, 60)} [${r.status || '-'}]`)
    );
    lines.push('');
    lines.push('====== END OF CONTEXT PROFILE ===================');

    const text = lines.join('\n');

    res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      scope: app_name ? { app_name } : { full_profile: true },
      counts: {
        connectors: connectors.rows.length,
        data_sources: dataSources.rows.length,
        consents: consents.rows.length,
        recent_disclosures: recentDisclosures.rows.length,
        redaction_rules: redactionRules.rows.length,
      },
      connectors: connectors.rows,
      data_sources: dataSources.rows,
      consents: consents.rows,
      recent_disclosures: recentDisclosures.rows,
      redaction_rules: redactionRules.rows,
      text,
      filename: `context_profile_${(app_name || 'full').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`,
    });
  } catch (err) {
    console.error('context-profile-pdf error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// NON-VIZ 2: Retrieval Rules Editor — CRUD over source weights.
//   GET  /api/custom-views/retrieval-rules
//   POST /api/custom-views/retrieval-rules  { op: create|update|delete|reset, rule }
// =====================================================================
router.get('/retrieval-rules', async (req, res) => {
  try {
    // Surface known connectors/source-types to the editor for dropdowns.
    let connectors = [];
    let sourceTypes = [];
    try {
      const c = await pool.query("SELECT DISTINCT name FROM connectors WHERE name IS NOT NULL ORDER BY name ASC");
      connectors = c.rows.map((r) => r.name);
    } catch (_) {}
    try {
      const s = await pool.query("SELECT DISTINCT source_type FROM data_sources WHERE source_type IS NOT NULL ORDER BY source_type ASC");
      sourceTypes = s.rows.map((r) => r.source_type);
    } catch (_) {}

    res.json({
      ok: true,
      count: retrievalRules.length,
      rules: retrievalRules,
      hints: {
        connector_options: connectors,
        source_type_options: sourceTypes,
      },
    });
  } catch (err) {
    console.error('retrieval-rules GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/retrieval-rules', (req, res) => {
  try {
    const { op = 'create', rule } = req.body || {};

    if (op === 'reset') {
      _ruleId = 1;
      retrievalRules = defaultRules();
      return res.json({ ok: true, op, rules: retrievalRules });
    }

    if (op === 'delete') {
      if (!rule || rule.id == null) return res.status(400).json({ error: 'rule.id required' });
      const before = retrievalRules.length;
      retrievalRules = retrievalRules.filter((r) => r.id !== rule.id);
      return res.json({ ok: true, op, removed: before - retrievalRules.length, rules: retrievalRules });
    }

    if (op === 'update') {
      if (!rule || rule.id == null) return res.status(400).json({ error: 'rule.id required' });
      const idx = retrievalRules.findIndex((r) => r.id === rule.id);
      if (idx === -1) return res.status(404).json({ error: 'rule not found' });
      const merged = {
        ...retrievalRules[idx],
        ...rule,
        id: retrievalRules[idx].id,
        weight: rule.weight != null ? Math.max(0, Math.min(100, Number(rule.weight))) : retrievalRules[idx].weight,
        redact_pii: rule.redact_pii != null ? !!rule.redact_pii : retrievalRules[idx].redact_pii,
      };
      retrievalRules[idx] = merged;
      return res.json({ ok: true, op, rule: merged, rules: retrievalRules });
    }

    // default: create
    const created = {
      id: _ruleId++,
      source_type: (rule && rule.source_type) || 'notes',
      connector_name: (rule && rule.connector_name) || 'Custom',
      weight: rule && rule.weight != null ? Math.max(0, Math.min(100, Number(rule.weight))) : 50,
      redact_pii: !!(rule && rule.redact_pii),
      notes: (rule && rule.notes) || '',
    };
    retrievalRules.push(created);
    return res.json({ ok: true, op: 'create', rule: created, rules: retrievalRules });
  } catch (err) {
    console.error('retrieval-rules POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
