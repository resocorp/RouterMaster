'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DataTable, { PageHeader } from '@/components/DataTable';

interface Template { id: string; slug: string; channel: string; subject?: string; body: string; }

export default function NotificationsPage() {
  const [data, setData] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get<Template[]>('/notifications/templates').then(setData).finally(() => setLoading(false)); }, []);

  const columns = [
    { key: 'slug', label: 'Slug', render: (t: Template) => <span className="font-medium">{t.slug}</span> },
    { key: 'channel', label: 'Channel', render: (t: Template) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.channel === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{t.channel}</span>
    )},
    { key: 'subject', label: 'Subject', render: (t: Template) => t.subject || '—' },
    { key: 'body', label: 'Preview', render: (t: Template) => <span className="text-gray-500 truncate max-w-xs block">{t.body.substring(0, 80)}{t.body.length > 80 ? '...' : ''}</span> },
  ];

  return (<div><PageHeader title="Notification Templates" /><DataTable columns={columns} data={data} loading={loading} /></div>);
}
