const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireStudent } = require('../middleware/auth');
const { seededShuffle, shuffleOptionsForStudent, getSettingInt } = require('../utils');

const router = express.Router();
router.use(requireStudent);

const ROUND_COUNT_KEY = { 1: 'round1_question_count', 2: 'round2_question_count', 3: 'round3_question_count' };
const PASS_MARK_KEY = { 1: 'round1_pass_mark', 2: 'round2_pass_mark' };

function getAttempt(studentId, round) {
  return db.prepare('SELECT * FROM attempts WHERE student_id = ? AND round = ?').get(studentId, round);
}

function previousRoundPassed(studentId, round) {
  if (round === 1) return true;
  const prev = getAttempt(studentId, round - 1);
  return !!prev && prev.status === 'passed';
}

function publicQuestion(question, studentId, index, total, timeLimitSec, startedAt) {
  const { options } = shuffleOptionsForStudent(question, studentId);
  const elapsed = startedAt ? (Date.now() - new Date(startedAt + 'Z').getTime()) / 1000 : 0;
  const timeLeft = Math.max(0, Math.round(timeLimitSec - elapsed));
  return {
    questionId: question.id,
    type: question.type,
    text: question.text,
    clues: question.clues ? JSON.parse(question.clues) : null,
    category: question.category,
    options,
    index,
    total,
    timeLimitSec,
    timeLeftSec: timeLeft,
  };
}

// Overview of every round's status for the logged-in student.
router.get('/status', (req, res) => {
  const rounds = [1, 2, 3].map((round) => {
    const attempt = getAttempt(req.studentId, round);
    const unlocked = previousRoundPassed(req.studentId, round);
    return {
      round,
      unlocked,
      status: attempt ? attempt.status : 'not_started',
      score: attempt ? attempt.score : null,
      totalQuestions: attempt ? JSON.parse(attempt.question_order).length : getSettingInt(ROUND_COUNT_KEY[round], 20),
    };
  });
  res.json({ rounds });
});

// Start (or resume) a round.
router.post('/round/:round/start', (req, res) => {
  const round = parseInt(req.params.round, 10);
  if (![1, 2, 3].includes(round)) return res.status(400).json({ error: 'Invalid round.' });

  if (!previousRoundPassed(req.studentId, round)) {
    return res.status(403).json({ error: 'You have not unlocked this round yet.' });
  }

  let attempt = getAttempt(req.studentId, round);

  if (attempt && (attempt.status === 'passed' || attempt.status === 'failed')) {
    return res.json({ alreadyCompleted: true, status: attempt.status, score: attempt.score, total: JSON.parse(attempt.question_order).length });
  }

  const timeLimitSec = getSettingInt('question_time_limit_sec', 20);

  if (!attempt) {
    const wantCount = getSettingInt(ROUND_COUNT_KEY[round], 20);
    const allIds = db.prepare('SELECT id FROM questions WHERE round = ? AND active = 1').all(round).map((r) => r.id);
    if (allIds.length === 0) {
      return res.status(500).json({ error: 'No questions have been added for this round yet. Please contact the organisers.' });
    }
    const shuffled = seededShuffle(allIds, `${req.studentId}:round${round}`);
    const chosen = shuffled.slice(0, Math.min(wantCount, shuffled.length));
    const id = uuidv4();
    db.prepare(`
      INSERT INTO attempts (id, student_id, round, status, score, current_index, question_order, current_question_started_at)
      VALUES (?, ?, ?, 'in_progress', 0, 0, ?, datetime('now'))
    `).run(id, req.studentId, round, JSON.stringify(chosen));
    attempt = getAttempt(req.studentId, round);
  } else if (!attempt.current_question_started_at) {
    db.prepare('UPDATE attempts SET current_question_started_at = datetime(\'now\') WHERE id = ?').run(attempt.id);
    attempt = getAttempt(req.studentId, round);
  }

  const order = JSON.parse(attempt.question_order);
  const qId = order[attempt.current_index];
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(qId);
  res.json({
    alreadyCompleted: false,
    question: publicQuestion(question, req.studentId, attempt.current_index, order.length, timeLimitSec, attempt.current_question_started_at),
  });
});

// Submit an answer for the current question and advance.
router.post('/round/:round/answer', (req, res) => {
  const round = parseInt(req.params.round, 10);
  const { questionId, selectedOption } = req.body; // selectedOption is the DISPLAY letter shown to the student, or null if timed out

  const attempt = getAttempt(req.studentId, round);
  if (!attempt || attempt.status !== 'in_progress') {
    return res.status(400).json({ error: 'No active attempt for this round.' });
  }
  const order = JSON.parse(attempt.question_order);
  const expectedQId = order[attempt.current_index];
  if (parseInt(questionId, 10) !== expectedQId) {
    return res.status(409).json({ error: 'That question is no longer current. Refresh to continue.' });
  }

  const timeLimitSec = getSettingInt('question_time_limit_sec', 20);
  const startedAt = attempt.current_question_started_at ? new Date(attempt.current_question_started_at + 'Z').getTime() : Date.now();
  const elapsedSec = (Date.now() - startedAt) / 1000;
  const timedOut = elapsedSec > timeLimitSec + 3; // small grace period for network latency

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(expectedQId);
  const { displayToReal } = shuffleOptionsForStudent(question, req.studentId);
  const realSelected = selectedOption ? displayToReal[selectedOption] : null;
  const isCorrect = !timedOut && realSelected === question.correct_option;

  db.prepare(`
    INSERT INTO answers (attempt_id, question_id, selected_option, is_correct, time_taken_ms)
    VALUES (?, ?, ?, ?, ?)
  `).run(attempt.id, expectedQId, realSelected, isCorrect ? 1 : 0, Math.round(elapsedSec * 1000));

  const newIndex = attempt.current_index + 1;
  const newScore = attempt.score + (isCorrect ? 1 : 0);
  const isLast = newIndex >= order.length;

  if (isLast) {
    const passMark = round < 3 ? getSettingInt(PASS_MARK_KEY[round], Math.ceil(order.length * 0.6)) : null;
    const finalStatus = round === 3 ? 'completed' : (newScore >= passMark ? 'passed' : 'failed');
    db.prepare(`
      UPDATE attempts SET current_index = ?, score = ?, status = ?, completed_at = datetime('now'), current_question_started_at = NULL
      WHERE id = ?
    `).run(newIndex, newScore, finalStatus, attempt.id);
    return res.json({
      roundComplete: true,
      score: newScore,
      total: order.length,
      status: finalStatus,
      passMark,
    });
  }

  db.prepare(`
    UPDATE attempts SET current_index = ?, score = ?, current_question_started_at = datetime('now')
    WHERE id = ?
  `).run(newIndex, newScore, attempt.id);

  const nextQ = db.prepare('SELECT * FROM questions WHERE id = ?').get(order[newIndex]);
  res.json({
    roundComplete: false,
    question: publicQuestion(nextQ, req.studentId, newIndex, order.length, timeLimitSec, new Date().toISOString().replace('Z', '')),
  });
});

router.get('/round/:round/result', (req, res) => {
  const round = parseInt(req.params.round, 10);
  const attempt = getAttempt(req.studentId, round);
  if (!attempt) return res.status(404).json({ error: 'No attempt found for this round.' });
  const order = JSON.parse(attempt.question_order);
  res.json({
    round,
    status: attempt.status,
    score: attempt.score,
    total: order.length,
  });
});

module.exports = router;
