const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const newId = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;

// ---------- Members ----------
app.get('/api/members', (req, res) => {
  const members = db.prepare('SELECT * FROM members ORDER BY sort_order ASC').all();
  res.json(members);
});

app.put('/api/members/:id', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const result = db.prepare('UPDATE members SET name = ? WHERE id = ?').run(name.trim().slice(0, 40), req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Member not found' });
  res.json({ ok: true });
});

// ---------- Settings ----------
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach((r) => { settings[r.key] = r.value; });
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const tx = db.transaction((entries) => {
    for (const [key, value] of entries) upsert.run(key, String(value));
  });
  tx(Object.entries(req.body || {}));
  res.json({ ok: true });
});

// ---------- Exercises ----------
app.get('/api/exercises', (req, res) => {
  const exercises = db.prepare('SELECT * FROM exercises ORDER BY category ASC, name ASC').all();
  res.json(exercises);
});

app.post('/api/exercises', (req, res) => {
  const { name, category } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const cleanName = name.trim().slice(0, 60);
  const id = 'e_' + cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString(36);
  try {
    db.prepare('INSERT INTO exercises (id, name, category, is_preset) VALUES (?, ?, ?, 0)')
      .run(id, cleanName, (category || 'Custom').trim().slice(0, 30));
    res.json(db.prepare('SELECT * FROM exercises WHERE id = ?').get(id));
  } catch (err) {
    if (String(err).includes('UNIQUE')) return res.status(409).json({ error: 'That exercise already exists' });
    res.status(500).json({ error: 'Could not add exercise' });
  }
});

// ---------- Workouts ----------
app.get('/api/workouts', (req, res) => {
  const rows = db.prepare(`
    SELECT w.*, e.name AS exercise_name, e.category AS exercise_category, m.name AS member_name
    FROM workouts w
    JOIN exercises e ON e.id = w.exercise_id
    JOIN members m ON m.id = w.member_id
    ORDER BY w.date ASC, w.created_at ASC
  `).all();
  res.json(rows);
});

app.post('/api/workouts', (req, res) => {
  const { member_id, exercise_id, weight, sets, reps, date } = req.body;
  if (!member_id || !exercise_id || weight === undefined || !date) {
    return res.status(400).json({ error: 'member_id, exercise_id, weight, and date are required' });
  }
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(member_id);
  const exercise = db.prepare('SELECT id FROM exercises WHERE id = ?').get(exercise_id);
  if (!member) return res.status(400).json({ error: 'Unknown member' });
  if (!exercise) return res.status(400).json({ error: 'Unknown exercise' });

  const id = newId('w');
  db.prepare(`
    INSERT INTO workouts (id, member_id, exercise_id, weight, sets, reps, date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, member_id, exercise_id, Number(weight), sets ? Number(sets) : null, reps ? Number(reps) : null, date, new Date().toISOString());

  const row = db.prepare(`
    SELECT w.*, e.name AS exercise_name, e.category AS exercise_category, m.name AS member_name
    FROM workouts w JOIN exercises e ON e.id = w.exercise_id JOIN members m ON m.id = w.member_id
    WHERE w.id = ?
  `).get(id);
  res.status(201).json(row);
});

app.delete('/api/workouts/:id', (req, res) => {
  const { member_id } = req.query;
  const row = db.prepare('SELECT member_id FROM workouts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (member_id && row.member_id !== member_id) {
    return res.status(403).json({ error: 'You can only delete your own entries' });
  }
  db.prepare('DELETE FROM workouts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Squad Lift Tracker running at http://localhost:${PORT}`);
});
