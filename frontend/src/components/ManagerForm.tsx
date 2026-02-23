'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckSquare, XSquare, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COUNTRIES = [
  '', 'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh',
  'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic',
  'Denmark', 'Egypt', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya', 'Malaysia', 'Mexico',
  'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Romania', 'Russia', 'Saudi Arabia', 'Serbia', 'Singapore', 'South Africa',
  'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam',
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
];

const PERMISSION_GROUPS = [
  {
    label: 'User & Manager Management',
    permissions: [
      ['list_users', 'List users'],
      ['list_managers', 'List managers'],
      ['list_service_plans', 'List service plans'],
      ['register_users', 'Register users'],
      ['register_managers', 'Register managers'],
      ['register_service_plans', 'Register service plans'],
      ['edit_users', 'Edit users'],
      ['edit_managers', 'Edit managers'],
      ['edit_service_plans', 'Edit service plans'],
      ['edit_privileged_user_data', 'Edit privileged user data'],
      ['delete_managers', 'Delete managers'],
      ['delete_service_plans', 'Delete service plans'],
      ['delete_users', 'Delete users'],
    ],
  },
  {
    label: 'Billing & Financial',
    permissions: [
      ['billing', 'Billing functions'],
      ['access_invoices', 'Access invoices'],
      ['access_all_users', 'Access all users'],
      ['allow_negative_balance', 'Allow negative balance'],
      ['access_all_invoices', 'Access all invoices'],
      ['list_online_users', 'List online users'],
      ['allow_discount_prices', 'Allow discount prices'],
      ['accounting_summary', 'Accounting summary'],
      ['disconnect_users', 'Disconnect users'],
      ['enable_canceling_invoices', 'Enable canceling invoices'],
      ['edit_invoices', 'Edit invoices'],
    ],
  },
  {
    label: 'System & Reports',
    permissions: [
      ['card_system_ias', 'Card system & IAS'],
      ['send_email', 'Send email'],
      ['connection_report', 'Connection report'],
      ['send_sms', 'Send SMS'],
      ['overall_traffic_report', 'Overall traffic report'],
      ['maintain_aps', 'Maintain APs'],
    ],
  },
];

export interface ManagerFormData {
  enabled: boolean;
  username: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  state: string;
  phone: string;
  mobile: string;
  email: string;
  vatId: string;
  language: string;
  comment: string;
  permissions: Record<string, boolean>;
}

const DEFAULT_FORM: ManagerFormData = {
  enabled: true,
  username: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  company: '',
  address: '',
  city: '',
  zip: '',
  country: '',
  state: '',
  phone: '',
  mobile: '',
  email: '',
  vatId: '',
  language: 'en',
  comment: '',
  permissions: {},
};

interface ManagerFormProps {
  initialData?: Partial<ManagerFormData>;
  isEdit?: boolean;
  onSubmit: (data: ManagerFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function ManagerForm({ initialData, isEdit, onSubmit, onDelete }: ManagerFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ManagerFormData>({ ...DEFAULT_FORM, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (field: keyof ManagerFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const togglePermission = (key: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const checkAll = () => {
    const all: Record<string, boolean> = {};
    PERMISSION_GROUPS.forEach((g) => g.permissions.forEach(([key]) => { all[key] = true; }));
    setForm((prev) => ({ ...prev, permissions: all }));
  };

  const clearAll = () => {
    setForm((prev) => ({ ...prev, permissions: {} }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.username || form.username.length < 4 || form.username.length > 32) {
      errs.username = 'Username must be 4-32 characters';
    }
    if (!isEdit || form.password) {
      if (!form.password || form.password.length < 4 || form.password.length > 32) {
        errs.password = 'Password must be 4-32 characters';
      }
      if (form.password !== form.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match';
      }
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
    if (!confirm('Are you sure you want to delete this manager?')) return;
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
            onClick={() => router.push('/dashboard/managers')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Manager' : 'New Manager'}
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
            {saving ? 'Saving...' : isEdit ? 'Update Manager' : 'Store Manager'}
          </button>
        </div>
      </div>

      {errors._form && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errors._form}
        </div>
      )}

      {/* General Data */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
          General Data
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Enable */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable</span>
            </label>
          </div>

          {/* Manager name */}
          <div>
            <label className={labelClass}>
              <span className="text-red-500">*</span> Manager name
              <span className="text-xs text-gray-400 ml-1">(4-32 characters)</span>
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              minLength={4}
              maxLength={32}
              className={cn(inputClass, errors.username && 'border-red-300 focus:ring-red-500')}
              placeholder="admin"
            />
            {errors.username && <p className={errorClass}>{errors.username}</p>}
          </div>

          {/* Empty cell for alignment */}
          <div className="hidden md:block" />

          {/* Password */}
          <div>
            <label className={labelClass}>
              <span className="text-red-500">*</span> Password
              <span className="text-xs text-gray-400 ml-1">(4-32 characters)</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              minLength={4}
              maxLength={32}
              className={cn(inputClass, errors.password && 'border-red-300 focus:ring-red-500')}
              placeholder={isEdit ? 'Leave blank to keep current' : ''}
            />
            {errors.password && <p className={errorClass}>{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className={labelClass}>
              <span className="text-red-500">*</span> Confirm password
              <span className="text-xs text-gray-400 ml-1">(4-32 characters)</span>
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              minLength={4}
              maxLength={32}
              className={cn(inputClass, errors.confirmPassword && 'border-red-300 focus:ring-red-500')}
            />
            {errors.confirmPassword && <p className={errorClass}>{errors.confirmPassword}</p>}
          </div>

          {/* First name */}
          <div>
            <label className={labelClass}>First name</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Last name */}
          <div>
            <label className={labelClass}>Last (family) name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Company */}
          <div className="md:col-span-2">
            <label className={labelClass}>Company name</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className={labelClass}>Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* City */}
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* ZIP */}
          <div>
            <label className={labelClass}>ZIP</label>
            <input
              type="text"
              value={form.zip}
              onChange={(e) => set('zip', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Country */}
          <div>
            <label className={labelClass}>Country</label>
            <select
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              className={inputClass}
            >
              <option value="">Select country</option>
              {COUNTRIES.filter(Boolean).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* State */}
          <div>
            <label className={labelClass}>State</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>Phone number</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Cell */}
          <div>
            <label className={labelClass}>Cell number</label>
            <input
              type="text"
              value={form.mobile}
              onChange={(e) => set('mobile', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Email */}
          <div className="md:col-span-2">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* VAT ID */}
          <div>
            <label className={labelClass}>VAT ID</label>
            <input
              type="text"
              value={form.vatId}
              onChange={(e) => set('vatId', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Language */}
          <div>
            <label className={labelClass}>Language</label>
            <select
              value={form.language}
              onChange={(e) => set('language', e.target.value)}
              className={inputClass}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Comment */}
          <div className="md:col-span-2">
            <label className={labelClass}>Comment</label>
            <textarea
              value={form.comment}
              onChange={(e) => set('comment', e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Permissions</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={checkAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CheckSquare size={14} />
              Check all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <XSquare size={14} />
              Clear all
            </button>
          </div>
        </div>

        {PERMISSION_GROUPS.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">{group.label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
              {group.permissions.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer py-1 group">
                  <input
                    type="checkbox"
                    checked={!!form.permissions[key]}
                    onChange={() => togglePermission(key)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-500 mb-6">
        <span className="text-red-500">*</span> Fields are mandatory
      </p>
    </div>
  );
}
