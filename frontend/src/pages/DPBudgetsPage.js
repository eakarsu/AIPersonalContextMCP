// Apply pass 7 (full backlog implementation)
// Differential-privacy budget tracker UI.
import React, { useEffect, useState } from 'react';
import { dpBudgetsApi } from '../services/api';

export default function DPBudgetsPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ app_name: '', scope: '', epsilon_total: 1.0, notes: '' });
  const [spendForm, setSpendForm] = useState({ app_name: '', amount: 0.05, reason: '' });
  const [ledger, setLedger] = useState({ app: null, spends: [] });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try { setRows(await dpBudgetsApi.list()); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setErr(null); setMsg(null);
    try {
      await dpBudgetsApi.create({ ...form, epsilon_total: Number(form.epsilon_total) });
      setMsg(`Budget created for ${form.app_name}`); setForm({ app_name: '', scope: '', epsilon_total: 1.0, notes: '' }); load();
    } catch (e) { setErr(e.message); }
  };
  const remove = async (id) => { try { await dpBudgetsApi.remove(id); load(); } catch (e) { setErr(e.message); } };
  const spend = async () => {
    setErr(null); setMsg(null);
    try {
      const r = await dpBudgetsApi.spend(spendForm.app_name, { amount: Number(spendForm.amount), reason: spendForm.reason });
      setMsg(`Spent ε=${r.spent} for ${r.app_name}; remaining=${r.remaining}`); load();
    } catch (e) { setErr(e.message); }
  };
  const showLedger = async (app) => {
    try { const r = await dpBudgetsApi.ledger(app); setLedger({ app, spends: r.spends || [] }); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div data-testid="dp-budgets-page">
      <div className="page-header">
        <div>
          <h2>Differential-Privacy Budgets</h2>
          <p>Per-app ε tracking. Disclosures decrement remaining budget; 402 returned when exhausted.</p>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}
      {msg && <div className="card" style={{ background: '#0c2218', borderColor: '#16a34a', marginBottom: 12 }}>{msg}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Create Budget</h3>
        <div className="form-grid">
          <div className="form-group"><label>App name</label><input value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} /></div>
          <div className="form-group"><label>Scope (optional)</label><input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} /></div>
          <div className="form-group"><label>Epsilon total</label><input type="number" step="0.01" value={form.epsilon_total} onChange={(e) => setForm({ ...form, epsilon_total: e.target.value })} /></div>
          <div className="form-group full-width"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <button className="btn" onClick={create} disabled={!form.app_name}>Create</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Spend Epsilon</h3>
        <div className="form-grid">
          <div className="form-group"><label>App name</label><input value={spendForm.app_name} onChange={(e) => setSpendForm({ ...spendForm, app_name: e.target.value })} /></div>
          <div className="form-group"><label>Amount</label><input type="number" step="0.01" value={spendForm.amount} onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })} /></div>
          <div className="form-group"><label>Reason</label><input value={spendForm.reason} onChange={(e) => setSpendForm({ ...spendForm, reason: e.target.value })} /></div>
        </div>
        <button className="btn ai" onClick={spend} disabled={!spendForm.app_name}>Spend ε</button>
      </div>

      <div className="card">
        <h3>Active Budgets</h3>
        {rows.length === 0 && <div className="empty-state">No budgets configured.</div>}
        <table style={{ width: '100%' }}>
          <thead><tr><th>App</th><th>Scope</th><th>ε total</th><th>ε spent</th><th>ε remaining</th><th>Status</th><th>Last spent</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => {
              const pct = r.epsilon_total > 0 ? (r.epsilon_spent / r.epsilon_total) * 100 : 0;
              return (
                <tr key={r.id}>
                  <td>{r.app_name}</td><td>{r.scope || '-'}</td>
                  <td>{Number(r.epsilon_total).toFixed(4)}</td>
                  <td>{Number(r.epsilon_spent).toFixed(4)} ({pct.toFixed(1)}%)</td>
                  <td>{Number(r.epsilon_remaining).toFixed(4)}</td>
                  <td><span className={'badge ' + (r.status === 'exhausted' ? 'revoked' : 'active')}>{r.status}</span></td>
                  <td>{r.last_spent_at ? new Date(r.last_spent_at).toLocaleString() : '—'}</td>
                  <td>
                    <button className="btn secondary" onClick={() => showLedger(r.app_name)}>Ledger</button>{' '}
                    <button className="btn secondary" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ledger.app && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Ledger — {ledger.app}</h3>
          {ledger.spends.length === 0 ? <div className="empty-state">No spends.</div> : (
            <table style={{ width: '100%' }}>
              <thead><tr><th>When</th><th>Amount</th><th>Reason</th><th>Disclosure</th></tr></thead>
              <tbody>{ledger.spends.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.created_at).toLocaleString()}</td>
                  <td>{Number(s.amount).toFixed(4)}</td>
                  <td>{s.reason || '-'}</td>
                  <td>{s.disclosure_id || '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
