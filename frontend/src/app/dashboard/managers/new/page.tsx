'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ManagerForm, { ManagerFormData } from '@/components/ManagerForm';

export default function NewManagerPage() {
  const router = useRouter();

  const handleSubmit = async (data: ManagerFormData) => {
    const { confirmPassword, ...payload } = data;
    await api.post('/managers', payload);
    router.push('/dashboard/managers');
  };

  return <ManagerForm onSubmit={handleSubmit} />;
}
