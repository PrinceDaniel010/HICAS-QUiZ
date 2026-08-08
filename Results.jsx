import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

function fmt(rounds, round) {
  const r = rounds[round];
  if (!r) return '-';
  return `${r.score}/${r.total} (${r.status})`;
}

export default function Results() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.adminGet('/results').then((res) => setResults(res.results));
  }, []);

  const downloadCsv = () => {
    const token = localStorage.getItem('admin_token');
    fetch('/api/admin/results.csv', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quiz-results.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const filtered = results.filter((r) =>
    [r.name, r.college, r.department, r.phone].join(' ').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display text-xl font-semibold">Results ({results.length} registered)</h2>
        <div className="flex gap-2">
          <input
            placeholder="Search by name, college, phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm"
          />
          <button onClick={downloadCsv} className="rounded-lg bg-gold text-ink font-semibold px-4 py-2 text-sm hover:bg-gold-soft transition">
            Export CSV
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-ink-50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-400 border-b border-ink-50">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">College / Dept</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Round 1</th>
              <th className="px-4 py-3 font-semibold">Round 2</th>
              <th className="px-4 py-3 font-semibold">Round 3</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-ink-50 last:border-0">
                <td className="px-4 py-3 font-medium">{r.name}<br /><span className="text-xs text-ink-400">{r.class} · {r.year}</span></td>
                <td className="px-4 py-3">{r.college}<br /><span className="text-xs text-ink-400">{r.department}</span></td>
                <td className="px-4 py-3">{r.phone}</td>
                <td className="px-4 py-3">{fmt(r.rounds, 1)}</td>
                <td className="px-4 py-3">{fmt(r.rounds, 2)}</td>
                <td className="px-4 py-3">{fmt(r.rounds, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-ink-400 text-sm p-4">No students found.</p>}
      </div>
    </div>
  );
}
