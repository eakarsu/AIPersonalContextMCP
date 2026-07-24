import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setToken, setStoredUser } from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@personal-context-mcp.local');
  const [password, setPassword] = useState('secure123');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { token, user } = await login(email, password);
      setToken(token); setStoredUser(user);
      navigate('/');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <h2 className="login-brand">PERSONAL CONTEXT MCP</h2>
        <p className="login-sub">One personal data layer. Apps query via LLM with selective disclosure.</p>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="ai-error">{error}</div>}
        <button
          type="button"
          onClick={() => { setEmail(process.env.REACT_APP_DEMO_EMAIL || ''); setPassword(process.env.REACT_APP_DEMO_PASSWORD || ''); }}
          disabled={!process.env.REACT_APP_DEMO_EMAIL || !process.env.REACT_APP_DEMO_PASSWORD}
          aria-label="Auto Fill Demo Credentials"
          style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
        >
          Auto Fill Demo Credentials
        </button>
        <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 10 }}>
          {busy ? 'Signing in...' : 'Sign In'}
        </button>
        <p className="login-hint">demo: <code>admin@personal-context-mcp.local</code> / <code>secure123</code></p>
      </form>
    </div>
  );
}
