'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatBytes, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/DataTable';

interface TrafficRecord {
  id: string;
  username: string;
  startTime: string;
  stopTime: string;
  sessionTime: number;
  outputOctets: string;
  outputGigawords: number;
  inputOctets: string;
  inputGigawords: number;
  framedIp: string;
  nasIp: string;
  nasName: string;
}

function calcBytes(octets: string | number, gigawords: number) {
  return Number(BigInt(octets || 0) + BigInt(gigawords || 0) * BigInt(4294967296));
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function FindTrafficDataPage() {
  const [data, setData] = useState<TrafficRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchData = useCallback((p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '50' });
    if (username) params.set('username', username);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    api.get<any>(`/reports/find-traffic?${params}`)
      .then((res) => {
        setData(res.data);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
      })
      .finally(() => setLoading(false));
  }, [username, from, to]);

  useEffect(() => { fetchData(1); }, []);

  return (
    <div>
      <PageHeader
        title="Find traffic data"
        action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Username:</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Search username"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-w-[180px]"
              onKeyDown={(e) => e.key === 'Enter' && fetchData(1)} />
          </div>
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
          <button onClick={() => fetchData(1)}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Search
          </button>
          <span className="ml-auto text-sm text-gray-600 font-medium">Found: {total}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Start time</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Stop time</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Duration</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Download</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Upload</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">IP address</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">NAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No traffic data found</td></tr>
                ) : (
                  data.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{(page - 1) * 50 + idx + 1}</td>
                      <td className="px-4 py-2 font-medium">{r.username}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(r.startTime)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.stopTime ? formatDateTime(r.stopTime) : 'Active'}</td>
                      <td className="px-4 py-2">{formatDuration(r.sessionTime)}</td>
                      <td className="px-4 py-2">{formatBytes(calcBytes(r.outputOctets, r.outputGigawords))}</td>
                      <td className="px-4 py-2">{formatBytes(calcBytes(r.inputOctets, r.inputGigawords))}</td>
                      <td className="px-4 py-2">{r.framedIp || '—'}</td>
                      <td className="px-4 py-2">{r.nasName || r.nasIp || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => fetchData(page - 1)} disabled={page <= 1}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">&lt;&lt;</button>
          {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
            let p: number;
            if (totalPages <= 9) p = i + 1;
            else if (page <= 5) p = i + 1;
            else if (page >= totalPages - 4) p = totalPages - 8 + i;
            else p = page - 4 + i;
            return (
              <button key={p} onClick={() => fetchData(p)}
                className={`px-3 py-1 text-sm rounded border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => fetchData(page + 1)} disabled={page >= totalPages}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">&gt;&gt;</button>
        </div>
      )}
    </div>
  );
}
