'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { api, UserGroup } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import DataTable, { PageHeader } from '@/components/DataTable';

export default function UserGroupsPage() {
  const router = useRouter();
  const [data, setData] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get<UserGroup[]>('/user-groups').then(setData).finally(() => setLoading(false)); }, []);

  const columns = [
    { key: 'name', label: 'Name', render: (g: UserGroup) => <span className="font-medium">{g.name}</span> },
    { key: 'description', label: 'Description', render: (g: UserGroup) => g.description || '—' },
    { key: 'createdAt', label: 'Created', render: (g: UserGroup) => formatDate(g.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="User Groups" action={
        <button
          onClick={() => router.push('/dashboard/user-groups/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Group
        </button>
      } />
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(g) => router.push(`/dashboard/user-groups/${g.id}`)}
      />
    </div>
  );
}
