import React, { useEffect, useRef, useState } from 'react';
import { getMcpManifest, callMcpRpc, oauthStatus } from '../services/api';
import AIFieldPresets, { completeExample } from '../components/AIFieldPresets';
import AIResultView, { readableLabel } from '../components/AIResultView';
import useCancelableAI from '../components/useCancelableAI';

const contexts = [
  { label: 'Demo AI · Planning notes', app: 'Fictional planning assistant', question: 'Which draft activities need review before a fictional team meeting?', snippet: 'Fictional draft: Morgan at example1@example.com is coordinating an illustrative planning session.', context: 'Fictional draft notes: prepare an agenda, review dependencies, and list missing evidence.', kind: 'fictional planning notes', target: 'Fictional agenda assistant' },
  { label: 'Demo AI · Handoff review', app: 'Fictional handoff assistant', question: 'Which supplied fictional notes are relevant to an illustrative handoff checklist?', snippet: 'Fictional handoff draft: Casey has a callback at +1 202 555 0100; minimize contact details before sharing.', context: 'Fictional draft handoff: two tasks await review; summarize owners, dependencies, and questions without asserting completion.', kind: 'fictional handoff notes', target: 'Fictional checklist assistant' },
  { label: 'Demo AI · Privacy review', app: 'Fictional privacy drafting assistant', question: 'What information should a fictional reviewer minimize in these supplied draft notes?', snippet: 'Fictional drafting example: Taylor at example3@example.com requested a review; avoid repeating illustrative identifiers.', context: 'Fictional privacy drafting notes: use the minimum information, flag uncertain context, and request review before disclosure.', kind: 'fictional privacy draft', target: 'Fictional review assistant' },
];
function samplesFor(tool) {
  return contexts.map((context, index) => ({ label: context.label, values: {
    requesting_app: context.app, question: context.question, allowed_sources: 'Supplied fictional notes only; no connector retrieval or actual disclosure permission',
    snippet: context.snippet, target_app: context.target, query: context.question,
    candidate_shards: JSON.stringify([{ id: `fictional-draft-${index + 1}`, text: context.context, source_type: 'fictional supplied draft notes' }], null, 2),
    context_kind: context.kind, raw_context: context.context,
  } }));
}

export default function McpRpcConsolePage() {
  const [manifest, setManifest] = useState(null);
  const [selected, setSelected] = useState('');
  const [values, setValues] = useState({});
  const [argsText, setArgsText] = useState('{}');
  const [manifestError, setManifestError] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [oauth, setOauth] = useState({});
  const activeTool = useRef('');
  const { run, cancel, result, setResult, loading, error, setError, notice } = useCancelableAI();
  const tool = manifest?.tools.find(item => item.name === selected);
  const isAI = selected.startsWith('ai_');
  const fields = Object.entries(tool?.inputSchema?.properties || {}).map(([key, schema]) => ({ key, label: readableLabel(key), type: schema.type === 'integer' || schema.type === 'number' ? 'number' : key === 'candidate_shards' ? 'json' : 'textarea', jsonShape: key === 'candidate_shards' ? 'array' : undefined, required: tool.inputSchema.required?.includes(key), defaultValue: schema.default }));

  useEffect(() => {
    let live = true;
    setManifestError(null);
    getMcpManifest().then(data => {
      if (!data || !Array.isArray(data.tools) || data.tools.some(item => !item?.name || !item.inputSchema?.properties)) throw new Error('The native tool manifest returned an unexpected response.');
      if (!live) return;
      setManifest(data);
      const first = data.tools[0]?.name || '';
      activeTool.current = first; setSelected(first); setValues({}); setArgsText('{}');
    }).catch(failure => { if (live) setManifestError(failure.message || 'Could not load the native tool manifest.'); });
    for (const provider of ['gmail', 'google-calendar', 'google-drive']) oauthStatus(provider).then(data => { if (live) setOauth(current => ({ ...current, [provider]: data })); }).catch(() => { if (live) setOauth(current => ({ ...current, [provider]: { unavailable: true } })); });
    return () => { live = false; };
  }, [refresh]);

  const selectTool = name => {
    cancel(); setResult(null); setError(null);
    activeTool.current = name; setSelected(name); setValues({}); setArgsText('{}');
  };
  const invoke = async event => {
    event?.preventDefault();
    if (loading || !tool) return;
    let parsed;
    try {
      if (isAI) {
        parsed = Object.fromEntries(fields.map(field => [field.key, field.type === 'number' ? Number(values[field.key]) : values[field.key] || '']));
        for (const field of fields) {
          if (field.required && !String(parsed[field.key] ?? '').trim()) throw new Error(`${field.label} is required.`);
          if (field.type === 'json' && parsed[field.key]) {
            if (!Array.isArray(JSON.parse(parsed[field.key]))) throw new Error(`${field.label} must be a JSON array.`);
          }
        }
      } else parsed = argsText.trim() ? JSON.parse(argsText) : {};
    } catch (failure) { setError(failure.message || 'Review the current tool arguments.'); return; }
    const owner = selected;
    await run(async ({ signal }) => {
      const response = await callMcpRpc('tools/call', { name: owner, arguments: parsed }, 1, { signal });
      if (response?.error) throw new Error(response.error.message || 'The native tool failed.');
      if (!response?.result || activeTool.current !== owner) throw new Error('The native tool returned an unexpected response.');
      return isAI ? response.result.structuredContent ?? response.result.content?.find(item => item.type === 'text')?.text : response;
    });
  };
  const listTools = () => run(async ({ signal }) => {
    const response = await callMcpRpc('tools/list', {}, 1, { signal });
    if (response?.error) throw new Error(response.error.message || 'Could not list native tools.');
    return response;
  });

  return <div data-testid="mcp-rpc-console-page">
    <div className="page-header"><div><h2>MCP tools</h2><p>Run a native context tool or inspect its protocol. AI examples use only supplied fictional drafts and grant no connector access, consent or disclosure permission.</p></div></div>
    {manifestError && <div className="ai-error" role="alert">{manifestError} <button className="btn secondary" type="button" onClick={() => { setManifest(null); setRefresh(value => value + 1); }}>Retry native tools</button></div>}
    {!manifest && !manifestError && <div className="empty-state" role="status">Loading native tools…</div>}
    {manifest && <div className="card" style={{ marginBottom: 12 }}>
      <label htmlFor="mcp-tool">Native tool</label><select id="mcp-tool" value={selected} onChange={event => selectTool(event.target.value)} disabled={loading} style={{ width: '100%', padding: 8 }}>{manifest.tools.map(item => <option key={item.name} value={item.name}>{readableLabel(item.name)} — {item.description}</option>)}</select>
      <form onSubmit={invoke} style={{ marginTop: 16 }}>
        {isAI ? <>
          <AIFieldPresets fields={fields} samples={samplesFor(tool)} disabled={loading} context={selected} onFill={(sample, variant) => { setValues(completeExample(fields, sample, variant, selected, values)); setError(null); setResult(null); }} />
          {fields.map(field => <div className="form-group" key={field.key}><label htmlFor={`mcp-${field.key}`}>{field.label}{field.required ? ' *' : ' (optional)'}</label>{field.type === 'number' ? <input id={`mcp-${field.key}`} type="number" value={values[field.key] ?? ''} required={field.required} disabled={loading} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} /> : <textarea id={`mcp-${field.key}`} value={values[field.key] ?? ''} required={field.required} disabled={loading} rows={field.type === 'json' ? 6 : 3} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} />}</div>)}
          <p className="ai-muted">Draft context is sent only when you choose Generate. Local candidate labels identify the supplied fictional draft items; they are not saved source IDs.</p>
        </> : <div className="form-group"><label htmlFor="mcp-arguments">Protocol arguments (JSON)</label><textarea id="mcp-arguments" value={argsText} onChange={event => setArgsText(event.target.value)} disabled={loading} rows={5} /></div>}
        <div className="sr-actions"><button className="btn ai" type="submit" disabled={loading || !selected}>{loading ? 'Running native tool…' : isAI ? 'Generate with OpenRouter' : 'Run native tool'}</button><button className="btn secondary" type="button" onClick={cancel}>Cancel</button><button className="btn secondary" type="button" disabled={loading} onClick={listTools}>Inspect tool protocol</button></div>
      </form>
    </div>}
    {notice && <p role="status">{notice}</p>}
    <AIResultView result={result} loading={loading} error={error} title={isAI ? readableLabel(selected) : 'Native tool response'} />
    <details className="card" style={{ marginTop: 16 }}><summary>Connector configuration and protocol diagnostics</summary><p>Providers stay unavailable until their actual native connection is configured.</p><table style={{ width: '100%' }}><thead><tr><th>Provider</th><th>Status</th><th>Required configuration</th><th>Scope</th></tr></thead><tbody>{Object.keys(oauth).map(provider => <tr key={provider}><td>{provider}</td><td>{oauth[provider].unavailable ? 'Status unavailable' : oauth[provider].configured ? 'Configured' : 'Not configured'}</td><td>{(oauth[provider].required_env || []).join(', ')}</td><td>{oauth[provider].scope}</td></tr>)}</tbody></table>{tool && <details><summary>Machine-readable input schema</summary><pre>{JSON.stringify(tool.inputSchema, null, 2)}</pre></details>}</details>
  </div>;
}
