'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { api, Manager } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import DataTable, { StatusBadge, PageHeader } from '@/components/DataTable';

export default function ManagersPage() {
  const router = useRouter();
  const [data, setData] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Manager[]>('/managers').then(setData).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'username', label: 'Username', render: (m: Manager) => <span className="font-medium">{m.username}</span> },
    { key: 'name', label: 'Name', render: (m: Manager) => `${m.firstName || ''} ${m.lastName || ''}`.trim() || '—' },
    { key: 'email', label: 'Email', render: (m: Manager) => m.email || '—' },
    { key: 'role', label: 'Role', render: (m: Manager) => m.isSuper ? 'Super Admin' : 'Manager' },
    { key: 'balance', label: 'Balance', render: (m: Manager) => formatCurrency(m.balance) },
    { key: 'enabled', label: 'Status', render: (m: Manager) => <StatusBadge status={m.enabled ? 'active' : 'disabled'} /> },
    { key: 'createdAt', label: 'Created', render: (m: Manager) => formatDate(m.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Managers" action={
        <button
          onClick={() => router.push('/dashboard/managers/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Manager
        </button>
      } />
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(m) => router.push(`/dashboard/managers/${m.id}`)}
      />
    </div>
  );
}
