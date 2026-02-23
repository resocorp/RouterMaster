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

export default function LastSyslogEventsPage() {
  const [data, setData] = useState<SyslogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SyslogEntry[]>('/reports/syslog?limit=50')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Last syslog events"
        action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Level</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Source</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No syslog entries</td></tr>
              ) : (
                data.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{formatDateTime(e.createdAt)}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${levelColors[e.level] || 'bg-gray-100 text-gray-600'}`}>
                        {e.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-700">{e.source}</td>
                    <td className="px-4 py-2 text-gray-600 max-w-md truncate">{e.message}</td>
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
