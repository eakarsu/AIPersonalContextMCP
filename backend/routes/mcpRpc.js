// Apply pass 7 (full backlog implementation)
// Live MCP JSON-RPC surface (HTTP transport, single route).
//   POST /api/mcp/rpc           — handles MCP JSON-RPC 2.0 methods
//                                  - initialize
//                                  - tools/list
//                                  - tools/call
//   GET  /api/mcp/rpc/manifest  — convenience GET: returns the same manifest tools/list emits.
//
// The route dispatches `tools/call` to existing in-process routes by re-using
// the route handlers via internal axios-free HTTP call (we avoid new deps by
// invoking the handlers through pool directly for read-only tools, and via
// loopback to express for write tools — but to keep this dependency-free we
// implement every tool inline against the same DB layer).

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ai = require('../services/ai');

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_INFO = { name: 'personal-context-mcp', version: '1.0.0' };

// ---------- Tool registry ----------
const TOOLS = [
  {
    name: 'list_consents',
    description: 'List all app consents (apps allowed to read user context).',
    inputSchema: { type: 'object', properties: { app_name: { type: 'string' } } },
  },
  {
    name: 'list_disclosures',
    description: 'List recent disclosure log entries.',
    inputSchema: {
      type: 'object',
      properties: {
        app_name: { type: 'string' },
        limit: { type: 'integer', default: 50 },
      },
    },
  },
  {
    name: 'list_connectors',
    description: 'List configured data connectors (Gmail, Calendar, etc).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_redaction_rules',
    description: 'List PII redaction rules currently in force.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_schemas',
    description: 'List user data schemas.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'check_dp_budget',
    description: 'Check remaining differential-privacy epsilon budget for an app.',
    inputSchema: {
      type: 'object',
      required: ['app_name'],
      properties: { app_name: { type: 'string' } },
    },
  },
  {
    name: 'ai_answer_from_context',
    description: 'Ask the personal-context layer a question on behalf of a requesting app.',
    inputSchema: {
      type: 'object',
      required: ['requesting_app', 'question'],
      properties: {
        requesting_app: { type: 'string' },
        question: { type: 'string' },
        allowed_sources: { type: 'string' },
      },
    },
  },
  {
    name: 'ai_redaction_suggester',
    description: 'Suggest redactions for a snippet before disclosing to an app.',
    inputSchema: {
      type: 'object',
      required: ['snippet'],
      properties: {
        snippet: { type: 'string' },
        target_app: { type: 'string' },
      },
    },
  },
  {
    name: 'ai_relevance_scorer',
    description: 'Score candidate context shards by relevance to a query.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        candidate_shards: { type: 'string' },
      },
    },
  },
  {
    name: 'ai_context_summarizer',
    description: 'Summarize raw context into an assistant-ready brief.',
    inputSchema: {
      type: 'object',
      required: ['raw_context'],
      properties: {
        context_kind: { type: 'string' },
        raw_context: { type: 'string' },
        target_app: { type: 'string' },
      },
    },
  },
];

const AI_SCHEMAS = {
  'ai_answer_from_context': { slug: 'answer-from-context',
    schema: `{"requesting_app":string,"answer":string,"sources_consulted":[string],"disclosed_fields":[string],"withheld_fields":[string],"consent_required":boolean,"summary":string}` },
  'ai_redaction_suggester': { slug: 'redaction-suggester',
    schema: `{"redaction_plan":[{"original":string,"redacted":string,"rationale":string}],"residual_risk":"low"|"medium"|"high","summary":string}` },
  'ai_relevance_scorer': { slug: 'relevance-scorer',
    schema: `{"query":string,"scored_shards":[{"shard_id":string,"score":number,"rationale":string,"source_type":string}],"top_k":[string],"discarded":[string],"summary":string}` },
  'ai_context_summarizer': { slug: 'context-summarizer',
    schema: `{"brief":string,"key_facts":[string],"entities":[{"name":string,"type":string}],"omitted_sensitive_fields":[string],"token_estimate":number,"summary":string}` },
};

// ---------- Tool implementations ----------
async function callTool(name, args) {
  args = args || {};
  switch (name) {
    case 'list_consents': {
      if (args.app_name) {
        const r = await pool.query('SELECT * FROM app_consents WHERE app_name ILIKE $1 ORDER BY id DESC', [`%${args.app_name}%`]);
        return { rows: r.rows, count: r.rows.length };
      }
      const r = await pool.query('SELECT * FROM app_consents ORDER BY id DESC LIMIT 200');
      return { rows: r.rows, count: r.rows.length };
    }
    case 'list_disclosures': {
      const limit = Math.min(500, parseInt(args.limit || 50, 10));
      if (args.app_name) {
        const r = await pool.query(
          'SELECT * FROM disclosure_log WHERE app_name ILIKE $1 ORDER BY id DESC LIMIT $2',
          [`%${args.app_name}%`, limit]
        );
        return { rows: r.rows, count: r.rows.length };
      }
      const r = await pool.query('SELECT * FROM disclosure_log ORDER BY id DESC LIMIT $1', [limit]);
      return { rows: r.rows, count: r.rows.length };
    }
    case 'list_connectors': {
      const r = await pool.query('SELECT * FROM connectors ORDER BY id DESC');
      return { rows: r.rows, count: r.rows.length };
    }
    case 'list_redaction_rules': {
      const r = await pool.query('SELECT * FROM redaction_rules ORDER BY id DESC');
      return { rows: r.rows, count: r.rows.length };
    }
    case 'list_schemas': {
      const r = await pool.query('SELECT * FROM schemas ORDER BY id DESC');
      return { rows: r.rows, count: r.rows.length };
    }
    case 'check_dp_budget': {
      if (!args.app_name) throw new Error('app_name required');
      const r = await pool.query(
        'SELECT * FROM dp_budgets WHERE app_name=$1 ORDER BY id ASC',
        [args.app_name]
      );
      return { rows: r.rows, count: r.rows.length };
    }
  }
  const aiTool = AI_SCHEMAS[name];
  if (aiTool) {
    const result = await ai.runFeature(aiTool.slug, aiTool.schema, args);
    try {
      await pool.query('INSERT INTO ai_results (feature, input, output) VALUES ($1,$2,$3)',
        [aiTool.slug, args, result]);
    } catch (_) {}
    return result;
  }
  throw new Error(`unknown tool: ${name}`);
}

// ---------- JSON-RPC envelope ----------
function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, message, data) { return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } }; }

router.post('/rpc', async (req, res) => {
  const body = req.body || {};
  const { jsonrpc, id = null, method, params = {} } = body;
  if (jsonrpc && jsonrpc !== '2.0') {
    return res.json(rpcError(id, -32600, 'invalid jsonrpc version'));
  }
  if (!method || typeof method !== 'string') {
    return res.json(rpcError(id, -32600, 'method required'));
  }
  try {
    if (method === 'initialize') {
      return res.json(rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      }));
    }
    if (method === 'tools/list') {
      return res.json(rpcResult(id, { tools: TOOLS }));
    }
    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      if (!name) return res.json(rpcError(id, -32602, 'tool name required'));
      const out = await callTool(name, args);
      return res.json(rpcResult(id, {
        content: [{ type: 'text', text: JSON.stringify(out, null, 2) }],
        structuredContent: out,
      }));
    }
    if (method === 'ping') {
      return res.json(rpcResult(id, {}));
    }
    return res.json(rpcError(id, -32601, `method not found: ${method}`));
  } catch (e) {
    return res.json(rpcError(id, -32000, e.message));
  }
});

router.get('/rpc/manifest', (req, res) => {
  res.json({
    protocolVersion: PROTOCOL_VERSION,
    serverInfo: SERVER_INFO,
    tools: TOOLS,
  });
});

module.exports = router;
