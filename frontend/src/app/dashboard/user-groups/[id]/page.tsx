'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, UserGroup } from '@/lib/api';
import UserGroupForm, { UserGroupFormData } from '@/components/UserGroupForm';

export default function EditUserGroupPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [group, setGroup] = useState<UserGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<UserGroup>(`/user-groups/${id}`)
      .then(setGroup)
      .catch(() => router.push('/dashboard/user-groups'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (data: UserGroupFormData) => {
    await api.put(`/user-groups/${id}`, data);
    router.push('/dashboard/user-groups');
  };

  const handleDelete = async () => {
    await api.delete(`/user-groups/${id}`);
    router.push('/dashboard/user-groups');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!group) return null;

  const initialData: Partial<UserGroupFormData> = {
    name: group.name,
    description: group.description || '',
  };

  return (
    <UserGroupForm
      initialData={initialData}
      isEdit
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
