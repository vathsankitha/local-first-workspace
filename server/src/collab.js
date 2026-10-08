import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import { prisma, getMembership } from './db.js';

// Compact the whole doc into ONE update so the table never grows unbounded.
export async function saveDocument(document, documentName) {
  const state = Buffer.from(Y.encodeStateAsUpdate(document));
  try {
    await prisma.$transaction([
      prisma.documentUpdate.deleteMany({ where: { documentId: documentName } }),
      prisma.documentUpdate.create({ data: { documentId: documentName, update: state } }),
      prisma.document.update({ where: { id: documentName }, data: { updatedAt: new Date() } }),
    ]);
  } catch (err) {
    // e.g. the document was deleted while someone still had it open
    console.warn(`[collab] could not store ${documentName}:`, err.message);
  }
}

/**
 * Hocuspocus = the Yjs sync server.
 *  - onAuthenticate : checks the user belongs to the document's workspace
 *                     (VIEWERs get a read-only connection)
 *  - onLoadDocument : rebuilds the Y.Doc from PostgreSQL/SQLite when a room opens
 *  - onStoreDocument: debounced write of the merged state back to the database
 */
export const hocuspocus = new Hocuspocus({
  name: 'workspace-sync',
  debounce: 2000,      // wait 2s after the last edit before saving
  maxDebounce: 10000,  // but never wait longer than 10s while people type

  async onAuthenticate({ token, documentName, connection }) {
    const user = token ? await prisma.user.findUnique({ where: { id: token } }) : null;
    if (!user) throw new Error('Unauthorized');

    const doc = await prisma.document.findUnique({ where: { id: documentName } });
    if (!doc) throw new Error('Document not found');

    const membership = await getMembership(user.id, doc.workspaceId);
    if (!membership) throw new Error('Forbidden');

    if (membership.role === 'VIEWER') connection.readOnly = true;
    return { user: { id: user.id, name: user.name || user.email } };
  },

  async onLoadDocument({ document, documentName }) {
    const rows = await prisma.documentUpdate.findMany({
      where: { documentId: documentName },
      orderBy: { createdAt: 'asc' },
    });
    for (const row of rows) Y.applyUpdate(document, new Uint8Array(row.update));
    return document;
  },

  async onStoreDocument({ document, documentName }) {
    await saveDocument(document, documentName);
  },
});
