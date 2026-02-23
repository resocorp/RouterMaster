'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DataTable, { StatusBadge, PageHeader } from '@/components/DataTable';

interface IasTemplate { id: string; name: string; enabled: boolean; planId?: string; dlLimitMb: number; ulLimitMb: number; timeLimitSecs: number; expiryMode: string; activationTimeSecs: number; simUse: number; }

export default function IasPage() {
  const [data, setData] = useState<IasTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<IasTemplate[]>('/ias/templates').then(setData).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'name', label: 'Name', render: (t: IasTemplate) => <span className="font-medium">{t.name}</span> },
    { key: 'expiryMode', label: 'Expiry Mode' },
    { key: 'activationTimeSecs', label: 'Duration', render: (t: IasTemplate) => `${Math.floor(t.activationTimeSecs / 60)}m` },
    { key: 'dlLimitMb', label: 'DL Limit', render: (t: IasTemplate) => t.dlLimitMb ? `${t.dlLimitMb} MB` : 'Unlimited' },
    { key: 'simUse', label: 'Sim. Use' },
    { key: 'enabled', label: 'Status', render: (t: IasTemplate) => <StatusBadge status={t.enabled ? 'active' : 'disabled'} /> },
  ];

  return (
    <div>
      <PageHeader title="Instant Access Service (IAS)" />
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
