import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const FIELDS = [
  { key: 'name', label: 'Full name', placeholder: 'e.g. Prince Daniel Y' },
  { key: 'college', label: 'College name', placeholder: 'e.g. Hindusthan College of Arts and Science' },
  { key: 'department', label: 'Department', placeholder: 'e.g. AI & ML' },
  { key: 'class', label: 'Class / Section', placeholder: 'e.g. III B.Sc AI&ML - A' },
  { key: 'year', label: 'Year of study', placeholder: 'e.g. 3rd Year' },
  { key: 'phone', label: 'Contact number', placeholder: '10-digit mobile number' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', college: '', department: '', class: '', year: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.register(form);
      localStorage.setItem('quiz_token', res.token);
      navigate('/quiz');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <p className="tag-eyebrow text-ink-400">Department Quiz Fest</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mt-2 text-ink">
            Register to compete
          </h1>
          <p className="text-ink-400 mt-3 max-w-md mx-auto">
            Three rounds. Score enough to unlock the next. Fill in your details below to receive your entry pass.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-card border border-ink-50 p-6 md:p-8 space-y-5"
        >
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-semibold text-ink-600 mb-1.5">{f.label}</label>
              <input
                required
                value={form[f.key]}
                onChange={update(f.key)}
                placeholder={f.placeholder}
                type={f.key === 'phone' ? 'tel' : 'text'}
                className="w-full rounded-lg border border-ink-100 px-4 py-3 bg-parchment/60 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent placeholder:text-ink-400/60"
              />
            </div>
          ))}

          {error && (
            <div className="rounded-lg bg-coral/10 border border-coral/30 text-coral px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ink text-parchment font-display text-lg font-semibold py-3.5 hover:bg-ink-600 transition disabled:opacity-60"
          >
            {loading ? 'Registering…' : 'Get my entry pass'}
          </button>
          <p className="text-xs text-center text-ink-400">
            Once you start a round, questions are timed and shown one at a time — you cannot go back.
          </p>
        </form>
      </div>
    </div>
  );
}
