import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AntiCopyGuard from '../components/AntiCopyGuard.jsx';
import Timer from '../components/Timer.jsx';

const ROUND_NAMES = { 1: 'Round 1 · General Quiz', 2: 'Round 2 · Truth or Lie', 3: 'Round 3 · Connections (Finale)' };

export default function Quiz() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [rounds, setRounds] = useState(null);
  const [active, setActive] = useState(null); // { round, question }
  const [roundResult, setRoundResult] = useState(null); // { round, score, total, status }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tabWarning, setTabWarning] = useState(0);

  const loadStatus = useCallback(async () => {
    const [me, status] = await Promise.all([api.me(), api.status()]);
    setStudent(me.student);
    setRounds(status.rounds);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('quiz_token')) {
      navigate('/');
      return;
    }
    loadStatus().catch(() => navigate('/'));
  }, [loadStatus, navigate]);

  const startRound = async (round) => {
    setError('');
    setBusy(true);
    try {
      const res = await api.startRound(round);
      if (res.alreadyCompleted) {
        setRoundResult({ round, score: res.score, total: res.total, status: res.status });
      } else {
        setActive({ round, question: res.question });
        setSelected(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = useCallback(
    async (displayLetter) => {
      if (!active || busy) return;
      setBusy(true);
      setSelected(displayLetter);
      try {
        const res = await api.answer(active.round, {
          questionId: active.question.questionId,
          selectedOption: displayLetter,
        });
        if (res.roundComplete) {
          setActive(null);
          setRoundResult({ round: active.round, score: res.score, total: res.total, status: res.status, passMark: res.passMark });
        } else {
          setActive({ round: active.round, question: res.question });
          setSelected(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [active, busy]
  );

  const backToHub = async () => {
    setRoundResult(null);
    setError('');
    await loadStatus();
  };

  if (!rounds) {
    return <div className="min-h-screen flex items-center justify-center text-ink-400">Loading your quiz pass…</div>;
  }

  // ---- Active question player ----
  if (active) {
    const q = active.question;
    return (
      <div className="min-h-screen px-4 py-8 flex flex-col items-center">
        <AntiCopyGuard onTabHidden={() => setTabWarning((n) => n + 1)} />
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="tag-eyebrow text-ink-400">{ROUND_NAMES[active.round]}</p>
            <p className="text-sm font-semibold text-ink-400">
              Question {q.index + 1} / {q.total}
            </p>
          </div>

          <div className="h-1.5 w-full bg-ink-50 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-mint rounded-full transition-all"
              style={{ width: `${(q.index / q.total) * 100}%` }}
            />
          </div>

          {tabWarning > 0 && (
            <div className="mb-4 rounded-lg bg-coral/10 border border-coral/30 text-coral px-4 py-2 text-sm font-medium">
              Switching tabs during the quiz is noted. Please stay on this page.
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-card border border-ink-50 p-6 md:p-8">
            <Timer
              totalSeconds={q.timeLimitSec}
              startSeconds={q.timeLeftSec}
              questionKey={q.questionId}
              onExpire={() => submitAnswer(null)}
            />

            <p className="tag-eyebrow text-gold mt-6">{q.category}</p>

            {q.type === 'connections' ? (
              <>
                <h2 className="font-display text-xl md:text-2xl font-semibold mt-2 mb-4 leading-snug select-none">
                  What connects these four?
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {q.clues.map((clue, i) => (
                    <div key={i} className="rounded-xl bg-ink text-parchment font-display font-semibold text-center py-5 px-2 select-none">
                      {clue}
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-ink-400 mb-3">Pick the hidden theme:</p>
              </>
            ) : q.type === 'truefalse' ? (
              <h2 className="font-display text-2xl md:text-3xl font-semibold mt-2 mb-6 leading-snug select-none">
                {q.text}
              </h2>
            ) : (
              <h2 className="font-display text-2xl md:text-3xl font-semibold mt-2 mb-6 leading-snug select-none">
                {q.text}
              </h2>
            )}

            <div className={`grid gap-3 ${q.type === 'truefalse' ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
              {q.options.map((opt) => (
                <button
                  key={opt.letter}
                  disabled={busy}
                  onClick={() => submitAnswer(opt.letter)}
                  className={`text-left rounded-xl border-2 px-4 py-3.5 font-medium transition
                    ${selected === opt.letter ? 'border-gold bg-gold/10' : 'border-ink-100 hover:border-ink-400 bg-parchment/40'}
                    ${q.type === 'truefalse' ? 'text-center font-display text-lg' : ''}
                    disabled:opacity-60`}
                >
                  {q.type !== 'truefalse' && (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-ink text-parchment text-xs font-bold mr-3 align-middle">
                      {opt.letter}
                    </span>
                  )}
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-center text-ink-400 mt-4">
            One question at a time · No going back · Copy &amp; screenshots are discouraged
          </p>
        </div>
      </div>
    );
  }

  // ---- Round result screen ----
  if (roundResult) {
    const passed = roundResult.status === 'passed' || roundResult.status === 'completed';
    const isFinal = roundResult.round === 3;
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-ink-50 p-8 text-center">
          <p className="tag-eyebrow text-ink-400">{ROUND_NAMES[roundResult.round]} · Result</p>
          <div className={`font-display text-6xl font-semibold my-4 ${passed ? 'text-mint' : 'text-coral'}`}>
            {roundResult.score}/{roundResult.total}
          </div>
          {isFinal ? (
            <p className="text-ink-600 font-medium">You've completed the Grand Finale. Thanks for playing — check the leaderboard on stage!</p>
          ) : passed ? (
            <p className="text-ink-600 font-medium">You've unlocked the next round. Good luck!</p>
          ) : (
            <p className="text-ink-600 font-medium">
              You needed {roundResult.passMark} correct to advance. Thanks for participating!
            </p>
          )}
          <button
            onClick={backToHub}
            className="mt-6 w-full rounded-lg bg-ink text-parchment font-display text-lg font-semibold py-3 hover:bg-ink-600 transition"
          >
            Back to my rounds
          </button>
        </div>
      </div>
    );
  }

  // ---- Round hub ----
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="tag-eyebrow text-ink-400">Welcome, {student?.name?.split(' ')[0]}</p>
          <h1 className="font-display text-4xl font-semibold mt-2">Your quiz rounds</h1>
          <p className="text-ink-400 mt-2">{student?.department} · {student?.college}</p>
        </div>

        {error && (
          <div className="rounded-lg bg-coral/10 border border-coral/30 text-coral px-4 py-3 text-sm font-medium mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {rounds.map((r) => (
            <RoundCard key={r.round} round={r} busy={busy} onStart={() => startRound(r.round)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoundCard({ round, busy, onStart }) {
  const locked = !round.unlocked;
  const done = round.status === 'passed' || round.status === 'failed' || round.status === 'completed';
  const statusLabel = {
    not_started: locked ? 'Locked' : 'Ready to begin',
    in_progress: 'In progress',
    passed: `Passed · ${round.score}/${round.totalQuestions}`,
    failed: `Not advanced · ${round.score}/${round.totalQuestions}`,
    completed: `Completed · ${round.score}/${round.totalQuestions}`,
  }[round.status];

  return (
    <div className={`rounded-2xl border p-6 flex items-center justify-between gap-4 ${locked ? 'bg-ink-50/40 border-ink-50' : 'bg-white border-ink-50 shadow-card'}`}>
      <div>
        <p className="tag-eyebrow text-ink-400">{ROUND_NAMES[round.round]}</p>
        <p className="font-display text-xl font-semibold mt-1">{round.totalQuestions} questions</p>
        <p className={`text-sm mt-1 font-medium ${round.status === 'passed' || round.status === 'completed' ? 'text-mint' : round.status === 'failed' ? 'text-coral' : 'text-ink-400'}`}>
          {statusLabel}
        </p>
      </div>
      {!locked && !done && (
        <button
          disabled={busy}
          onClick={onStart}
          className="shrink-0 rounded-lg bg-gold text-ink font-display font-semibold px-5 py-2.5 hover:bg-gold-soft transition disabled:opacity-60"
        >
          {round.status === 'in_progress' ? 'Resume' : 'Start'}
        </button>
      )}
      {locked && (
        <span className="shrink-0 rounded-lg bg-ink-100 text-ink-400 font-semibold px-4 py-2 text-sm">🔒 Locked</span>
      )}
      {done && (
        <span className="shrink-0 rounded-lg bg-ink-50 text-ink-400 font-semibold px-4 py-2 text-sm">Done</span>
      )}
    </div>
  );
}
