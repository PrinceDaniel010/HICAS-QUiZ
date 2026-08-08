const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signAdminToken, requireAdmin, requireOwner } = require('../middleware/auth');
const { getSetting, setSetting } = require('../utils');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password || '', admin.password_hash)) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  res.json({ token: signAdminToken(admin.username, admin.role), role: admin.role, username: admin.username });
});

router.use(requireAdmin);

// Any logged-in admin (owner or organizer) can change their own password.
router.put('/me/password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const me = db.prepare('SELECT * FROM admins WHERE username = ?').get(req.adminUsername);
  if (!me || !bcrypt.compareSync(currentPassword || '', me.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(hash, req.adminUsername);
  res.json({ ok: true });
});

// ---- Organizer accounts (owner only) ----
router.get('/organizers', requireOwner, (req, res) => {
  const rows = db.prepare('SELECT username, role FROM admins ORDER BY role DESC, username').all();
  res.json({ organizers: rows });
});

router.post('/organizers', requireOwner, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username and a password of at least 6 characters are required.' });
  }
  const existing = db.prepare('SELECT username FROM admins WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'That username is already taken.' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, 'organizer');
  res.json({ ok: true });
});

router.delete('/organizers/:username', requireOwner, (req, res) => {
  const target = req.params.username;
  const targetRow = db.prepare('SELECT * FROM admins WHERE username = ?').get(target);
  if (!targetRow) return res.status(404).json({ error: 'Organizer not found.' });
  if (targetRow.role === 'owner') return res.status(400).json({ error: 'The owner account cannot be removed.' });
  db.prepare('DELETE FROM admins WHERE username = ?').run(target);
  res.json({ ok: true });
});

// Owner can reset the password for any account, including their own.
router.put('/organizers/:username/password', requireOwner, (req, res) => {
  const target = req.params.username;
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const targetRow = db.prepare('SELECT * FROM admins WHERE username = ?').get(target);
  if (!targetRow) return res.status(404).json({ error: 'Account not found.' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(hash, target);
  res.json({ ok: true });
});

// ---- Settings ----
const SETTING_KEYS = [
  'event_name', 'round1_question_count', 'round2_question_count', 'round3_question_count',
  'round1_pass_mark', 'round2_pass_mark', 'question_time_limit_sec',
];

router.get('/settings', (req, res) => {
  const settings = {};
  SETTING_KEYS.forEach((k) => { settings[k] = getSetting(k, ''); });
  res.json({ settings });
});

router.put('/settings', (req, res) => {
  const body = req.body || {};
  SETTING_KEYS.forEach((k) => {
    if (body[k] !== undefined && body[k] !== '') setSetting(k, body[k]);
  });
  res.json({ ok: true });
});

// ---- Questions ----
router.get('/questions', (req, res) => {
  const round = req.query.round ? parseInt(req.query.round, 10) : null;
  const rows = round
    ? db.prepare('SELECT * FROM questions WHERE round = ? ORDER BY id').all(round)
    : db.prepare('SELECT * FROM questions ORDER BY round, id').all();
  res.json({ questions: rows });
});

router.post('/questions', (req, res) => {
  const { round, type, text, clues, option_a, option_b, option_c, option_d, correct_option, category } = req.body;
  const qType = type || 'mcq';
  if (!round || !text || !option_a || !option_b || !correct_option) {
    return res.status(400).json({ error: 'Round, text, at least two options, and the correct option are required.' });
  }
  if (qType !== 'truefalse' && (!option_c || !option_d)) {
    return res.status(400).json({ error: 'All four options are required for this question type.' });
  }
  if (qType === 'connections' && (!Array.isArray(clues) || clues.length !== 4)) {
    return res.status(400).json({ error: 'Connections questions need exactly 4 clues.' });
  }
  const validLetters = qType === 'truefalse' ? ['A', 'B'] : ['A', 'B', 'C', 'D'];
  if (!validLetters.includes(correct_option.toUpperCase())) {
    return res.status(400).json({ error: `correct_option must be one of ${validLetters.join(', ')}.` });
  }
  const info = db.prepare(`
    INSERT INTO questions (round, type, text, clues, option_a, option_b, option_c, option_d, correct_option, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(round, qType, text, qType === 'connections' ? JSON.stringify(clues) : null,
    option_a, option_b, option_c || '', option_d || '', correct_option.toUpperCase(), category || 'general');
  res.json({ id: info.lastInsertRowid });
});

// Bulk import - accepts an array of question objects, same shape as single create.
router.post('/questions/bulk', (req, res) => {
  const items = req.body.questions;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Send { questions: [...] } with at least one question.' });
  }
  const insert = db.prepare(`
    INSERT INTO questions (round, type, text, clues, option_a, option_b, option_c, option_d, correct_option, category)
    VALUES (@round, @type, @text, @clues, @option_a, @option_b, @option_c, @option_d, @correct_option, @category)
  `);
  let inserted = 0;
  const errors = [];
  const tx = db.transaction((rows) => {
    rows.forEach((r, idx) => {
      const qType = r.type || 'mcq';
      if (!r.round || !r.text || !r.option_a || !r.option_b || !r.correct_option) {
        errors.push({ index: idx, error: 'Missing field(s)' });
        return;
      }
      insert.run({
        round: r.round,
        type: qType,
        text: r.text,
        clues: qType === 'connections' ? JSON.stringify(r.clues || []) : null,
        option_a: r.option_a,
        option_b: r.option_b,
        option_c: r.option_c || '',
        option_d: r.option_d || '',
        correct_option: String(r.correct_option).toUpperCase(),
        category: r.category || 'general',
      });
      inserted += 1;
    });
  });
  tx(items);
  res.json({ inserted, errors });
});

router.put('/questions/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Question not found.' });
  const fields = ['round', 'type', 'text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'category', 'active'];
  const updated = { ...existing };
  fields.forEach((f) => { if (req.body[f] !== undefined) updated[f] = req.body[f]; });
  const clues = req.body.clues !== undefined ? (Array.isArray(req.body.clues) ? JSON.stringify(req.body.clues) : req.body.clues) : existing.clues;
  db.prepare(`
    UPDATE questions SET round=?, type=?, text=?, clues=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=?, category=?, active=?
    WHERE id = ?
  `).run(updated.round, updated.type, updated.text, clues, updated.option_a, updated.option_b, updated.option_c || '', updated.option_d || '',
    String(updated.correct_option).toUpperCase(), updated.category, updated.active ? 1 : 0, id);
  res.json({ ok: true });
});

router.delete('/questions/:id', (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(parseInt(req.params.id, 10));
  res.json({ ok: true });
});

// ---- Results / leaderboard ----
router.get('/results', (req, res) => {
  const students = db.prepare('SELECT * FROM students ORDER BY created_at DESC').all();
  const attempts = db.prepare('SELECT * FROM attempts').all();
  const byStudent = {};
  attempts.forEach((a) => {
    byStudent[a.student_id] = byStudent[a.student_id] || {};
    byStudent[a.student_id][a.round] = { status: a.status, score: a.score, total: JSON.parse(a.question_order).length };
  });
  const results = students.map((s) => ({
    id: s.id,
    name: s.name,
    class: s.class,
    year: s.year,
    department: s.department,
    college: s.college,
    phone: s.phone,
    rounds: byStudent[s.id] || {},
  }));
  res.json({ results });
});

router.get('/results.csv', (req, res) => {
  const students = db.prepare('SELECT * FROM students ORDER BY created_at DESC').all();
  const attempts = db.prepare('SELECT * FROM attempts').all();
  const byStudent = {};
  attempts.forEach((a) => {
    byStudent[a.student_id] = byStudent[a.student_id] || {};
    byStudent[a.student_id][a.round] = `${a.score}/${JSON.parse(a.question_order).length} (${a.status})`;
  });
  const header = ['Name', 'Class', 'Year', 'Department', 'College', 'Phone', 'Round 1', 'Round 2', 'Round 3'];
  const lines = [header.join(',')];
  students.forEach((s) => {
    const r = byStudent[s.id] || {};
    const row = [s.name, s.class, s.year, s.department, s.college, s.phone, r[1] || '-', r[2] || '-', r[3] || '-']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(row.join(','));
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="quiz-results.csv"');
  res.send(lines.join('\n'));
});

module.exports = router;
