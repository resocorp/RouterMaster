'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { PageHeader } from '@/components/DataTable';

interface SystemStats {
  totalSubscribers: number;
  activeSubscribers: number;
  onlineSessions: number;
  totalNas: number;
  totalGroups: number;
  todaySessions: number;
  todayDownload: string;
  todayUpload: string;
  totalAuthAttempts: number;
  totalAuthFailures: number;
}

export default function SystemStatisticsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SystemStats>('/reports/system-stats')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="System statistics"
          action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
        />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Customers', value: stats?.totalSubscribers ?? 0, color: 'bg-blue-50 border-blue-200' },
    { label: 'Active Customers', value: stats?.activeSubscribers ?? 0, color: 'bg-green-50 border-green-200' },
    { label: 'Online Sessions', value: stats?.onlineSessions ?? 0, color: 'bg-purple-50 border-purple-200' },
    { label: 'NAS Devices', value: stats?.totalNas ?? 0, color: 'bg-indigo-50 border-indigo-200' },
    { label: 'User Groups', value: stats?.totalGroups ?? 0, color: 'bg-cyan-50 border-cyan-200' },
  ];

  const todayCards = [
    { label: "Today's Sessions", value: stats?.todaySessions ?? 0 },
    { label: "Today's Download", value: formatBytes(stats?.todayDownload || 0) },
    { label: "Today's Upload", value: formatBytes(stats?.todayUpload || 0) },
    { label: 'Total Auth Attempts', value: stats?.totalAuthAttempts ?? 0 },
    { label: 'Auth Failures', value: stats?.totalAuthFailures ?? 0 },
  ];

  return (
    <div>
      <PageHeader
        title="System statistics"
        action={<Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Reports</Link>}
      />

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Platform Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <p className="text-xs font-medium text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Today&apos;s Activity</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {todayCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Details</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left font-medium text-gray-500 w-1/3">Metric</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">Total customers</td>
              <td className="px-6 py-3">{stats?.totalSubscribers}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">Active customers</td>
              <td className="px-6 py-3">{stats?.activeSubscribers}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">Currently online</td>
              <td className="px-6 py-3">{stats?.onlineSessions}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">NAS devices</td>
              <td className="px-6 py-3">{stats?.totalNas}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">User groups</td>
              <td className="px-6 py-3">{stats?.totalGroups}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">Sessions today</td>
              <td className="px-6 py-3">{stats?.todaySessions}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">Download today</td>
              <td className="px-6 py-3">{formatBytes(stats?.todayDownload || 0)}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">Upload today</td>
              <td className="px-6 py-3">{formatBytes(stats?.todayUpload || 0)}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">Total auth attempts</td>
              <td className="px-6 py-3">{stats?.totalAuthAttempts}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-700">Auth failures</td>
              <td className="px-6 py-3 text-red-600 font-medium">{stats?.totalAuthFailures}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
