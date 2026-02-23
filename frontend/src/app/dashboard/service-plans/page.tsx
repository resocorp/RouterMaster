'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { api, ServicePlan } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import DataTable, { StatusBadge, PageHeader } from '@/components/DataTable';

export default function ServicePlansPage() {
  const router = useRouter();
  const [data, setData] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ServicePlan[]>('/service-plans').then(setData).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'name', label: 'Name', render: (p: ServicePlan) => <span className="font-medium">{p.name}</span> },
    { key: 'planType', label: 'Type' },
    { key: 'rate', label: 'DL / UL', render: (p: ServicePlan) => `${p.rateDl}k / ${p.rateUl}k` },
    { key: 'price', label: 'Price', render: (p: ServicePlan) => formatCurrency(p.grossUnitPrice) },
    { key: 'expiry', label: 'Expiry', render: (p: ServicePlan) => p.capExpiry ? `${p.initialExpiryVal} ${p.expiryUnit}` : 'No expiry' },
    { key: 'enabled', label: 'Status', render: (p: ServicePlan) => <StatusBadge status={p.enabled ? 'active' : 'disabled'} /> },
  ];

  return (
    <div>
      <PageHeader title="Service Plans" action={
        <button
          onClick={() => router.push('/dashboard/service-plans/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Service Plan
        </button>
      } />
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(p) => router.push(`/dashboard/service-plans/${p.id}`)}
      />
    </div>
  );
}
