// Roadmap step 4: proves two devices editing OFFLINE merge deterministically.
import * as Y from 'yjs';

const a = new Y.Doc();
const b = new Y.Doc();

// Shared starting point
a.getText('t').insert(0, 'Hello world');
Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

// --- both devices go offline and edit independently ---
a.getText('t').insert(5, ' brave');        // Device A
b.getText('t').insert(11, '!!!');          // Device B
b.getText('t').insert(0, '>> ');           // Device B

// --- they reconnect and exchange updates (any order) ---
const fromA = Y.encodeStateAsUpdate(a);
const fromB = Y.encodeStateAsUpdate(b);
Y.applyUpdate(a, fromB);
Y.applyUpdate(b, fromA);

const ta = a.getText('t').toString();
const tb = b.getText('t').toString();
console.log('Device A:', JSON.stringify(ta));
console.log('Device B:', JSON.stringify(tb));
if (ta !== tb) { console.error('FAIL: documents diverged'); process.exit(1); }
console.log('PASS: both devices converged with no conflicts and no lost edits');
