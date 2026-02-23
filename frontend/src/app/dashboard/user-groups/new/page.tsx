'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import UserGroupForm, { UserGroupFormData } from '@/components/UserGroupForm';

export default function NewUserGroupPage() {
  const router = useRouter();

  const handleSubmit = async (data: UserGroupFormData) => {
    await api.post('/user-groups', data);
    router.push('/dashboard/user-groups');
  };

  return <UserGroupForm onSubmit={handleSubmit} />;
}
