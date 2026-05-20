const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ai = require('../services/ai');

const SCHEMAS = {
  'answer-from-context': `{"requesting_app":string,"answer":string,"sources_consulted":[string],"disclosed_fields":[string],"withheld_fields":[string],"consent_required":boolean,"summary":string}`,
  'consent-policy-check': `{"decision":"allow"|"redact"|"deny","field_policies":[{"field":string,"policy":"allow"|"redact"|"deny","rationale":string}],"user_prompt_required":boolean,"expires_after_seconds":number,"summary":string}`,
  'audit-log': `{"range":string,"disclosures":[{"when":string,"requesting_app":string,"fields":[string],"purpose":string}],"high_risk_disclosures":[string],"recommendations":[string],"summary":string}`,
  'redaction-suggester': `{"redaction_plan":[{"original":string,"redacted":string,"rationale":string}],"residual_risk":"low"|"medium"|"high","summary":string}`,
  'privacy-risk-score': `{"risk_score":number,"risk_drivers":[{"driver":string,"weight":number}],"recommendation":"allow"|"limit"|"deny","alternative_scopes":[string],"summary":string}`,
  'intent-classifier': `{"intent":string,"confidence":number,"required_scopes":[string],"safe_to_auto_answer":boolean,"summary":string}`,
  'schema-extractor': `{"schema_name":string,"fields":[{"name":string,"type":string,"required":boolean,"example":string}],"sensitivity_per_field":[{"field":string,"class":string}],"summary":string}`
};

const SAMPLES = {
  'answer-from-context': [
    { label: 'Seat preference', values: {"requesting_app":"United Airlines booking","question":"What is the user's preferred seat?","allowed_sources":"travel_prefs, calendar"} },
    { label: 'Workout schedule', values: {"requesting_app":"Apple Fitness","question":"What workouts is the user doing this week?","allowed_sources":"calendar, health.metrics"} },
    { label: 'Tax docs ready', values: {"requesting_app":"Tax Filing","question":"Do I have all 2025 W2s and 1099s?","allowed_sources":"finance"} }
  ],
  'consent-policy-check': [
    { label: 'Health app expanding scope', values: {"requesting_app":"Health insurance app","requested_fields":"medical_history, prescriptions, exercise_log"} },
    { label: 'Booking minimal', values: {"requesting_app":"United Airlines","requested_fields":"seat_pref, meal_pref"} },
    { label: 'Aggressive ad app', values: {"requesting_app":"Ad Network X","requested_fields":"browsing_history, contacts, location"} }
  ],
  'audit-log': [
    { label: 'Last 30 days', values: {"time_range":"last 30 days"} },
    { label: 'Last week', values: {"time_range":"last 7 days"} },
    { label: 'Year to date', values: {"time_range":"year to date"} }
  ],
  'redaction-suggester': [
    { label: 'Email with SSN', values: {"snippet":"My SSN is 123-45-6789. Please file.","target_app":"Tax Filing"} },
    { label: 'Calendar with med name', values: {"snippet":"Wegovy injection — 9am","target_app":"Apple Fitness"} },
    { label: 'Contact with phone', values: {"snippet":"Dr Smith 415-555-1212","target_app":"Generic App"} }
  ],
  'privacy-risk-score': [
    { label: 'Health app full scope', values: {"app_name":"Health insurance app","requested_scopes":"medical_history,prescriptions,location,contacts"} },
    { label: 'Airline minimal', values: {"app_name":"United Airlines","requested_scopes":"seat_pref,meal_pref"} },
    { label: 'Free ad-heavy app', values: {"app_name":"Free Photo Editor","requested_scopes":"photos,contacts,location,browsing_history"} }
  ],
  'intent-classifier': [
    { label: 'Travel question', values: {"app_query":"When is the user next traveling?"} },
    { label: 'Workout history', values: {"app_query":"How many workouts last month?"} },
    { label: 'Financial reach', values: {"app_query":"What is the user net worth?"} }
  ],
  'schema-extractor': [
    { label: 'Bank CSV', values: {"sample_data":"date,merchant,amount\\n2026-05-01,Acme,42.18","source_hint":"bank tx"} },
    { label: 'Fitness JSON', values: {"sample_data":"{\"date\":\"2026-05-15\",\"steps\":8421}","source_hint":"fitness"} },
    { label: 'vCard', values: {"sample_data":"FN:Jane\\nEMAIL:j@x.com","source_hint":"contact"} }
  ]
};

async function record(feature, input, output) {
  try {
    await pool.query('INSERT INTO ai_results (feature, input, output) VALUES ($1, $2, $3)',
      [feature, input || {}, output || {}]);
  } catch (e) { console.warn('[ai] record failed:', e.message); }
}

router.get('/samples', (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    if (!feature) return res.json({ features: Object.keys(SAMPLES) });
    const samples = SAMPLES[feature];
    if (!samples) return res.status(404).json({ error: `unknown feature: ${feature}` });
    res.json({ feature, samples });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/history', async (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 200);
    const r = feature
      ? await pool.query('SELECT id, feature, input, output, created_at FROM ai_results WHERE feature=$1 ORDER BY created_at DESC LIMIT $2', [feature, limit])
      : await pool.query('SELECT id, feature, input, output, created_at FROM ai_results ORDER BY created_at DESC LIMIT $1', [limit]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/answer-from-context', async (req, res) => {
  try {
    const result = await ai.runFeature('answer-from-context', SCHEMAS['answer-from-context'], req.body || {});
    await record('answer-from-context', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/consent-policy-check', async (req, res) => {
  try {
    const result = await ai.runFeature('consent-policy-check', SCHEMAS['consent-policy-check'], req.body || {});
    await record('consent-policy-check', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/audit-log', async (req, res) => {
  try {
    const result = await ai.runFeature('audit-log', SCHEMAS['audit-log'], req.body || {});
    await record('audit-log', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/redaction-suggester', async (req, res) => {
  try {
    const result = await ai.runFeature('redaction-suggester', SCHEMAS['redaction-suggester'], req.body || {});
    await record('redaction-suggester', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/privacy-risk-score', async (req, res) => {
  try {
    const result = await ai.runFeature('privacy-risk-score', SCHEMAS['privacy-risk-score'], req.body || {});
    await record('privacy-risk-score', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/intent-classifier', async (req, res) => {
  try {
    const result = await ai.runFeature('intent-classifier', SCHEMAS['intent-classifier'], req.body || {});
    await record('intent-classifier', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/schema-extractor', async (req, res) => {
  try {
    const result = await ai.runFeature('schema-extractor', SCHEMAS['schema-extractor'], req.body || {});
    await record('schema-extractor', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
