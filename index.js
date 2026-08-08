const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'quiz.db');
const db = new Database(DB_PATH);

// WAL mode lets many students read/write at once without locking the whole file.
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  year TEXT NOT NULL,
  department TEXT NOT NULL,
  college TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  session_token TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'mcq', -- mcq | truefalse | connections
  text TEXT NOT NULL,
  clues TEXT, -- JSON array of 4 clue strings, used only for type='connections'
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT DEFAULT '',
  option_d TEXT DEFAULT '',
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  category TEXT DEFAULT 'general',
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  round INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | passed | failed | completed
  score INTEGER DEFAULT 0,
  current_index INTEGER DEFAULT 0,
  question_order TEXT NOT NULL, -- JSON array of question ids
  current_question_started_at TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  UNIQUE(student_id, round)
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id TEXT NOT NULL REFERENCES attempts(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  selected_option TEXT,
  is_correct INTEGER NOT NULL,
  time_taken_ms INTEGER,
  answered_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'organizer' -- owner | organizer
);

CREATE INDEX IF NOT EXISTS idx_questions_round ON questions(round);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON answers(attempt_id);
`);

module.exports = db;
