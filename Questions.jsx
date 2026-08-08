import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

const ROUND_TYPE = { 1: 'mcq', 2: 'truefalse', 3: 'connections' };
const ROUND_LABEL = { 1: 'Round 1 · General MCQ', 2: 'Round 2 · Truth or Lie', 3: 'Round 3 · Connections' };

function emptyForm(round) {
  const type = ROUND_TYPE[round];
  return {
    round,
    type,
    text: type === 'connections' ? 'What connects these four?' : '',
    clues: ['', '', '', ''],
    option_a: type === 'truefalse' ? 'True' : '',
    option_b: type === 'truefalse' ? 'False' : '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    category: 'general',
  };
}

export default function Questions() {
  const [round, setRound] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm(1));
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const load = async (r) => {
    const res = await api.adminGet(`/questions?round=${r}`);
    setQuestions(res.questions);
  };

  useEffect(() => { load(round); setForm(emptyForm(round)); setEditingId(null); }, [round]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const payload = { ...form };
    if (form.type !== 'connections') delete payload.clues;
    try {
      if (editingId) {
        await api.adminPut(`/questions/${editingId}`, payload);
        setNotice('Question updated.');
      } else {
        await api.adminPost('/questions', payload);
        setNotice('Question added.');
      }
      setForm(emptyForm(round));
      setEditingId(null);
      load(round);
    } catch (err) {
      setError(err.message);
    }
  };

  const edit = (qq) => {
    setForm({
      round: qq.round,
      type: qq.type,
      text: qq.text,
      clues: qq.clues ? JSON.parse(qq.clues) : ['', '', '', ''],
      option_a: qq.option_a, option_b: qq.option_b, option_c: qq.option_c, option_d: qq.option_d,
      correct_option: qq.correct_option,
      category: qq.category,
    });
    setEditingId(qq.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setForm(emptyForm(round)); setEditingId(null); };

  const remove = async (id) => {
    if (!confirm('Delete this question?')) return;
    await api.adminDelete(`/questions/${id}`);
    load(round);
  };

  const submitBulk = async () => {
    setError('');
    setNotice('');
    try {
      const parsed = JSON.parse(bulkText);
      const res = await api.adminPost('/questions/bulk', { questions: parsed });
      setNotice(`Imported ${res.inserted} question(s).${res.errors.length ? ` ${res.errors.length} skipped - check format.` : ''}`);
      setBulkText('');
      setShowBulk(false);
      load(round);
    } catch (err) {
      setError('Could not import: ' + err.message);
    }
  };

  const setClue = (i, value) => setForm((f) => ({ ...f, clues: f.clues.map((c, idx) => (idx === i ? value : c)) }));

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-card border border-ink-50 p-6 sticky top-6">
          <h2 className="font-display text-xl font-semibold mb-1">{editingId ? 'Edit question' : 'Add a question'}</h2>
          <p className="text-xs text-ink-400 mb-4">{ROUND_LABEL[round]}</p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink-400 mb-1">Round</label>
              <select
                value={form.round}
                onChange={(e) => { const r = parseInt(e.target.value, 10); setRound(r); }}
                className="w-full rounded-lg border border-ink-100 px-3 py-2"
              >
                <option value={1}>Round 1 - General MCQ</option>
                <option value={2}>Round 2 - Truth or Lie</option>
                <option value={3}>Round 3 - Connections</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-400 mb-1">Category</label>
              <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-lg border border-ink-100 px-3 py-2" />
            </div>

            {form.type === 'mcq' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-ink-400 mb-1">Question text</label>
                  <textarea required value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={2} className="w-full rounded-lg border border-ink-100 px-3 py-2" />
                </div>
                {['a', 'b', 'c', 'd'].map((letter) => (
                  <div key={letter}>
                    <label className="block text-xs font-semibold text-ink-400 mb-1">Option {letter.toUpperCase()}</label>
                    <input required value={form[`option_${letter}`]} onChange={(e) => setForm((f) => ({ ...f, [`option_${letter}`]: e.target.value }))} className="w-full rounded-lg border border-ink-100 px-3 py-2" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-ink-400 mb-1">Correct option</label>
                  <select value={form.correct_option} onChange={(e) => setForm((f) => ({ ...f, correct_option: e.target.value }))} className="w-full rounded-lg border border-ink-100 px-3 py-2">
                    <option>A</option><option>B</option><option>C</option><option>D</option>
                  </select>
                </div>
              </>
            )}

            {form.type === 'truefalse' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-ink-400 mb-1">Statement</label>
                  <textarea required value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={2} placeholder="e.g. The Great Wall of China is visible from the Moon." className="w-full rounded-lg border border-ink-100 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-400 mb-1">Is the statement true or false?</label>
                  <select value={form.correct_option} onChange={(e) => setForm((f) => ({ ...f, correct_option: e.target.value }))} className="w-full rounded-lg border border-ink-100 px-3 py-2">
                    <option value="A">True</option>
                    <option value="B">False</option>
                  </select>
                </div>
              </>
            )}

            {form.type === 'connections' && (
              <>
                <p className="text-xs font-semibold text-ink-400">Four clues that share a hidden theme</p>
                {[0, 1, 2, 3].map((i) => (
                  <input key={i} required value={form.clues[i]} onChange={(e) => setClue(i, e.target.value)} placeholder={`Clue ${i + 1}`} className="w-full rounded-lg border border-ink-100 px-3 py-2" />
                ))}
                <p className="text-xs font-semibold text-ink-400 pt-2">Four candidate themes (one correct)</p>
                {['a', 'b', 'c', 'd'].map((letter) => (
                  <div key={letter}>
                    <label className="block text-xs font-semibold text-ink-400 mb-1">Theme {letter.toUpperCase()}</label>
                    <input required value={form[`option_${letter}`]} onChange={(e) => setForm((f) => ({ ...f, [`option_${letter}`]: e.target.value }))} className="w-full rounded-lg border border-ink-100 px-3 py-2" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-ink-400 mb-1">Correct theme</label>
                  <select value={form.correct_option} onChange={(e) => setForm((f) => ({ ...f, correct_option: e.target.value }))} className="w-full rounded-lg border border-ink-100 px-3 py-2">
                    <option>A</option><option>B</option><option>C</option><option>D</option>
                  </select>
                </div>
              </>
            )}

            {error && <p className="text-coral text-sm font-medium">{error}</p>}
            {notice && <p className="text-mint text-sm font-medium">{notice}</p>}
            <div className="flex gap-2">
              <button className="flex-1 rounded-lg bg-ink text-parchment font-semibold py-2.5 hover:bg-ink-600 transition">
                {editingId ? 'Save changes' : 'Add question'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="rounded-lg border border-ink-100 px-4 py-2.5 font-semibold text-ink-600">
                  Cancel
                </button>
              )}
            </div>
          </form>

          <button onClick={() => setShowBulk((s) => !s)} className="mt-4 text-sm font-semibold text-ink-400 underline">
            {showBulk ? 'Hide bulk import' : 'Bulk import (JSON)'}
          </button>
          {showBulk && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-ink-400">
                Paste an array of question objects. MCQ: {'{"round":1,"type":"mcq","text":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_option":"A"}'}. Truth/Lie: {'{"round":2,"type":"truefalse","text":"statement","option_a":"True","option_b":"False","correct_option":"A"}'}. Connections: {'{"round":3,"type":"connections","clues":["c1","c2","c3","c4"],"option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_option":"B"}'}
              </p>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={6} className="w-full rounded-lg border border-ink-100 px-3 py-2 font-mono text-xs" />
              <button onClick={submitBulk} className="w-full rounded-lg bg-gold text-ink font-semibold py-2 hover:bg-gold-soft transition">
                Import
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Question bank</h2>
          <div className="flex gap-1">
            {[1, 2, 3].map((r) => (
              <button
                key={r}
                onClick={() => setRound(r)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${round === r ? 'bg-ink text-parchment' : 'bg-white border border-ink-100 text-ink-600'}`}
              >
                Round {r}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-ink-400 mb-3">{questions.length} question(s) in Round {round}.</p>
        <div className="space-y-3">
          {questions.map((qq) => (
            <div key={qq.id} className="bg-white rounded-xl border border-ink-50 p-4 flex justify-between gap-4">
              <div>
                {qq.type === 'connections' ? (
                  <p className="font-medium">{JSON.parse(qq.clues || '[]').join(' · ')}</p>
                ) : (
                  <p className="font-medium">{qq.text}</p>
                )}
                <p className="text-xs text-ink-400 mt-1">
                  Correct: {qq.type === 'truefalse' ? (qq.correct_option === 'A' ? 'True' : 'False') : qq.correct_option} · {qq.category} {!qq.active && <span className="text-coral">· inactive</span>}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => edit(qq)} className="text-sm font-semibold text-ink-600 hover:underline">Edit</button>
                <button onClick={() => remove(qq.id)} className="text-sm font-semibold text-coral hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {questions.length === 0 && <p className="text-ink-400 text-sm">No questions yet for this round.</p>}
        </div>
      </div>
    </div>
  );
}
