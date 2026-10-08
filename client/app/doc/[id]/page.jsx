'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useUser } from '@/lib/useUser';
import CollabEditor from '@/components/CollabEditor';

export default function DocPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!user) return;
    api(`/documents/${id}`)
      .then((d) => { setDoc(d); setTitle(d.title); })
      .catch((e) => setError(e.message));
  }, [id, user]);

  function onTitle(value) {
    setTitle(value);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api(`/documents/${id}`, { method: 'PATCH', body: { title: value } }).catch((e) => setError(e.message));
    }, 600);
  }

  if (user === null) return <div className="center"><p>Please <Link href="/">sign in</Link> first.</p></div>;
  if (error && !doc) return <div className="center"><p className="error">{error}</p><Link href="/">Back to workspace</Link></div>;
  if (!doc || !user) return <div className="center muted">Loading…</div>;

  const readOnly = doc.role === 'VIEWER';
  return (
    <div className="doc-page">
      <div className="doc-top">
        <Link href="/" className="back">← Workspace</Link>
        <input
          className="title-input"
          value={title}
          readOnly={readOnly}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Untitled"
        />
        {readOnly && <span className="badge">view only</span>}
      </div>
      {error && <p className="error">{error}</p>}
      <CollabEditor docId={id} user={user} readOnly={readOnly} />
    </div>
  );
}
