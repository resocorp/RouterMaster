'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import DataTable, { StatusBadge, PageHeader } from '@/components/DataTable';

interface CardSeries { id: string; name: string; cardType: string; quantity: number; prefix: string; status: string; validTill?: string; createdAt: string; }

export default function CardsPage() {
  const [data, setData] = useState<CardSeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CardSeries[]>('/cards/series').then(setData).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'name', label: 'Name', render: (s: CardSeries) => <span className="font-medium">{s.name || s.prefix || '—'}</span> },
    { key: 'cardType', label: 'Type' },
    { key: 'quantity', label: 'Cards' },
    { key: 'prefix', label: 'Prefix' },
    { key: 'validTill', label: 'Valid Until', render: (s: CardSeries) => s.validTill ? formatDate(s.validTill) : '—' },
    { key: 'status', label: 'Status', render: (s: CardSeries) => <StatusBadge status={s.status} /> },
    { key: 'createdAt', label: 'Created', render: (s: CardSeries) => formatDate(s.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Cards / Vouchers" />
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
