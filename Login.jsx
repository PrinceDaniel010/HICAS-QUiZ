import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.adminLogin({ username, password });
      localStorage.setItem('admin_token', res.token);
      localStorage.setItem('admin_role', res.role);
      localStorage.setItem('admin_username', res.username);
      navigate('/admin/questions');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow-card border border-ink-50 p-8 space-y-5">
        <div>
          <p className="tag-eyebrow text-ink-400">Organiser access</p>
          <h1 className="font-display text-3xl font-semibold mt-1">Admin login</h1>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-600 mb-1.5">Username</label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-4 py-3 bg-parchment/60 focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-600 mb-1.5">Password</label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-4 py-3 bg-parchment/60 focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
        {error && <div className="rounded-lg bg-coral/10 border border-coral/30 text-coral px-4 py-3 text-sm font-medium">{error}</div>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-ink text-parchment font-display text-lg font-semibold py-3 hover:bg-ink-600 transition disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
