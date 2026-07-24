// LLM helper for Personal Context MCP
function creds() {
  return {
    key: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
    baseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
  };
}
const SYSTEM_BASE = 'You are a senior analyst supporting the Personal Context MCP. ' +
  'CRITICAL OUTPUT RULES: (1) Return ONLY raw JSON matching the schema requested. ' +
  '(2) DO NOT wrap in markdown fences. (3) DO NOT add prose before/after. ' +
  '(4) Keep concise to fit token limit; never truncate. ' +
  '(5) First char must be `{`, last must be `}`.';

async function callOpenRouter(systemPrompt, userPrompt) {
    const { key, model, baseUrl } = creds();
    if (!key) throw new Error('OPENROUTER_API_KEY not configured');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:4062',
        'X-Title': 'Personal Context MCP',
      },
      body: JSON.stringify({
      model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.4, max_tokens: 6000, response_format: { type: 'json_object' },
      }),
    });
    const body = await response.text();
    let parsed;
    try { parsed = JSON.parse(body); } catch (_) { throw new Error(`OpenRouter returned invalid JSON (${response.status})`); }
    if (!response.ok || parsed.error) throw new Error(parsed.error?.message || `OpenRouter request failed (${response.status})`);
    const content = parsed.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenRouter returned no content');
    return content;
}
function stripFences(text) {
  let t = String(text).trim();
  if (t.startsWith('\`\`\`')) {
    t = t.replace(/^\`\`\`(?:json)?\s*/i, '');
    t = t.replace(/\s*\`\`\`\s*$/i, '');
  }
  return t.trim();
}
function repairTruncated(text) {
  if (!text || typeof text !== 'string') return null;
  let inStr = false, esc = false, lastSafe = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === ',' || ch === '}' || ch === ']') lastSafe = i;
  }
  let r = lastSafe >= 0 ? text.slice(0, lastSafe + 1) : text;
  r = r.replace(/,\s*$/, '');
  if (inStr) r += '"';
  const stack = []; let s2 = false, e2 = false;
  for (let i = 0; i < r.length; i++) {
    const ch = r[i];
    if (e2) { e2 = false; continue; }
    if (ch === '\\') { e2 = true; continue; }
    if (ch === '"') { s2 = !s2; continue; }
    if (s2) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  while (stack.length) r += (stack.pop() === '{' ? '}' : ']');
  try { return JSON.parse(r); } catch (_) { return null; }
}
function safeParse(response, fallback) {
  if (response && typeof response === 'object' && response.error) return { ...fallback, error: response.error };
  if (response == null) return { ...fallback, summary: '' };
  if (typeof response === 'object') return response;
  const stripped = stripFences(String(response));
  try { return JSON.parse(stripped); } catch (_) {}
  try {
    const start = stripped.indexOf('{');
    if (start !== -1) {
      let d = 0, s = false, e = false;
      for (let i = start; i < stripped.length; i++) {
        const ch = stripped[i];
        if (e) { e = false; continue; }
        if (ch === '\\') { e = true; continue; }
        if (ch === '"') { s = !s; continue; }
        if (s) continue;
        if (ch === '{') d++;
        else if (ch === '}') { d--; if (d === 0) return JSON.parse(stripped.slice(start, i + 1)); }
      }
    }
  } catch (_) {}
  const start = stripped.indexOf('{');
  if (start !== -1) {
    const r = repairTruncated(stripped.slice(start));
    if (r && typeof r === 'object') return { ...r, _truncated: true };
  }
  return { ...fallback, summary: stripped };
}
async function runFeature(slug, schema, payload) {
  const sys = `${SYSTEM_BASE}\nReturn strict JSON in this schema:\n${schema}`;
  const usr = `Feature: ${slug}\nInputs:\n${JSON.stringify(payload, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeParse(r, { summary: typeof r === 'string' ? r : 'No response' });
}
module.exports = { runFeature };
