'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/DataTable';

interface SyslogEntry {
  id: string;
  level: string;
  source: string;
  message: string;
  metadata: Record<string, any>;
  createdAt: string;
}

const levelColors: Record<string, string> = {
  error: 'bg-red-100 text-red-700',
  warn: 'bg-orange-100 text-orange-700',
  warning: 'bg-orange-100 text-orange-700',
  info: 'bg-blue-100 text-blue-700',
  debug: 'bg-gray-100 text-gray-600',
};

export default function BrowseSyslogPage() {
  const [data, setData] = useState<SyslogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('');
  const [limit, setLimit] = useState(200);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    params.set('limit', String(limit));
    api.get<SyslogEntry[]>(`/reports/syslog?${params}`)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <PageHeader
        title="Browse syslog"
        action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Level:</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white min-w-[120px]">
              <option value="">All</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Limit:</label>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
          <button onClick={fetchData}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Filter
          </button>
          <span className="ml-auto text-sm text-gray-600 font-medium">Showing: {data.length} entries</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-44">Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-20">Level</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-36">Source</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No syslog entries</td></tr>
              ) : (
                data.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{formatDateTime(e.createdAt)}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${levelColors[e.level] || 'bg-gray-100 text-gray-600'}`}>
                        {e.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-700">{e.source}</td>
                    <td className="px-4 py-2 text-gray-600 break-words">{e.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
