'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserGroupFormData {
  name: string;
  description: string;
}

const DEFAULT_FORM: UserGroupFormData = {
  name: '',
  description: '',
};

interface UserGroupFormProps {
  initialData?: Partial<UserGroupFormData>;
  isEdit?: boolean;
  onSubmit: (data: UserGroupFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function UserGroupForm({ initialData, isEdit, onSubmit, onDelete }: UserGroupFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<UserGroupFormData>({ ...DEFAULT_FORM, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (field: keyof UserGroupFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) {
      errs.name = 'Group name is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (e: any) {
      setErrors({ _form: e.message || 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this user group?')) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (e: any) {
      setErrors({ _form: e.message || 'Failed to delete' });
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const errorClass = 'text-xs text-red-600 mt-1';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/user-groups')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit User Group' : 'New User Group'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isEdit && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : isEdit ? 'Update Group' : 'Create Group'}
          </button>
        </div>
      </div>

      {errors._form && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errors._form}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
        <div className="space-y-4">
          {/* Group name */}
          <div>
            <label className={labelClass}>
              <span className="text-red-500">*</span> Group name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={cn(inputClass, errors.name && 'border-red-300 focus:ring-red-500')}
              placeholder="e.g. VIP Customers"
              autoFocus
            />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
              className={inputClass}
              placeholder="Optional description for this group"
            />
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-500 mt-6">
          <span className="text-red-500">*</span> Fields are mandatory
        </p>
      </div>
    </div>
  );
}
