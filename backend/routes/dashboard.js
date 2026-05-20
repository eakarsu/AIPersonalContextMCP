const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [connectors_q, data_sources_q, app_consents_q, disclosure_log_q, mcp_clients_q, schemas_q, redaction_rules_q] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM connectors"),
      pool.query("SELECT COUNT(*) AS total FROM data_sources"),
      pool.query("SELECT COUNT(*) AS total FROM app_consents"),
      pool.query("SELECT COUNT(*) AS total FROM disclosure_log"),
      pool.query("SELECT COUNT(*) AS total FROM mcp_clients"),
      pool.query("SELECT COUNT(*) AS total FROM schemas"),
      pool.query("SELECT COUNT(*) AS total FROM redaction_rules")
    ]);
    res.json({
      connectors: connectors_q.rows[0],
      data_sources: data_sources_q.rows[0],
      app_consents: app_consents_q.rows[0],
      disclosure_log: disclosure_log_q.rows[0],
      mcp_clients: mcp_clients_q.rows[0],
      schemas: schemas_q.rows[0],
      redaction_rules: redaction_rules_q.rows[0]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
