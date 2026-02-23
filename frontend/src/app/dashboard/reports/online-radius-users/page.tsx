'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, NasDevice } from '@/lib/api';
import { formatBytes, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/DataTable';

interface OnlineUser {
  id: string;
  username: string;
  startTime: string;
  sessionTime: number;
  outputOctets: string;
  outputGigawords: number;
  inputOctets: string;
  inputGigawords: number;
  framedIp: string;
  callingStation: string;
  apName: string;
  nasName: string;
  groupName: string;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  state: string;
  email: string;
  comment: string;
}

interface UserGroup {
  id: string;
  name: string;
}

function calcBytes(octets: string | number, gigawords: number) {
  return Number(BigInt(octets || 0) + BigInt(gigawords || 0) * BigInt(4294967296));
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function OnlineRadiusUsersPage() {
  const [data, setData] = useState<OnlineUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [nasList, setNasList] = useState<NasDevice[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);

  const [nasId, setNasId] = useState('');
  const [ap, setAp] = useState('');
  const [groupId, setGroupId] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<NasDevice[]>('/nas'),
      api.get<UserGroup[]>('/user-groups'),
    ]).then(([n, g]) => {
      setNasList(n);
      setGroups(g);
    });
  }, []);

  const fetchData = useCallback((p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '50' });
    if (nasId) params.set('nasId', nasId);
    if (ap) params.set('ap', ap);
    if (groupId) params.set('groupId', groupId);
    if (username) params.set('username', username);

    api.get<any>(`/reports/online-radius-users?${params}`)
      .then((res) => {
        setData(res.data);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
      })
      .finally(() => setLoading(false));
  }, [nasId, ap, groupId, username]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const handleFilter = () => fetchData(1);

  return (
    <div>
      <PageHeader
        title="Online RADIUS users"
        action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">NAS:</label>
            <select
              value={nasId}
              onChange={(e) => setNasId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white min-w-[180px]"
            >
              <option value="">All</option>
              {nasList.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">AP:</label>
            <input
              type="text"
              value={ap}
              onChange={(e) => setAp(e.target.value)}
              placeholder="Access Point"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-w-[150px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Group:</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white min-w-[150px]"
            >
              <option value="">All</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">User name:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Search username"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-w-[160px]"
              onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Filter
          </button>
          <span className="ml-auto text-sm text-gray-600 font-medium">Found: {total}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-2 py-2 text-left font-medium text-gray-500">#</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">User name</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Start time</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Online time</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Download</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Upload</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">IP address</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Caller ID</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">AP</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">NAS</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Group</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">First name</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Last name</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Company</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Address</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">City</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">ZIP</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Country</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">State</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Email</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={21} className="px-4 py-12 text-center text-gray-400">No online users found</td>
                  </tr>
                ) : (
                  data.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-2 py-1.5 text-gray-500">{(page - 1) * 50 + idx + 1}.</td>
                      <td className="px-2 py-1.5 font-medium text-blue-700">{u.username}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{formatDateTime(u.startTime)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{formatDuration(u.sessionTime)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{formatBytes(calcBytes(u.outputOctets, u.outputGigawords))}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{formatBytes(calcBytes(u.inputOctets, u.inputGigawords))}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{u.framedIp || '—'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{u.callingStation || '—'}</td>
                      <td className="px-2 py-1.5">{u.apName || 'n/a'}</td>
                      <td className="px-2 py-1.5">{u.nasName || '—'}</td>
                      <td className="px-2 py-1.5">{u.groupName || '—'}</td>
                      <td className="px-2 py-1.5">{u.firstName || ''}</td>
                      <td className="px-2 py-1.5">{u.lastName || ''}</td>
                      <td className="px-2 py-1.5">{u.company || ''}</td>
                      <td className="px-2 py-1.5 max-w-[200px] truncate">{u.address || ''}</td>
                      <td className="px-2 py-1.5">{u.city || ''}</td>
                      <td className="px-2 py-1.5">{u.zip || ''}</td>
                      <td className="px-2 py-1.5">{u.country || ''}</td>
                      <td className="px-2 py-1.5">{u.state || ''}</td>
                      <td className="px-2 py-1.5 text-blue-600">{u.email || ''}</td>
                      <td className="px-2 py-1.5 max-w-[150px] truncate">{u.comment || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => fetchData(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            &lt;&lt;
          </button>
          {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
            let p: number;
            if (totalPages <= 9) p = i + 1;
            else if (page <= 5) p = i + 1;
            else if (page >= totalPages - 4) p = totalPages - 8 + i;
            else p = page - 4 + i;
            return (
              <button
                key={p}
                onClick={() => fetchData(p)}
                className={`px-3 py-1 text-sm rounded border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => fetchData(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            &gt;&gt;
          </button>
        </div>
      )}
    </div>
  );
}
