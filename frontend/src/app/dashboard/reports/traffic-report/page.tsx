'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { PageHeader } from '@/components/DataTable';

interface TopUser {
  username: string;
  totalDownload: string;
  totalUpload: string;
  totalTime: string;
  sessions: string;
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function TrafficReportPage() {
  const [data, setData] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);

  const fetchData = () => {
    setLoading(true);
    api.get<TopUser[]>(`/reports/top-users?limit=${limit}`)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [limit]);

  return (
    <div>
      <PageHeader
        title="Traffic report"
        action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Top users:</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>
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
                <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Username</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Download</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Upload</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Total Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No traffic data</td></tr>
              ) : (
                data.map((u, i) => (
                  <tr key={u.username} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{u.username}</td>
                    <td className="px-4 py-2">{formatBytes(u.totalDownload || 0)}</td>
                    <td className="px-4 py-2">{formatBytes(u.totalUpload || 0)}</td>
                    <td className="px-4 py-2">{formatDuration(Number(u.totalTime || 0))}</td>
                    <td className="px-4 py-2">{u.sessions}</td>
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
