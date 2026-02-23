'use client';

import { useEffect, useState } from 'react';
import { api, Invoice, PaginatedResult } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import DataTable, { PageHeader } from '@/components/DataTable';

export default function BillingPage() {
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PaginatedResult<Invoice>>('/billing/invoices?limit=50')
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'invoiceNumber', label: '#', render: (i: Invoice) => i.invoiceNumber || '—' },
    { key: 'type', label: 'Type' },
    { key: 'serviceName', label: 'Service', render: (i: Invoice) => i.serviceName || '—' },
    { key: 'grossPrice', label: 'Amount', render: (i: Invoice) => formatCurrency(i.grossPrice) },
    { key: 'quantity', label: 'Qty' },
    { key: 'remark', label: 'Remark', render: (i: Invoice) => i.remark || '—' },
    { key: 'createdAt', label: 'Date', render: (i: Invoice) => formatDateTime(i.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Billing & Invoices" />
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
