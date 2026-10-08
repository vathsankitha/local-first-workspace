'use client';
import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { WS_URL } from '@/lib/api';
import Toolbar from './Toolbar';

/**
 * Layer 1 (local):  Y.Doc  <->  y-indexeddb   (every keystroke saved in the browser)
 * Layer 2 (sync):   Y.Doc  <->  Hocuspocus    (WebSocket; merges with other people)
 * Layer 3 (UI):     TipTap bound to the Y.Doc, cursors via the Yjs Awareness protocol
 */
export default function CollabEditor({ docId, user, readOnly }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const idb = new IndexeddbPersistence(`lfw-doc-${docId}`, ydoc);
    const provider = new HocuspocusProvider({
      url: WS_URL,
      name: docId,
      document: ydoc,
      token: user.id,
    });
    setSession({ ydoc, idb, provider });
    return () => {
      provider.destroy();
      idb.destroy();
      ydoc.destroy();
      setSession(null);
    };
  }, [docId, user.id]);

  if (!session) return <div className="muted pad">Opening document…</div>;
  return <EditorInner key={docId} {...session} user={user} readOnly={readOnly} />;
}

function EditorInner({ ydoc, idb, provider, user, readOnly }) {
  const [status, setStatus] = useState('connecting');
  const [localReady, setLocalReady] = useState(false);
  const [peers, setPeers] = useState([]);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [authError, setAuthError] = useState('');

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !readOnly,
      extensions: [
        StarterKit.configure({ history: false }), // Yjs provides undo/redo
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({
          provider,
          user: { name: user.name, color: user.color },
        }),
      ],
      editorProps: { attributes: { class: 'prose', spellcheck: 'true' } },
    },
    [ydoc, provider]
  );

  useEffect(() => {
    idb.whenSynced.then(() => setLocalReady(true));
    const onStatus = ({ status }) => setStatus(status);
    const onAuthFail = ({ reason }) => setAuthError(reason || 'permission-denied');
    const onAwareness = () => {
      const seen = new Map();
      provider.awareness.getStates().forEach((state, clientId) => {
        if (state.user && clientId !== provider.awareness.clientID) seen.set(clientId, state.user);
      });
      setPeers([...seen.values()]);
    };
    provider.on('status', onStatus);
    provider.on('authenticationFailed', onAuthFail);
    provider.on('awarenessChange', onAwareness);
    return () => {
      provider.off('status', onStatus);
      provider.off('authenticationFailed', onAuthFail);
      provider.off('awarenessChange', onAwareness);
    };
  }, [provider, idb]);

  function toggleNetwork() {
    if (pausedByUser) { provider.connect(); setPausedByUser(false); }
    else { provider.disconnect(); setPausedByUser(true); }
  }

  const online = status === 'connected' && !pausedByUser;
  const label = authError ? 'No access' : pausedByUser ? 'Offline (paused)' : online ? 'Synced' : status === 'connecting' ? 'Connecting…' : 'Offline: saved locally';

  return (
    <div className="editor-wrap">
      <div className="editor-bar">
        <span className={`status ${authError ? 'bad' : online ? 'ok' : 'warn'}`}>
          <span className="status-dot" /> {label}
        </span>
        {!localReady && <span className="muted small">Loading local copy…</span>}
        <div className="peers" title="Other people in this document">
          {peers.map((p, i) => (
            <span key={i} className="peer" style={{ background: p.color }} title={p.name}>
              {(p.name || '?').slice(0, 1).toUpperCase()}
            </span>
          ))}
          {peers.length === 0 && <span className="muted small">Just you</span>}
        </div>
        <button onClick={toggleNetwork} className="ghost">
          {pausedByUser ? 'Go back online' : 'Simulate offline'}
        </button>
      </div>

      {authError && (
        <p className="error">The sync server refused this connection ({authError}). You can still edit locally, but changes will not be shared.</p>
      )}
      {!readOnly && <Toolbar editor={editor} />}
      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
