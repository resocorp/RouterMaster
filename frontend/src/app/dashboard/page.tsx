'use client';

import { useEffect, useState } from 'react';
import { api, DashboardData } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<DashboardData>('/reports/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600 p-4">Error: {error}</div>;
  if (!data) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const s = data.subscribers;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Subscribers" value={s.total} color="text-gray-900" />
        <StatCard label="Active" value={s.active} color="text-green-600" />
        <StatCard label="Online Now" value={s.online} color="text-blue-600" />
        <StatCard label="Expired" value={s.expired} color="text-orange-600" />
        <StatCard label="Disabled" value={s.disabled} color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Today&apos;s Revenue</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(data.todayRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{formatCurrency(data.monthRevenue)}</p>
        </div>
      </div>
    </div>
  );
}
