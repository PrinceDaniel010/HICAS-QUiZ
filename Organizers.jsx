import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function Organizers() {
  const [organizers, setOrganizers] = useState(null);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => api.adminGet('/organizers').then((res) => setOrganizers(res.organizers)).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.adminPost('/organizers', form);
      setNotice(`Organizer "${form.username}" added.`);
      setForm({ username: '', password: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (username) => {
    if (!confirm(`Remove organizer "${username}"? They will no longer be able to log in.`)) return;
    try {
      await api.adminDelete(`/organizers/${username}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetPassword = async (username) => {
    const newPassword = prompt(`New password for "${username}" (at least 6 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      await api.adminPut(`/organizers/${username}/password`, { password: newPassword });
      setNotice(`Password reset for "${username}".`);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  if (organizers === null) return null;

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
      <div>
        <h2 className="font-display text-xl font-semibold mb-4">Add an organizer</h2>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-ink-50 shadow-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-1">Username</label>
            <input
              required
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full rounded-lg border border-ink-100 px-3 py-2"
              placeholder="e.g. stage_host"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-1">Password</label>
            <input
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-lg border border-ink-100 px-3 py-2"
              placeholder="At least 6 characters"
            />
          </div>
          {error && <p className="text-coral text-sm font-medium">{error}</p>}
          {notice && <p className="text-mint text-sm font-medium">{notice}</p>}
          <button className="w-full rounded-lg bg-ink text-parchment font-semibold py-2.5 hover:bg-ink-600 transition">
            Add organizer
          </button>
          <p className="text-xs text-ink-400">
            Organizers can manage questions, results and settings, but only the owner account can add or remove other organizer logins.
          </p>
        </form>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold mb-4">Current logins</h2>
        <div className="bg-white rounded-2xl border border-ink-50 divide-y divide-ink-50">
          {organizers.map((o) => (
            <div key={o.username} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium">{o.username}</p>
                <p className="text-xs text-ink-400 uppercase tracking-wide">{o.role}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => resetPassword(o.username)} className="text-sm font-semibold text-ink-600 hover:underline">
                  Reset password
                </button>
                {o.role !== 'owner' && (
                  <button onClick={() => remove(o.username)} className="text-sm font-semibold text-coral hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
