'use client';

import { useEffect, useState } from 'react';
import { api, NasDevice } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import DataTable, { PageHeader } from '@/components/DataTable';

export default function NasPage() {
  const [data, setData] = useState<NasDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<NasDevice[]>('/nas').then(setData).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'name', label: 'Name', render: (n: NasDevice) => <span className="font-medium">{n.name}</span> },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'type', label: 'Type' },
    { key: 'description', label: 'Description', render: (n: NasDevice) => n.description || '—' },
    { key: 'createdAt', label: 'Created', render: (n: NasDevice) => formatDate(n.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="NAS Devices" />
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
