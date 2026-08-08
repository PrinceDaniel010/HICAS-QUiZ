import React, { useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import Questions from './Questions.jsx';
import Results from './Results.jsx';
import Settings from './Settings.jsx';
import Organizers from './Organizers.jsx';
import MyAccount from './MyAccount.jsx';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const isOwner = localStorage.getItem('admin_role') === 'owner';

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) navigate('/admin/login');
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_username');
    navigate('/admin/login');
  };

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg font-medium text-sm transition ${isActive ? 'bg-ink text-parchment' : 'text-ink-600 hover:bg-ink-50'}`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-50 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="tag-eyebrow text-ink-400">Organiser console</p>
            <p className="font-display text-xl font-semibold">Quiz Fest Admin</p>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink to="/admin/questions" className={linkClass}>Questions</NavLink>
            <NavLink to="/admin/results" className={linkClass}>Results</NavLink>
            <NavLink to="/admin/settings" className={linkClass}>Settings</NavLink>
            {isOwner && <NavLink to="/admin/organizers" className={linkClass}>Organizers</NavLink>}
            <NavLink to="/admin/account" className={linkClass}>My Account</NavLink>
            <button onClick={logout} className="px-4 py-2 rounded-lg font-medium text-sm text-coral hover:bg-coral/10 transition">
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="questions" element={<Questions />} />
          <Route path="results" element={<Results />} />
          <Route path="settings" element={<Settings />} />
          <Route path="organizers" element={isOwner ? <Organizers /> : <Navigate to="/admin/questions" replace />} />
          <Route path="account" element={<MyAccount />} />
          <Route path="*" element={<Navigate to="/admin/questions" replace />} />
        </Routes>
      </main>
    </div>
  );
}
