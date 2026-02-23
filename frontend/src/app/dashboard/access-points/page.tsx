'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DataTable, { StatusBadge, PageHeader } from '@/components/DataTable';

interface AccessPoint { id: string; name: string; ipAddress: string; enabled: boolean; accessMode: string; description?: string; }

export default function AccessPointsPage() {
  const [data, setData] = useState<AccessPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get<AccessPoint[]>('/access-points').then(setData).finally(() => setLoading(false)); }, []);

  const columns = [
    { key: 'name', label: 'Name', render: (a: AccessPoint) => <span className="font-medium">{a.name}</span> },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'accessMode', label: 'Mode' },
    { key: 'enabled', label: 'Status', render: (a: AccessPoint) => <StatusBadge status={a.enabled ? 'active' : 'disabled'} /> },
    { key: 'description', label: 'Description', render: (a: AccessPoint) => a.description || '—' },
  ];

  return (<div><PageHeader title="Access Points" /><DataTable columns={columns} data={data} loading={loading} /></div>);
}
