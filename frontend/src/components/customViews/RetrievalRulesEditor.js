import React, { useEffect, useState, useCallback } from 'react';
import { API_BASE, getToken } from '../../services/api';

// NON-VIZ 2 — Retrieval Rules Editor (CRUD over per-source weights).
const empty = { source_type: 'notes', connector_name: '', weight: 50, redact_pii: true, notes: '' };

export default function RetrievalRulesEditor() {
  const [rules, setRules] = useState([]);
  const [hints, setHints] = useState({ connector_options: [], source_type_options: [] });
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/custom-views/retrieval-rules`, { headers: headers() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'load failed');
      setRules(j.rules || []);
      setHints(j.hints || { connector_options: [], source_type_options: [] });
      setErr(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function send(op, rule) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/custom-views/retrieval-rules`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ op, rule }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'request failed');
      setRules(j.rules || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.source_type || !form.connector_name) { setErr('source_type and connector_name are required'); return; }
    if (editingId) {
      await send('update', { ...form, id: editingId });
    } else {
      await send('create', form);
    }
    setForm(empty);
    setEditingId(null);
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({
      source_type: r.source_type || 'notes',
      connector_name: r.connector_name || '',
      weight: r.weight ?? 50,
      redact_pii: !!r.redact_pii,
      notes: r.notes || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty);
  }

  async function remove(id) {
    if (!window.confirm('Delete this retrieval rule?')) return;
    await send('delete', { id });
  }

  async function reset() {
    if (!window.confirm('Reset retrieval rules to defaults?')) return;
    await send('reset', null);
  }

  return (
    <div className="card" data-testid="retrieval-rules-editor" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Retrieval Rules Editor</h3>
        <button className="btn secondary" onClick={reset} disabled={busy}>Reset Defaults</button>
      </div>
      <p style={{ color: '#94a3b8', fontSize: 12 }}>
        Set per-source weights and PII-redaction policy. These rules influence selective disclosure scoring.
      </p>

      {err && <div className="ai-error" style={{ marginBottom: 8 }}>{err}</div>}

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 90px 1fr auto auto', gap: 8, alignItems: 'end', marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Source Type</label>
          <input
            list="source-type-options"
            value={form.source_type}
            onChange={(e) => update('source_type', e.target.value)}
            style={{ width: '100%', background: '#0b1424', border: '1px solid #1e293b', color: '#e2e8f0', padding: '6px 8px', borderRadius: 4 }}
          />
          <datalist id="source-type-options">
            {(hints.source_type_options || []).map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Connector</label>
          <input
            list="connector-options"
            value={form.connector_name}
            onChange={(e) => update('connector_name', e.target.value)}
            style={{ width: '100%', background: '#0b1424', border: '1px solid #1e293b', color: '#e2e8f0', padding: '6px 8px', borderRadius: 4 }}
          />
          <datalist id="connector-options">
            {(hints.connector_options || []).map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Weight</label>
          <input
            type="number" min="0" max="100"
            value={form.weight}
            onChange={(e) => update('weight', e.target.value === '' ? '' : Number(e.target.value))}
            style={{ width: '100%', background: '#0b1424', border: '1px solid #1e293b', color: '#e2e8f0', padding: '6px 8px', borderRadius: 4 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 6 }}>
          <input id="redact-pii" type="checkbox" checked={!!form.redact_pii} onChange={(e) => update('redact_pii', e.target.checked)} />
          <label htmlFor="redact-pii" style={{ fontSize: 11, color: '#94a3b8' }}>Redact PII</label>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Notes</label>
          <input
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="optional"
            style={{ width: '100%', background: '#0b1424', border: '1px solid #1e293b', color: '#e2e8f0', padding: '6px 8px', borderRadius: 4 }}
          />
        </div>
        <button type="submit" className="btn" disabled={busy}>{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" className="btn secondary" onClick={cancelEdit} disabled={busy}>Cancel</button>}
      </form>

      {loading ? (
        <div style={{ color: '#94a3b8' }}>Loading…</div>
      ) : rules.length === 0 ? (
        <div style={{ color: '#94a3b8' }}>No retrieval rules. Add one above.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b', textAlign: 'left', color: '#94a3b8' }}>
              <th style={{ padding: 6 }}>Source</th>
              <th style={{ padding: 6 }}>Connector</th>
              <th style={{ padding: 6 }}>Weight</th>
              <th style={{ padding: 6 }}>Redact</th>
              <th style={{ padding: 6 }}>Notes</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: 6 }}>{r.source_type}</td>
                <td style={{ padding: 6 }}>{r.connector_name}</td>
                <td style={{ padding: 6 }}>
                  <span style={{ display: 'inline-block', minWidth: 30 }}>{r.weight}</span>
                  <span style={{
                    display: 'inline-block', width: 60, height: 6, marginLeft: 6,
                    background: '#1e293b', borderRadius: 3, verticalAlign: 'middle',
                  }}>
                    <span style={{ display: 'block', width: `${r.weight}%`, height: '100%', background: '#3b82f6', borderRadius: 3 }} />
                  </span>
                </td>
                <td style={{ padding: 6 }}>{r.redact_pii ? 'yes' : 'no'}</td>
                <td style={{ padding: 6, color: '#94a3b8' }}>{r.notes || '—'}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>
                  <button className="btn secondary" style={{ marginRight: 6 }} onClick={() => startEdit(r)} disabled={busy}>Edit</button>
                  <button className="btn danger" onClick={() => remove(r.id)} disabled={busy}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
