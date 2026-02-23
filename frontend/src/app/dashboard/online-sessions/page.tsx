'use client';

import { useEffect, useState } from 'react';
import { api, PaginatedResult } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import DataTable, { PageHeader } from '@/components/DataTable';

interface Session {
  id: string;
  username: string;
  nasIp: string;
  framedIp: string;
  callingStation: string;
  startTime: string;
  sessionTime: number;
  inputOctets: string;
  outputOctets: string;
}

export default function OnlineSessionsPage() {
  const [data, setData] = useState<Session[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResult<Session>>('/online-sessions?limit=100'),
      api.get<number>('/online-sessions/count'),
    ]).then(([sessions, c]) => {
      setData(sessions.data);
      setCount(typeof c === 'number' ? c : (c as any)?.count || sessions.data.length);
    }).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'username', label: 'Username', render: (s: Session) => <span className="font-medium">{s.username}</span> },
    { key: 'framedIp', label: 'IP Address', render: (s: Session) => s.framedIp || '—' },
    { key: 'nasIp', label: 'NAS IP', render: (s: Session) => s.nasIp || '—' },
    { key: 'callingStation', label: 'MAC', render: (s: Session) => s.callingStation || '—' },
    { key: 'startTime', label: 'Started', render: (s: Session) => formatDateTime(s.startTime) },
    { key: 'sessionTime', label: 'Duration', render: (s: Session) => {
      const h = Math.floor(s.sessionTime / 3600);
      const m = Math.floor((s.sessionTime % 3600) / 60);
      return `${h}h ${m}m`;
    }},
  ];

  return (
    <div>
      <PageHeader title={`Online Sessions (${count})`} />
      <DataTable columns={columns} data={data} loading={loading} emptyMessage="No active sessions" />
    </div>
  );
}
