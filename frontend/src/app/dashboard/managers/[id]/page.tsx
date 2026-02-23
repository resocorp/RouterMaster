'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, Manager } from '@/lib/api';
import ManagerForm, { ManagerFormData } from '@/components/ManagerForm';

export default function EditManagerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [manager, setManager] = useState<Manager | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Manager>(`/managers/${id}`)
      .then(setManager)
      .catch(() => router.push('/dashboard/managers'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (data: ManagerFormData) => {
    const { confirmPassword, ...payload } = data;
    if (!payload.password) delete (payload as any).password;
    await api.put(`/managers/${id}`, payload);
    router.push('/dashboard/managers');
  };

  const handleDelete = async () => {
    await api.delete(`/managers/${id}`);
    router.push('/dashboard/managers');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!manager) return null;

  const initialData: Partial<ManagerFormData> = {
    enabled: manager.enabled,
    username: manager.username,
    firstName: manager.firstName || '',
    lastName: manager.lastName || '',
    company: manager.company || '',
    address: manager.address || '',
    city: manager.city || '',
    zip: manager.zip || '',
    country: manager.country || '',
    state: manager.state || '',
    phone: manager.phone || '',
    mobile: manager.mobile || '',
    email: manager.email || '',
    vatId: manager.vatId || '',
    language: manager.language || 'en',
    comment: manager.comment || '',
    permissions: manager.permissions || {},
  };

  return (
    <ManagerForm
      initialData={initialData}
      isEdit
      onSubmit={handleSubmit}
      onDelete={manager.isSuper ? undefined : handleDelete}
    />
  );
}
