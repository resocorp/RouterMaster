'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, Subscriber } from '@/lib/api';
import SubscriberForm, { SubscriberFormData } from '@/components/SubscriberForm';

function secsToHms(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

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

function formatCustomAttrs(attrs: any[]): string {
  if (!attrs || !attrs.length) return '';
  return attrs.map((a) => `${a.attribute}=${a.value}`).join('\n');
}

export default function EditSubscriberPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Subscriber>(`/subscribers/${id}`)
      .then(setSubscriber)
      .catch(() => router.push('/dashboard/subscribers'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (data: SubscriberFormData) => {
    const { confirmPassword, timeLimitSecs, customAttrs, balance, latitude, longitude, ...rest } = data;
    const payload: any = {
      ...rest,
      timeLimitSecs: parseTimeLimitToSecs(timeLimitSecs),
      customAttrs: parseCustomAttrs(customAttrs),
    };
    if (!payload.password) delete payload.password;
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

    await api.put(`/subscribers/${id}`, payload);
    router.push('/dashboard/subscribers');
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect this customer from all active sessions?')) return;
    try {
      await api.post(`/subscribers/${id}/disconnect`);
      alert('User disconnected');
    } catch (e: any) {
      alert(e.message || 'Failed to disconnect');
    }
  };

  const handleDelete = async () => {
    await api.delete(`/subscribers/${id}`);
    router.push('/dashboard/subscribers');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!subscriber) return null;

  const initialData: Partial<SubscriberFormData> = {
    username: subscriber.username,
    password: subscriber.passwordPlain || '',
    confirmPassword: subscriber.passwordPlain || '',
    enabled: subscriber.enabled,
    verified: subscriber.verified ?? false,
    emailAlerts: subscriber.emailAlerts ?? true,
    smsAlerts: subscriber.smsAlerts ?? false,
    alertSent: subscriber.alertSent ?? false,
    accountType: subscriber.accountType || 'regular',
    macCm: subscriber.macCm || '',
    ipModeCm: subscriber.ipModeCm || 'pool',
    staticIpCm: subscriber.staticIpCm || '',
    macCpe: subscriber.macCpe || '',
    macLock: subscriber.macLock || false,
    ipModeCpe: subscriber.ipModeCpe || 'dhcp',
    staticIpCpe: subscriber.staticIpCpe || '',
    simUse: subscriber.simUse ?? 1,
    firstName: subscriber.firstName || '',
    lastName: subscriber.lastName || '',
    company: subscriber.company || '',
    address: subscriber.address || '',
    city: subscriber.city || '',
    zip: subscriber.zip || '',
    country: subscriber.country || '',
    state: subscriber.state || '',
    phone: subscriber.phone || '',
    mobile: subscriber.mobile || '',
    email: subscriber.email || '',
    vatId: subscriber.vatId || '',
    planId: subscriber.planId || '',
    groupId: subscriber.groupId || '',
    managerId: subscriber.managerId || '',
    dlLimitBytes: subscriber.dlLimitBytes || '0',
    ulLimitBytes: subscriber.ulLimitBytes || '0',
    totalLimitBytes: subscriber.totalLimitBytes || '0',
    expiryDate: subscriber.expiryDate ? subscriber.expiryDate.split('T')[0] : '',
    timeLimitSecs: secsToHms(subscriber.timeLimitSecs || 0),
    balance: String(subscriber.balance || '0.00'),
    contractId: subscriber.contractId || '',
    contractExpiry: subscriber.contractExpiry ? subscriber.contractExpiry.split('T')[0] : '',
    latitude: subscriber.latitude ? String(subscriber.latitude) : '',
    longitude: subscriber.longitude ? String(subscriber.longitude) : '',
    comment: subscriber.comment || '',
    language: subscriber.language || 'en',
    customAttrs: formatCustomAttrs(subscriber.customAttrs || []),
  };

  return (
    <SubscriberForm
      initialData={initialData}
      isEdit
      subscriber={subscriber}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
