'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sanitizeHtml = require('sanitize-html');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'stories.json');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 24) {
  console.error('Set ADMIN_TOKEN to a long random secret (at least 24 characters) before starting the server.');
  process.exit(1);
}

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token']
}));
app.use(express.json({ limit: '1mb' }));

function ensureStore() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]\n', 'utf8');
}
function readStories() {
  ensureStore();
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return Array.isArray(data) ? data : [];
}
function writeStories(stories) {
  ensureStore();
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(stories, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}
function requireAdmin(req, res, next) {
  const supplied = req.get('x-admin-token') || '';
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Publishing key is incorrect or missing.' });
  }
  next();
}
function plain(value, max = 3000) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}
function cleanBody(value) {
  return sanitizeHtml(String(value || ''), {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'mark'],
    allowedAttributes: { a: ['href', 'title'], mark: ['style', 'data-ink-highlight'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true) }
  });
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'campus-chronicles-api' }));
app.get('/api/stories', (_req, res) => {
  const stories = readStories().filter(s => s.status === 'published')
    .sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
  res.set('Cache-Control', 'no-store');
  res.json({ stories });
});
app.post('/api/stories', requireAdmin, (req, res) => {
  const input = req.body || {};
  const title = plain(input.title, 120);
  const author = plain(input.author, 80);
  if (!title || !author) return res.status(400).json({ error: 'A story title and byline are required.' });
  const stories = readStories();
  const id = plain(input.id, 100) || `story-${crypto.randomUUID()}`;
  const existing = stories.find(s => s.id === id);
  const now = new Date().toISOString();
  const story = {
    id, title, author,
    excerpt: plain(input.excerpt, 260),
    category: plain(input.category, 60) || 'Story',
    edition: plain(input.edition, 60),
    date: /^\d{4}-\d{2}-\d{2}$/.test(input.date || '') ? input.date : now.slice(0, 10),
    body: cleanBody(input.body),
    status: 'published',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    publishedAt: existing?.publishedAt || now
  };
  const index = stories.findIndex(s => s.id === id);
  if (index >= 0) stories[index] = story; else stories.push(story);
  writeStories(stories);
  res.status(200).json(story);
});
app.delete('/api/stories/:id', requireAdmin, (req, res) => {
  const stories = readStories();
  const next = stories.filter(s => s.id !== req.params.id);
  if (next.length === stories.length) return res.status(404).json({ error: 'Story not found.' });
  writeStories(next);
  res.json({ ok: true });
});

// ---- Suggestion board (public, lightly rate-limited) ----
const SUGG_FILE = path.join(path.dirname(DATA_FILE), 'suggestions.json');
const readSugg = () => { try { const d = JSON.parse(fs.readFileSync(SUGG_FILE, 'utf8')); return Array.isArray(d) ? d : []; } catch { return []; } };
const hits = new Map();
app.get('/api/suggestions', (_req, res) => { res.set('Cache-Control', 'no-store'); res.json({ suggestions: readSugg().slice(-200) }); });
app.post('/api/suggestions', (req, res) => {
  const ip = req.ip, now = Date.now(), recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (recent.length >= 5) return res.status(429).json({ error: 'Slow down a little, then try again.' });
  hits.set(ip, [...recent, now]);
  const input = req.body || {};
  const segments = (Array.isArray(input.segments) ? input.segments : []).slice(0, 6).map(s => plain(s, 220)).filter(Boolean);
  if (!segments.length) return res.status(400).json({ error: 'Write something first.' });
  fs.mkdirSync(path.dirname(SUGG_FILE), { recursive: true });
  const item = { id: crypto.randomUUID(), authorId: plain(input.authorId, 40) || 'anon', name: plain(input.name, 30), segments, createdAt: new Date().toISOString() };
  fs.writeFileSync(SUGG_FILE, JSON.stringify([...readSugg(), item], null, 2));
  res.status(201).json(item);
});
app.delete('/api/suggestions/:id', requireAdmin, (req, res) => {
  const all = readSugg(), next = all.filter(s => s.id !== req.params.id);
  if (next.length === all.length) return res.status(404).json({ error: 'Not found.' });
  fs.writeFileSync(SUGG_FILE, JSON.stringify(next, null, 2)); res.json({ ok: true });
});
app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  res.status(error.status || 500).json({ error: error.status === 413 ? 'Request is too large.' : 'The server could not complete that request.' });
});

app.listen(PORT, () => console.log(`Campus Chronicles API listening on port ${PORT}`));
