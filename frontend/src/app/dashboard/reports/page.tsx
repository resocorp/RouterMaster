'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/DataTable';

const reportSections = [
  {
    title: 'Users & Sessions',
    items: [
      { href: '/dashboard/reports/online-radius-users', label: 'Online RADIUS users', desc: 'View currently connected users with real-time session data' },
      { href: '/dashboard/reports/registered-cable-modems', label: 'Registered cable modems', desc: 'List of registered DOCSIS cable modems' },
    ],
  },
  {
    title: 'Traffic',
    items: [
      { href: '/dashboard/reports/traffic-report', label: 'Traffic report', desc: 'Traffic usage per user over time' },
      { href: '/dashboard/reports/traffic-summary', label: 'Traffic summary', desc: 'Aggregated daily traffic summary' },
      { href: '/dashboard/reports/daily-traffic-report', label: 'Daily traffic report', desc: 'Per-user daily traffic breakdown' },
      { href: '/dashboard/reports/find-traffic-data', label: 'Find traffic data', desc: 'Search session traffic by username and date' },
    ],
  },
  {
    title: 'Connections & Auth',
    items: [
      { href: '/dashboard/reports/connection-report', label: 'Connection report', desc: 'Closed session history with disconnect reasons' },
      { href: '/dashboard/reports/authentication-log', label: 'Authentication log', desc: 'RADIUS authentication accept/reject log' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/dashboard/reports/last-syslog-events', label: 'Last syslog events', desc: 'Recent system log entries' },
      { href: '/dashboard/reports/browse-syslog', label: 'Browse syslog', desc: 'Browse and filter full system log' },
      { href: '/dashboard/reports/system-information', label: 'System information', desc: 'Server and service status overview' },
      { href: '/dashboard/reports/system-statistics', label: 'System statistics', desc: 'Platform-wide usage and performance metrics' },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" />
      <div className="space-y-8">
        {reportSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{section.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{item.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
