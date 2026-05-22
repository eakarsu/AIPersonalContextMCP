const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 4063;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4062').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('cors'))), credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AIPersonalContextMCP', timestamp: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', authenticateToken);

// CRUD entities
app.use('/api/connectors', require('./routes/Connectors'));
app.use('/api/data-sources', require('./routes/DataSources'));
app.use('/api/app-consents', require('./routes/AppConsents'));
app.use('/api/disclosure-log', require('./routes/DisclosureLog'));
app.use('/api/mcp-clients', require('./routes/McpClients'));
app.use('/api/schemas', require('./routes/Schemas'));
app.use('/api/redaction-rules', require('./routes/RedactionRules'));

// AI + cross-cutting
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use('/api', require('./routes/mcpExtras'));

// Custom Views — 2 VIZ + 2 NON-VIZ + share-graph (pass 7). Mounted BEFORE 404 handler.
app.use('/api/custom-views', require('./routes/customViews'));

// Apply pass 7 (full backlog implementation) — mount BEFORE 404 handler.
app.use('/api/dp-budgets', require('./routes/dpBudgets'));
app.use('/api/forget-requests', require('./routes/forgetRequests'));
app.use('/api/app-consents', require('./routes/consentRevoke')); // sibling /:id/revoke
app.use('/api/export', require('./routes/contextExport'));
app.use('/api/oauth', require('./routes/oauthStubs'));           // NEEDS-CREDS → 503
app.use('/api/mcp', require('./routes/mcpRpc'));                 // live JSON-RPC
app.use('/api/disclosure-simulator', require('./routes/disclosureSimulator'));

// 404 fallback for unknown /api/* routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));

app.listen(PORT, () => console.log(`\nPersonal Context MCP API on http://localhost:${PORT}\n`));
