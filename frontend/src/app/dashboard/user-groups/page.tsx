'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DataTable, { PageHeader } from '@/components/DataTable';

interface UserGroup { id: string; name: string; description?: string; createdAt: string; }

export default function UserGroupsPage() {
  const [data, setData] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get<UserGroup[]>('/user-groups').then(setData).finally(() => setLoading(false)); }, []);

  const columns = [
    { key: 'name', label: 'Name', render: (g: UserGroup) => <span className="font-medium">{g.name}</span> },
    { key: 'description', label: 'Description', render: (g: UserGroup) => g.description || '—' },
  ];

  return (<div><PageHeader title="User Groups" /><DataTable columns={columns} data={data} loading={loading} /></div>);
}
