'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatBytes, formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/DataTable';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/subscriber-stats'),
      api.get<any[]>('/reports/top-users?limit=10'),
    ]).then(([s, t]) => { setStats(s); setTopUsers(t); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <PageHeader title="Reports" />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500 capitalize">{key}</p>
              <p className="text-2xl font-bold text-gray-900">{val as number}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-medium text-gray-700">Top 10 Users by Traffic</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Username</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Download</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Upload</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {topUsers.map((u, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{u.username}</td>
                <td className="px-4 py-2">{formatBytes(u.totalDownload || 0)}</td>
                <td className="px-4 py-2">{formatBytes(u.totalUpload || 0)}</td>
                <td className="px-4 py-2">{u.sessions}</td>
              </tr>
            ))}
            {topUsers.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
