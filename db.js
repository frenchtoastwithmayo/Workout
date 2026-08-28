const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'squad.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color_idx INTEGER NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Custom',
  is_preset INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  weight REAL NOT NULL,
  sets INTEGER,
  reps INTEGER,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

// --- Seed members (only if empty) ---
const memberCount = db.prepare('SELECT COUNT(*) AS c FROM members').get().c;
if (memberCount === 0) {
  const insert = db.prepare('INSERT INTO members (id, name, color_idx, sort_order) VALUES (?, ?, ?, ?)');
  insert.run('m1', 'You', 0, 0);
  insert.run('m2', 'Friend 2', 1, 1);
  insert.run('m3', 'Friend 3', 2, 2);
}

// --- Seed settings ---
const unitSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('unit');
if (!unitSetting) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('unit', 'lbs');
}

// --- Seed preset exercises ---
const exerciseCount = db.prepare('SELECT COUNT(*) AS c FROM exercises').get().c;
if (exerciseCount === 0) {
  const PRESETS = [
    ['Bench Press', 'Push'],
    ['Overhead Press', 'Push'],
    ['Incline Dumbbell Press', 'Push'],
    ['Tricep Pushdown', 'Push'],
    ['Dips', 'Push'],
    ['Deadlift', 'Pull'],
    ['Barbell Row', 'Pull'],
    ['Pull-up', 'Pull'],
    ['Lat Pulldown', 'Pull'],
    ['Bicep Curl', 'Pull'],
    ['Squat', 'Legs'],
    ['Leg Press', 'Legs'],
    ['Romanian Deadlift', 'Legs'],
    ['Leg Extension', 'Legs'],
    ['Calf Raise', 'Legs'],
    ['Plank', 'Core'],
    ['Hanging Leg Raise', 'Core'],
  ];
  const insert = db.prepare('INSERT INTO exercises (id, name, category, is_preset) VALUES (?, ?, ?, 1)');
  const tx = db.transaction((rows) => {
    for (const [name, category] of rows) {
      insert.run('e_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name, category);
    }
  });
  tx(PRESETS);
}

module.exports = db;
