'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { PageHeader } from '@/components/DataTable';

interface TrafficDay {
  date: string;
  sessions: string;
  totalDownload: string;
  totalUpload: string;
  totalTime: string;
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function TrafficSummaryPage() {
  const [data, setData] = useState<TrafficDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    api.get<TrafficDay[]>(`/reports/traffic?${params}`)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <PageHeader
        title="Traffic summary"
        action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From:</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To:</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <button onClick={fetchData}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Filter
          </button>
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
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Sessions</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Download</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Upload</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Total Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No data</td></tr>
              ) : (
                data.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{d.sessions}</td>
                    <td className="px-4 py-2">{formatBytes(d.totalDownload || 0)}</td>
                    <td className="px-4 py-2">{formatBytes(d.totalUpload || 0)}</td>
                    <td className="px-4 py-2">{formatDuration(Number(d.totalTime || 0))}</td>
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
