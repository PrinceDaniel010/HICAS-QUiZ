import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

const FIELDS = [
  { key: 'event_name', label: 'Event name', type: 'text' },
  { key: 'question_time_limit_sec', label: 'Seconds per question', type: 'number' },
  { key: 'round1_question_count', label: 'Round 1 - number of questions shown', type: 'number' },
  { key: 'round1_pass_mark', label: 'Round 1 - correct answers needed to unlock Round 2', type: 'number' },
  { key: 'round2_question_count', label: 'Round 2 - number of questions shown', type: 'number' },
  { key: 'round2_pass_mark', label: 'Round 2 - correct answers needed to unlock Round 3', type: 'number' },
  { key: 'round3_question_count', label: 'Round 3 - number of questions shown (final, no pass mark needed)', type: 'number' },
];

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.adminGet('/settings').then((res) => setSettings(res.settings));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.adminPut('/settings', settings);
    setNotice('Settings saved.');
    setTimeout(() => setNotice(''), 2500);
  };

  if (!settings) return null;

  return (
    <div className="max-w-xl">
      <h2 className="font-display text-xl font-semibold mb-4">Quiz settings</h2>
      <form onSubmit={save} className="bg-white rounded-2xl border border-ink-50 shadow-card p-6 space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-semibold text-ink-600 mb-1">{f.label}</label>
            <input
              type={f.type}
              value={settings[f.key]}
              onChange={(e) => setSettings((s) => ({ ...s, [f.key]: e.target.value }))}
              className="w-full rounded-lg border border-ink-100 px-3 py-2"
            />
          </div>
        ))}
        {notice && <p className="text-mint text-sm font-medium">{notice}</p>}
        <button className="w-full rounded-lg bg-ink text-parchment font-semibold py-2.5 hover:bg-ink-600 transition">
          Save settings
        </button>
        <p className="text-xs text-ink-400">
          Changes apply to students who haven't started that round yet. Students already mid-round keep their original question count and timer.
        </p>
      </form>
    </div>
  );
}
