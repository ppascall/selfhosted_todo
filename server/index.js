import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 3737;
const DB_PATH = process.env.DB_PATH || path.resolve('data/todo.db');
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.resolve('public');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS tasks (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    date       TEXT,
    time       TEXT,
    created_at INTEGER NOT NULL,
    done_at    INTEGER
  );
`);

const toTask = (r) => ({
  id: r.id,
  title: r.title,
  done: r.done === 1,
  date: r.date,
  time: r.time,
  createdAt: r.created_at,
  doneAt: r.done_at,
});

const selectAll = db.prepare('SELECT * FROM tasks ORDER BY created_at, id');
const selectOne = db.prepare('SELECT * FROM tasks WHERE id = ?');
const insert = db.prepare(
  'INSERT INTO tasks (id, title, done, date, time, created_at, done_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
);
const update = db.prepare(
  'UPDATE tasks SET title = ?, done = ?, date = ?, time = ?, done_at = ? WHERE id = ?',
);
const remove = db.prepare('DELETE FROM tasks WHERE id = ?');
const removeDone = db.prepare('DELETE FROM tasks WHERE done = 1');

const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Returns an error string, or null when the task fields are valid.
function check({ title, date, time }) {
  if (typeof title !== 'string' || !title.trim() || title.length > 500) return 'invalid title';
  if (date !== null && !validDate(date)) return 'invalid date';
  if (time !== null && !TIME_RE.test(time)) return 'invalid time';
  if (time !== null && date === null) return 'time requires a date';
  return null;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ ok: true });
});

app.get('/api/tasks', (_req, res) => {
  res.json(selectAll.all().map(toTask));
});

app.post('/api/tasks', (req, res) => {
  const b = req.body ?? {};
  const id = b.id === undefined ? randomUUID() : b.id;
  if (typeof id !== 'string' || !ID_RE.test(id)) return res.status(400).json({ error: 'invalid id' });

  // Same id again means a client retry; return the stored row instead of failing.
  const existing = selectOne.get(id);
  if (existing) return res.json(toTask(existing));

  const fields = {
    title: typeof b.title === 'string' ? b.title.trim() : b.title,
    date: b.date ?? null,
    time: b.time ?? null,
  };
  const err = check(fields);
  if (err) return res.status(400).json({ error: err });

  insert.run(id, fields.title, 0, fields.date, fields.time, Date.now(), null);
  res.status(201).json(toTask(selectOne.get(id)));
});

app.patch('/api/tasks/:id', (req, res) => {
  const row = selectOne.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });

  const b = req.body ?? {};
  const next = {
    title: b.title !== undefined ? (typeof b.title === 'string' ? b.title.trim() : b.title) : row.title,
    date: b.date !== undefined ? b.date : row.date,
    time: b.time !== undefined ? b.time : row.time,
  };
  if (b.date === null && b.time === undefined) next.time = null;
  if (b.done !== undefined && typeof b.done !== 'boolean') return res.status(400).json({ error: 'invalid done' });
  const err = check(next);
  if (err) return res.status(400).json({ error: err });

  const done = b.done === undefined ? row.done : b.done ? 1 : 0;
  const doneAt = done === row.done ? row.done_at : done ? Date.now() : null;
  update.run(next.title, done, next.date, next.time, doneAt, row.id);
  res.json(toTask(selectOne.get(row.id)));
});

app.delete('/api/tasks/done', (_req, res) => {
  removeDone.run();
  res.status(204).end();
});

app.delete('/api/tasks/:id', (req, res) => {
  remove.run(req.params.id);
  res.status(204).end();
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

app.use(
  express.static(PUBLIC_DIR, {
    setHeaders(res, file) {
      if (file.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (file.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);
app.get('*', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ error: 'bad request' });
  }
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

const server = app.listen(PORT, () => console.log(`todo listening on :${PORT}, db at ${DB_PATH}`));

function shutdown() {
  server.close(() => {
    try {
      db.close();
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
