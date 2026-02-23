'use client';

import { useEffect, useState } from 'react';
import { api, Subscriber, PaginatedResult } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import DataTable, { StatusBadge, PageHeader } from '@/components/DataTable';

export default function SubscribersPage() {
  const [data, setData] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = (p = 1, username = '') => {
    setLoading(true);
    const qs = `?page=${p}&limit=25${username ? `&username=${username}` : ''}`;
    api.get<PaginatedResult<Subscriber>>(`/subscribers${qs}`)
      .then((r) => { setData(r.data); setTotal(r.total); setPage(p); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const columns = [
    { key: 'username', label: 'Username', render: (s: Subscriber) => <span className="font-medium">{s.username}</span> },
    { key: 'name', label: 'Name', render: (s: Subscriber) => `${s.firstName || ''} ${s.lastName || ''}`.trim() || '—' },
    { key: 'email', label: 'Email', render: (s: Subscriber) => s.email || '—' },
    { key: 'plan', label: 'Plan', render: (s: Subscriber) => s.plan?.name || '—' },
    { key: 'status', label: 'Status', render: (s: Subscriber) => <StatusBadge status={s.status} enabled={s.enabled} /> },
    { key: 'accountType', label: 'Type' },
    { key: 'createdAt', label: 'Created', render: (s: Subscriber) => formatDate(s.createdAt) },
  ];

  const totalPages = Math.ceil(total / 25);

  return (
    <div>
      <PageHeader title="Subscribers" action={
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1, search)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button onClick={() => load(1, search)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Search
          </button>
        </div>
      } />
      <DataTable columns={columns} data={data} loading={loading} emptyMessage="No subscribers found" />
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>{total} total subscribers</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => load(page - 1, search)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
            <span className="px-3 py-1">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => load(page + 1, search)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
