import express from 'express';
import { prisma, getMembership, ROLE_RANK } from './db.js';

export const router = express.Router();

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workspace';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- Login (identity only; swap for real auth later) ----------------------
router.post('/login', wrap(async (req, res) => {
  const { name, email } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Valid email required' });
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: name ? { name } : {},
    create: { email: email.toLowerCase(), name: name || email.split('@')[0] },
  });
  res.json(user);
}));

// ---- Everything below requires x-user-id -----------------------------------
router.use(wrap(async (req, res, next) => {
  const id = req.header('x-user-id');
  const user = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  next();
}));

// ---- Workspaces ------------------------------------------------------------
router.get('/workspaces', wrap(async (req, res) => {
  const rows = await prisma.workspaceMember.findMany({
    where: { userId: req.user.id },
    include: { workspace: true },
    orderBy: { workspace: { createdAt: 'asc' } },
  });
  res.json(rows.map((m) => ({ ...m.workspace, role: m.role })));
}));

router.post('/workspaces', wrap(async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  let slug = slugify(name);
  if (await prisma.workspace.findUnique({ where: { slug } })) {
    slug += '-' + Math.random().toString(36).slice(2, 6);
  }
  const ws = await prisma.workspace.create({
    data: { name, slug, members: { create: { userId: req.user.id, role: 'OWNER' } } },
  });
  res.status(201).json({ ...ws, role: 'OWNER' });
}));

router.post('/workspaces/join', wrap(async (req, res) => {
  const slug = (req.body?.slug || '').trim().toLowerCase();
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) return res.status(404).json({ error: 'No workspace with that invite code' });
  const existing = await getMembership(req.user.id, ws.id);
  const member = existing || await prisma.workspaceMember.create({
    data: { userId: req.user.id, workspaceId: ws.id, role: 'MEMBER' },
  });
  res.json({ ...ws, role: member.role });
}));

router.get('/workspaces/:id/members', wrap(async (req, res) => {
  if (!(await getMembership(req.user.id, req.params.id))) return res.status(403).json({ error: 'Forbidden' });
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.params.id },
    include: { user: true },
  });
  res.json(rows.map((m) => ({ userId: m.userId, role: m.role, name: m.user.name, email: m.user.email })));
}));

router.patch('/workspaces/:id/members/:userId', wrap(async (req, res) => {
  const me = await getMembership(req.user.id, req.params.id);
  if (!me || ROLE_RANK[me.role] < ROLE_RANK.ADMIN) return res.status(403).json({ error: 'Admins only' });
  const role = req.body?.role;
  if (!(role in ROLE_RANK) || role === 'OWNER') return res.status(400).json({ error: 'Invalid role' });
  const target = await getMembership(req.params.userId, req.params.id);
  if (!target) return res.status(404).json({ error: 'Member not found' });
  if (target.role === 'OWNER') return res.status(403).json({ error: 'Cannot change the owner' });
  const updated = await prisma.workspaceMember.update({ where: { id: target.id }, data: { role } });
  res.json(updated);
}));

// ---- Documents -------------------------------------------------------------
router.get('/workspaces/:id/documents', wrap(async (req, res) => {
  if (!(await getMembership(req.user.id, req.params.id))) return res.status(403).json({ error: 'Forbidden' });
  const docs = await prisma.document.findMany({
    where: { workspaceId: req.params.id },
    orderBy: { updatedAt: 'desc' },
    include: { creator: { select: { name: true } } },
  });
  res.json(docs);
}));

router.post('/workspaces/:id/documents', wrap(async (req, res) => {
  const me = await getMembership(req.user.id, req.params.id);
  if (!me || ROLE_RANK[me.role] < ROLE_RANK.MEMBER) return res.status(403).json({ error: 'Members only' });
  const doc = await prisma.document.create({
    data: { title: (req.body?.title || '').trim() || 'Untitled', workspaceId: req.params.id, creatorId: req.user.id },
  });
  res.status(201).json(doc);
}));

router.get('/documents/:id', wrap(async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const me = await getMembership(req.user.id, doc.workspaceId);
  if (!me) return res.status(403).json({ error: 'Forbidden' });
  res.json({ ...doc, role: me.role });
}));

router.patch('/documents/:id', wrap(async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const me = await getMembership(req.user.id, doc.workspaceId);
  if (!me || ROLE_RANK[me.role] < ROLE_RANK.MEMBER) return res.status(403).json({ error: 'Members only' });
  const title = (req.body?.title || '').trim() || 'Untitled';
  res.json(await prisma.document.update({ where: { id: doc.id }, data: { title } }));
}));

router.delete('/documents/:id', wrap(async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const me = await getMembership(req.user.id, doc.workspaceId);
  const allowed = me && (doc.creatorId === req.user.id || ROLE_RANK[me.role] >= ROLE_RANK.ADMIN);
  if (!allowed) return res.status(403).json({ error: 'Only the creator or an admin can delete' });
  await prisma.document.delete({ where: { id: doc.id } });
  res.json({ ok: true });
}));
