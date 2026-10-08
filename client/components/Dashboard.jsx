'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const canManage = (role) => role === 'OWNER' || role === 'ADMIN';
const canEdit = (role) => role !== 'VIEWER';

export default function Dashboard({ user, onLogout }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [members, setMembers] = useState([]);
  const [newWs, setNewWs] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const active = workspaces.find((w) => w.id === activeId);

  const run = useCallback(async (fn) => {
    setError('');
    try { return await fn(); } catch (e) { setError(e.message); }
  }, []);

  const loadWorkspaces = useCallback(async (preferId) => {
    const list = await run(() => api('/workspaces'));
    if (!list) return;
    setWorkspaces(list);
    const saved = preferId || localStorage.getItem('lfw_active');
    setActiveId(list.find((w) => w.id === saved)?.id || list[0]?.id || null);
  }, [run]);

  const loadWorkspaceData = useCallback(async (id) => {
    const [d, m] = await Promise.all([
      run(() => api(`/workspaces/${id}/documents`)),
      run(() => api(`/workspaces/${id}/members`)),
    ]);
    if (d) setDocs(d);
    if (m) setMembers(m);
  }, [run]);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);
  useEffect(() => {
    if (!activeId) { setDocs([]); setMembers([]); return; }
    localStorage.setItem('lfw_active', activeId);
    loadWorkspaceData(activeId);
  }, [activeId, loadWorkspaceData]);

  async function createWorkspace(e) {
    e.preventDefault();
    if (!newWs.trim()) return;
    const ws = await run(() => api('/workspaces', { method: 'POST', body: { name: newWs } }));
    if (ws) { setNewWs(''); loadWorkspaces(ws.id); }
  }
  async function joinWorkspace(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const ws = await run(() => api('/workspaces/join', { method: 'POST', body: { slug: joinCode } }));
    if (ws) { setJoinCode(''); loadWorkspaces(ws.id); }
  }
  async function createDoc() {
    const doc = await run(() => api(`/workspaces/${activeId}/documents`, { method: 'POST', body: { title: 'Untitled' } }));
    if (doc) router.push(`/doc/${doc.id}`);
  }
  async function deleteDoc(id) {
    if (!confirm('Delete this document for everyone?')) return;
    const r = await run(() => api(`/documents/${id}`, { method: 'DELETE' }));
    if (r) loadWorkspaceData(activeId);
  }
  async function setRole(userId, role) {
    const r = await run(() => api(`/workspaces/${activeId}/members/${userId}`, { method: 'PATCH', body: { role } }));
    if (r) loadWorkspaceData(activeId);
  }
  function copyCode() {
    navigator.clipboard?.writeText(active.slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Local-First<br />Workspace</div>

        <div className="side-section">
          <div className="side-title">Workspaces</div>
          {workspaces.length === 0 && <p className="muted small">Create a workspace to start, or join one with an invite code.</p>}
          {workspaces.map((w) => (
            <button key={w.id} className={`ws-item ${w.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(w.id)}>
              {w.name}
              <span className="role">{w.role.toLowerCase()}</span>
            </button>
          ))}
        </div>

        <form className="side-section" onSubmit={createWorkspace}>
          <input value={newWs} onChange={(e) => setNewWs(e.target.value)} placeholder="New workspace name" />
          <button>Create workspace</button>
        </form>
        <form className="side-section" onSubmit={joinWorkspace}>
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Invite code" />
          <button>Join workspace</button>
        </form>

        <div className="side-foot">
          <span className="dot" style={{ background: user.color }} />
          <span className="grow">{user.name}</span>
          <button className="link" onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        {error && <p className="error">{error}</p>}
        {!active ? (
          <div className="empty">
            <h2>No workspace yet</h2>
            <p className="muted">Create one on the left. Share its invite code so teammates can join.</p>
          </div>
        ) : (
          <>
            <header className="page-head">
              <div>
                <h2>{active.name}</h2>
                <p className="muted small">
                  Invite code: <code>{active.slug}</code>{' '}
                  <button className="link" onClick={copyCode}>{copied ? 'Copied' : 'Copy'}</button>
                </p>
              </div>
              {canEdit(active.role) && <button className="primary" onClick={createDoc}>New document</button>}
            </header>

            <section>
              <h3>Documents</h3>
              {docs.length === 0 ? (
                <p className="muted">Nothing here yet. {canEdit(active.role) ? 'Create the first document.' : 'Viewers cannot create documents.'}</p>
              ) : (
                <ul className="doc-list">
                  {docs.map((d) => (
                    <li key={d.id}>
                      <Link href={`/doc/${d.id}`} className="doc-link">
                        <span className="doc-title">{d.title}</span>
                        <span className="muted small">by {d.creator?.name || 'unknown'} · edited {new Date(d.updatedAt).toLocaleString()}</span>
                      </Link>
                      {(d.creatorId === user.id || canManage(active.role)) && (
                        <button className="link danger" onClick={() => deleteDoc(d.id)}>Delete</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3>Members</h3>
              <ul className="members">
                {members.map((m) => (
                  <li key={m.userId}>
                    <span className="grow">{m.name || m.email} <span className="muted small">{m.email}</span></span>
                    {canManage(active.role) && m.role !== 'OWNER' && m.userId !== user.id ? (
                      <select value={m.role} onChange={(e) => setRole(m.userId, e.target.value)}>
                        <option value="ADMIN">admin</option>
                        <option value="MEMBER">member</option>
                        <option value="VIEWER">viewer</option>
                      </select>
                    ) : (
                      <span className="role">{m.role.toLowerCase()}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
