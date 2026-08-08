import React, { useState } from 'react';
import { api } from '../../api.js';

export default function MyAccount() {
  const username = localStorage.getItem('admin_username') || '';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.adminPut('/me/password', { currentPassword, newPassword });
      setNotice('Password changed. Use it next time you log in.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md">
      <h2 className="font-display text-xl font-semibold mb-1">My account</h2>
      <p className="text-sm text-ink-400 mb-4">Signed in as <span className="font-semibold text-ink-600">{username}</span></p>
      <form onSubmit={submit} className="bg-white rounded-2xl border border-ink-50 shadow-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink-600 mb-1">Current password</label>
          <input
            required
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-600 mb-1">New password</label>
          <input
            required
            minLength={6}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-3 py-2"
            placeholder="At least 6 characters"
          />
        </div>
        {error && <p className="text-coral text-sm font-medium">{error}</p>}
        {notice && <p className="text-mint text-sm font-medium">{notice}</p>}
        <button className="w-full rounded-lg bg-ink text-parchment font-semibold py-2.5 hover:bg-ink-600 transition">
          Change password
        </button>
      </form>
    </div>
  );
}
