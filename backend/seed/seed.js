const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function main() {
  const migDir = path.join(__dirname, '..', 'migrations');
  for (const f of fs.readdirSync(migDir).filter((x) => x.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
    try { await pool.query(sql); console.log(`[seed] applied ${f}`); }
    catch (e) { console.warn(`[seed] ${f} warn: ${e.message}`); }
  }
  await pool.query(
    "INSERT INTO users (email, password, name, role) VALUES ('admin@personal-context-mcp.local','secure123','Admin','commander') ON CONFLICT (email) DO NOTHING"
  );
  console.log('[seed] demo user ready');

  // connectors
  for (const row of [{"name":"Apple Health","provider":"apple","status":"connected","last_synced":null},{"name":"Google Calendar","provider":"google","status":"connected","last_synced":null},{"name":"Apple Mail","provider":"apple","status":"connected","last_synced":null},{"name":"Plaid","provider":"plaid","status":"disconnected","last_synced":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO connectors (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // data_sources
  for (const row of [{"connector_name":"Apple Health","source_type":"metrics","status":"active","schema_name":"health.metrics.v1"},{"connector_name":"Google Calendar","source_type":"events","status":"active","schema_name":"calendar.events.v1"},{"connector_name":"Apple Mail","source_type":"messages","status":"active","schema_name":"mail.messages.v1"}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO data_sources (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // app_consents
  for (const row of [{"app_name":"United Airlines","scope":"travel","allowed_fields":"seat_pref, meal_pref, frequent_flyer","status":"active","expires_at":null},{"app_name":"Apple Fitness","scope":"health.metrics","allowed_fields":"steps, heart_rate, vo2_max","status":"active","expires_at":null},{"app_name":"Tax Filing","scope":"finance","allowed_fields":"w2, 1099, deductions","status":"expired","expires_at":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO app_consents (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // disclosure_log
  for (const row of [{"app_name":"United Airlines","fields_disclosed":"seat_pref","purpose":"pre-fill booking","disclosed_at":null},{"app_name":"Apple Fitness","fields_disclosed":"steps, heart_rate","purpose":"weekly summary","disclosed_at":null},{"app_name":"Tax Filing","fields_disclosed":"w2","purpose":"2025 tax return","disclosed_at":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO disclosure_log (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // mcp_clients
  for (const row of [{"name":"Claude Desktop","public_key":"ed25519:7a3b...","status":"active","last_used":null},{"name":"United Airlines App","public_key":"ed25519:b21c...","status":"active","last_used":null},{"name":"Old App","public_key":"ed25519:0f00...","status":"revoked","last_used":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO mcp_clients (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // schemas
  for (const row of [{"name":"health.metrics.v1","fields_summary":"steps, hr, vo2_max, sleep","version":"v1","status":"active"},{"name":"calendar.events.v1","fields_summary":"title, start, end, attendees","version":"v1","status":"active"},{"name":"mail.messages.v1","fields_summary":"from, subject, received_at","version":"v1","status":"active"}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO schemas (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // redaction_rules
  for (const row of [{"field":"medical_history","rule":"redact for non-health apps","reason":"PHI","status":"active"},{"field":"home_address","rule":"redact street number","reason":"PII","status":"active"},{"field":"browsing_history","rule":"never share","reason":"sensitive","status":"active"}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO redaction_rules (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  console.log('[seed] domain rows seeded');
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
