'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import SubscriberForm, { SubscriberFormData } from '@/components/SubscriberForm';

function parseTimeLimitToSecs(val: string): number {
  const parts = val.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseInt(val, 10) || 0;
}

function parseCustomAttrs(val: string): any[] {
  if (!val.trim()) return [];
  return val.split('\n').filter(Boolean).map((line) => {
    const [attr, ...rest] = line.split('=');
    return { attribute: attr.trim(), value: rest.join('=').trim() };
  });
}

export default function NewSubscriberPage() {
  const router = useRouter();

  const handleSubmit = async (data: SubscriberFormData) => {
    const { confirmPassword, timeLimitSecs, customAttrs, balance, latitude, longitude, ...rest } = data;
    const payload: any = {
      ...rest,
      timeLimitSecs: parseTimeLimitToSecs(timeLimitSecs),
      customAttrs: parseCustomAttrs(customAttrs),
      balance: parseFloat(balance) || 0,
    };
    if (latitude) payload.latitude = parseFloat(latitude);
    if (longitude) payload.longitude = parseFloat(longitude);
    if (!payload.planId) delete payload.planId;
    if (!payload.groupId) delete payload.groupId;
    if (!payload.managerId) delete payload.managerId;
    if (!payload.macCm) delete payload.macCm;
    if (!payload.macCpe) delete payload.macCpe;
    if (!payload.staticIpCpe) delete payload.staticIpCpe;
    if (!payload.staticIpCm) delete payload.staticIpCm;
    if (!payload.contractId) delete payload.contractId;
    if (!payload.contractExpiry) delete payload.contractExpiry;
    if (!payload.email) delete payload.email;

    await api.post('/subscribers', payload);
    router.push('/dashboard/subscribers');
  };

  return <SubscriberForm onSubmit={handleSubmit} />;
}
