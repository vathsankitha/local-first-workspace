import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { hocuspocus, saveDocument } from './collab.js';
import { router } from './routes.js';

const PORT = Number(process.env.PORT || 4000);

// CLIENT_ORIGIN can hold several comma-separated URLs, e.g.
// "http://localhost:3000,https://my-app.vercel.app"
const ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));

const app = express();
app.use(cors({ origin: ORIGINS }));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', router);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const server = http.createServer(app);

// WebSocket endpoint for Yjs sync -> /collab
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (ws, req) => hocuspocus.handleConnection(ws, req));
server.on('upgrade', (req, socket, head) => {
  if (!req.url?.startsWith('/collab')) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

// 0.0.0.0 lets hosting platforms reach the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins: ${ORIGINS.join(', ')}`);
  console.log(`API  -> /api    Yjs sync -> /collab`);
});

const shutdown = async () => {
  console.log('Saving open documents...');
  for (const [name, doc] of hocuspocus.documents) await saveDocument(doc, name);
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);