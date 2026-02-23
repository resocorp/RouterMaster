'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Subscriber } from '@/lib/api';
import { PageHeader } from '@/components/DataTable';

export default function RegisteredCableModemsPage() {
  const [data, setData] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/subscribers?accountType=docsis&limit=500')
      .then((res) => setData(Array.isArray(res) ? res : res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Registered cable modems"
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
                <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Username</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">MAC CM</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">MAC CPE</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Static IP</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">First name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Last name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No registered cable modems</td></tr>
              ) : (
                data.map((s, i) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{s.username}</td>
                    <td className="px-4 py-2 font-mono text-xs">{(s as any).macCm || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{s.macCpe || '—'}</td>
                    <td className="px-4 py-2">{s.staticIpCpe || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.enabled && s.status === 'active' ? 'bg-green-100 text-green-700' :
                        !s.enabled ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {!s.enabled ? 'disabled' : s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{(s as any).firstName || ''}</td>
                    <td className="px-4 py-2">{(s as any).lastName || ''}</td>
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
