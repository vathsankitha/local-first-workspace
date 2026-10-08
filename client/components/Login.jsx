'use client';
import { useState } from 'react';

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onLogin(name.trim(), email.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <form className="login" onSubmit={submit}>
        <h1>Local-First Workspace</h1>
        <p className="muted">Write together. Keep writing when the network drops; everything merges when it returns.</p>
        <label>Your name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" required />
        </label>
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Continue'}</button>
        <p className="hint">No password in this demo: the email just identifies you. Use two browsers with two different emails to test collaboration.</p>
      </form>
    </div>
  );
}
