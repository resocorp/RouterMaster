'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DataTable, { PageHeader } from '@/components/DataTable';

interface IpPool { id: string; name: string; type: string; firstIp: string; lastIp: string; description?: string; }

export default function IpPoolsPage() {
  const [data, setData] = useState<IpPool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get<IpPool[]>('/ip-pools').then(setData).finally(() => setLoading(false)); }, []);

  const columns = [
    { key: 'name', label: 'Name', render: (p: IpPool) => <span className="font-medium">{p.name}</span> },
    { key: 'type', label: 'Type' },
    { key: 'firstIp', label: 'Start IP' },
    { key: 'lastIp', label: 'End IP' },
    { key: 'description', label: 'Description', render: (p: IpPool) => p.description || '—' },
  ];

  return (<div><PageHeader title="IP Pools" /><DataTable columns={columns} data={data} loading={loading} /></div>);
}
