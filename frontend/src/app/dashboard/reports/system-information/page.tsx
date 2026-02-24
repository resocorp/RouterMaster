'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/DataTable';

export default function SystemInformationPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/reports/subscriber-stats')
      .then(setInfo)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="System information"
          action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
        />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  const items = [
    { label: 'Application', value: 'RadiusNexus' },
    { label: 'Platform', value: 'NestJS + Next.js' },
    { label: 'Database', value: 'PostgreSQL' },
    { label: 'RADIUS Protocol', value: 'FreeRADIUS compatible' },
    { label: 'Total Customers', value: info?.total ?? '—' },
    { label: 'Active Customers', value: info?.active ?? '—' },
    { label: 'Disabled Customers', value: info?.disabled ?? '—' },
    { label: 'Expired Customers', value: info?.expired ?? '—' },
    { label: 'Online Sessions', value: info?.online ?? '—' },
  ];

  return (
    <div>
      <PageHeader
        title="System information"
        action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left font-medium text-gray-500 w-1/3">Property</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.label} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-700">{item.label}</td>
                <td className="px-6 py-3 text-gray-900">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
