# Local-First Collaborative Workspace

Real-time collaborative rich-text documents that keep working offline and merge automatically when you reconnect.
App is live at: https://local-first-workspace.vercel.app/

**Stack:** Next.js 14 · TipTap · Yjs (CRDT) · y-indexeddb · Hocuspocus (WebSocket sync) · Express · Prisma (SQLite by default, PostgreSQL optional)

```
[ Browser: TipTap + Y.Doc ] --WebSocket-- [ Hocuspocus sync server + Express API ]
        |                                              |
   IndexedDB (offline copy)                    Prisma -> SQLite / PostgreSQL
```

## Requirements
- Node.js 18.18 or newer (check with `node -v`)

## Run it (VS Code + Git Bash on Windows)
Open the folder in VS Code, open a terminal (Git Bash), then:

```bash
npm run setup     # installs everything + creates the database
npm run dev       # starts server (4000) and client (3000)
```

Open http://localhost:3000.

## Try the collaboration features
1. Sign in as **Ada** (ada@example.com) in a normal window and create a workspace. Copy its invite code.
2. Sign in as **Grace** (grace@example.com) in an incognito window and join with the invite code.
3. Open the same document in both. You'll see each other's live cursors and avatars.
4. **Offline test:** in one window click **Simulate offline**, keep typing in both windows, then click **Go back online**. Both edits merge with nothing lost.
5. Close the tab while offline and reopen: your text is still there (IndexedDB).
6. As Ada (owner), change Grace's role to **viewer**; she can read live but not edit.

Automated proof of the merge logic (no browser needed): `npm run test:merge`

## Project layout
```
server/
  prisma/schema.prisma   Users, Workspaces, Members (roles), Documents, DocumentUpdate
  src/collab.js          Hocuspocus: auth, load from DB, debounced save to DB
  src/routes.js          REST API (login, workspaces, members, documents)
  src/index.js           HTTP + WebSocket server
  scripts/test-merge.js  Offline-merge proof
client/
  app/                   Next.js pages (dashboard, /doc/[id])
  components/            CollabEditor (Yjs + IndexedDB + TipTap), Toolbar, Dashboard, Login
  lib/                   API helper, user hook
```

## Roadmap coverage
| Step | Where |
|---|---|
| 1. TipTap + Yjs + y-indexeddb | `client/components/CollabEditor.jsx` |
| 2. Hocuspocus + DB persistence | `server/src/collab.js` |
| 3. Presence and cursors (Awareness) | `CollabEditor.jsx` (CollaborationCursor, peer avatars) |
| 4. Offline sync and conflict resolution | "Simulate offline" button, `npm run test:merge` |

Not included: the optional `y-webrtc` peer-to-peer transport. It needs a signaling server and the WebSocket path already covers sync. Sign-in is identity-by-email only (no passwords); add real auth (e.g. NextAuth/JWT) before deploying.

## Switching to PostgreSQL
1. In `server/prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`.
2. In `server/.env` set `DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/workspace"`.
3. Run `npm run db:push`.

## Troubleshooting
- **Port in use:** change `PORT` in `server/.env` and the two URLs in `client/.env.local`.
- **Prisma errors after switching DB:** delete `server/prisma/dev.db` and run `npm run db:push`.
- **"Cannot reach the server":** the server terminal must be running (`npm run dev` starts both).
- **Reset everything:** delete `server/prisma/dev.db`, run `npm run db:push`, and clear site data for localhost:3000 in the browser.
