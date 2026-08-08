const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { signStudentToken, requireStudent } = require('../middleware/auth');

const router = express.Router();

function clean(v) {
  return typeof v === 'string' ? v.trim() : v;
}

router.post('/', (req, res) => {
  const name = clean(req.body.name);
  const studentClass = clean(req.body.class);
  const year = clean(req.body.year);
  const department = clean(req.body.department);
  const college = clean(req.body.college);
  const phone = clean(req.body.phone);

  if (!name || !studentClass || !year || !department || !college || !phone) {
    return res.status(400).json({ error: 'Please fill in every field before starting.' });
  }
  if (!/^[0-9]{10}$/.test(phone.replace(/\D/g, '').slice(-10))) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit contact number.' });
  }
  const normalizedPhone = phone.replace(/\D/g, '').slice(-10);

  const existing = db.prepare('SELECT id FROM students WHERE phone = ?').get(normalizedPhone);
  if (existing) {
    // Same number already registered -> resume their existing session instead of duplicating.
    const token = signStudentToken(existing.id);
    db.prepare('UPDATE students SET session_token = ? WHERE id = ?').run(token, existing.id);
    return res.json({ token, studentId: existing.id, resumed: true });
  }

  const id = uuidv4();
  const token = signStudentToken(id);
  db.prepare(`
    INSERT INTO students (id, name, class, year, department, college, phone, session_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, studentClass, year, department, college, normalizedPhone, token);

  res.json({ token, studentId: id, resumed: false });
});

router.get('/me', requireStudent, (req, res) => {
  const student = db.prepare('SELECT id, name, class, year, department, college FROM students WHERE id = ?').get(req.studentId);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  res.json({ student });
});

module.exports = router;
