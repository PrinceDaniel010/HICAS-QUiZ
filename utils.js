const db = require('./db');

// Deterministic string -> 32bit seed
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// Shuffle an array deterministically based on a seed string. Same seed always
// produces the same order, which lets the server re-derive it without storing it.
function seededShuffle(array, seedString) {
  const rand = hashSeed(seedString);
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function getSettingInt(key, fallback) {
  const v = getSetting(key, fallback);
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value));
}

// Given a question row and a per-student seed, return the options in a shuffled
// order (labelled A-D again) plus a map to translate the student's chosen
// display-letter back to the real stored letter for grading. Empty options
// (used by truefalse questions, which only have A/B) are skipped entirely.
function shuffleOptionsForStudent(question, seed) {
  const letters = ['A', 'B', 'C', 'D'];
  const pairs = letters
    .map((l) => ({ letter: l, text: question[`option_${l.toLowerCase()}`] }))
    .filter((p) => p.text !== null && p.text !== undefined && p.text !== '');
  const shuffled = seededShuffle(pairs, `${seed}:${question.id}`);
  const displayToReal = {};
  const options = shuffled.map((p, idx) => {
    const displayLetter = letters[idx];
    displayToReal[displayLetter] = p.letter;
    return { letter: displayLetter, text: p.text };
  });
  return { options, displayToReal };
}

module.exports = {
  seededShuffle,
  getSetting,
  getSettingInt,
  setSetting,
  shuffleOptionsForStudent,
};
