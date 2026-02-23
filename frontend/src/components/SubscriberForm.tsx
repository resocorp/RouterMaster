'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { api, ServicePlan, UserGroup, Manager, Subscriber } from '@/lib/api';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

const ACCOUNT_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'mac', label: 'MAC' },
  { value: 'docsis', label: 'DOCSIS' },
  { value: 'dhcp_ipoe', label: 'DHCP/IPoE' },
  { value: 'mikrotik_acl', label: 'Mikrotik ACL' },
  { value: 'staros_acl', label: 'StarOS ACL' },
];

const IP_MODES_CPE = [
  { value: 'dhcp', label: 'NAS pool or DHCP' },
  { value: 'pool', label: 'IP pool' },
  { value: 'static', label: 'Static IP' },
];

const IP_MODES_CM = [
  { value: 'pool', label: 'IP pool' },
  { value: 'static', label: 'Static IP' },
];

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

export interface SubscriberFormData {
  username: string;
  enabled: boolean;
  verified: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
  alertSent: boolean;
  accountType: string;
  password: string;
  confirmPassword: string;
  macCm: string;
  ipModeCm: string;
  staticIpCm: string;
  macCpe: string;
  macLock: boolean;
  ipModeCpe: string;
  staticIpCpe: string;
  simUse: number;
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
  planId: string;
  groupId: string;
  managerId: string;
  dlLimitBytes: string;
  ulLimitBytes: string;
  totalLimitBytes: string;
  expiryDate: string;
  timeLimitSecs: string;
  balance: string;
  contractId: string;
  contractExpiry: string;
  latitude: string;
  longitude: string;
  comment: string;
  language: string;
  customAttrs: string;
}

const DEFAULT_FORM: SubscriberFormData = {
  username: '',
  enabled: true,
  verified: false,
  emailAlerts: true,
  smsAlerts: false,
  alertSent: false,
  accountType: 'regular',
  password: '',
  confirmPassword: '',
  macCm: '',
  ipModeCm: 'pool',
  staticIpCm: '',
  macCpe: '',
  macLock: false,
  ipModeCpe: 'dhcp',
  staticIpCpe: '',
  simUse: 1,
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
  planId: '',
  groupId: '',
  managerId: '',
  dlLimitBytes: '0',
  ulLimitBytes: '0',
  totalLimitBytes: '0',
  expiryDate: new Date().toISOString().split('T')[0],
  timeLimitSecs: '00:00:00',
  balance: '0.00',
  contractId: '',
  contractExpiry: '',
  latitude: '',
  longitude: '',
  comment: '',
  language: 'en',
  customAttrs: '',
};

interface SubscriberFormProps {
  initialData?: Partial<SubscriberFormData>;
  isEdit?: boolean;
  subscriber?: Subscriber;
  onSubmit: (data: SubscriberFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function SubscriberForm({ initialData, isEdit, subscriber, onSubmit, onDelete }: SubscriberFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<SubscriberFormData>({ ...DEFAULT_FORM, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);

  useEffect(() => {
    api.get<ServicePlan[]>('/service-plans').then(setServicePlans).catch(() => {});
    api.get<UserGroup[]>('/user-groups').then(setUserGroups).catch(() => {});
    api.get<Manager[]>('/managers').then(setManagers).catch(() => {});
  }, []);

  const set = (field: keyof SubscriberFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
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
    if (!confirm('Are you sure you want to delete this user?')) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (e: any) {
      setErrors({ _form: e.message || 'Failed to delete' });
    } finally {
      setDeleting(false);
    }
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    set('password', pwd);
    set('confirmPassword', pwd);
    setShowPassword(true);
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const errorClass = 'text-xs text-red-600 mt-1';
  const sectionClass = 'bg-white rounded-xl border border-gray-200 p-6 mb-6';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/subscribers')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit User' : 'New User'}
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
            {saving ? 'Saving...' : isEdit ? 'Update User' : 'Add User'}
          </button>
        </div>
      </div>

      {errors._form && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errors._form}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ LEFT COLUMN ═══ */}
        <div className="space-y-6">
          {/* Account Settings */}
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              Account Settings
            </h2>
            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className={labelClass}>
                  <span className="text-red-500">*</span> User name or MAC address
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

              {/* Status checkboxes row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Enable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.verified} onChange={(e) => set('verified', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.emailAlerts} onChange={(e) => set('emailAlerts', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Email alert</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.smsAlerts} onChange={(e) => set('smsAlerts', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">SMS alert</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.alertSent} onChange={(e) => set('alertSent', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Alert sent</span>
                </label>
              </div>

              {/* Account Type */}
              <div>
                <label className={labelClass}>Account type</label>
                <div className="space-y-1.5">
                  {ACCOUNT_TYPES.map((t) => (
                    <label key={t.value} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="accountType"
                        value={t.value}
                        checked={form.accountType === t.value}
                        onChange={(e) => set('accountType', e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={labelClass}>
                  <span className="text-red-500">*</span> Password
                  <span className="text-xs text-gray-400 ml-1">(4-32 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    minLength={4}
                    maxLength={32}
                    className={cn(inputClass, 'pr-10', errors.password && 'border-red-300 focus:ring-red-500')}
                    placeholder={isEdit ? 'Leave blank to keep current' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className={errorClass}>{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className={labelClass}>
                  <span className="text-red-500">*</span> Confirm password
                  <span className="text-xs text-gray-400 ml-1">(4-32 characters)</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  minLength={4}
                  maxLength={32}
                  className={cn(inputClass, errors.confirmPassword && 'border-red-300 focus:ring-red-500')}
                />
                {errors.confirmPassword && <p className={errorClass}>{errors.confirmPassword}</p>}
              </div>

              {/* Show password + Generate */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Show password</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={14} />
                  Generate password
                </button>
              </div>
            </div>
          </div>

          {/* Network Settings */}
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              Network Settings
            </h2>
            <div className="space-y-4">
              {/* MAC address CM */}
              <div>
                <label className={labelClass}>MAC address CM</label>
                <input
                  type="text"
                  value={form.macCm}
                  onChange={(e) => set('macCm', e.target.value)}
                  className={inputClass}
                  placeholder="AA:BB:CC:DD:EE:FF"
                />
              </div>

              {/* IP address mode CM */}
              <div>
                <label className={labelClass}>IP address mode CM</label>
                <div className="flex items-center gap-4">
                  {IP_MODES_CM.map((m) => (
                    <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ipModeCm"
                        value={m.value}
                        checked={form.ipModeCm === m.value}
                        onChange={(e) => set('ipModeCm', e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{m.label}</span>
                    </label>
                  ))}
                </div>
                {form.ipModeCm === 'static' && (
                  <input
                    type="text"
                    value={form.staticIpCm}
                    onChange={(e) => set('staticIpCm', e.target.value)}
                    className={cn(inputClass, 'mt-2')}
                    placeholder="Static IP address"
                  />
                )}
              </div>

              {/* MAC address CPE */}
              <div>
                <label className={labelClass}>MAC address CPE</label>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={form.macCpe}
                    onChange={(e) => set('macCpe', e.target.value)}
                    className={cn(inputClass, 'flex-1')}
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.macLock}
                      onChange={(e) => set('macLock', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Allow this MAC only</span>
                  </label>
                </div>
              </div>

              {/* IP address mode CPE */}
              <div>
                <label className={labelClass}>IP address mode CPE</label>
                <div className="space-y-1.5">
                  {IP_MODES_CPE.map((m) => (
                    <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ipModeCpe"
                        value={m.value}
                        checked={form.ipModeCpe === m.value}
                        onChange={(e) => set('ipModeCpe', e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{m.label}</span>
                    </label>
                  ))}
                </div>
                {form.ipModeCpe === 'static' && (
                  <input
                    type="text"
                    value={form.staticIpCpe}
                    onChange={(e) => set('staticIpCpe', e.target.value)}
                    className={cn(inputClass, 'mt-2')}
                    placeholder="Static IP address"
                  />
                )}
              </div>

              {/* Simultaneous use */}
              <div>
                <label className={labelClass}>Simultaneous use</label>
                <input
                  type="number"
                  value={form.simUse}
                  onChange={(e) => set('simUse', parseInt(e.target.value) || 0)}
                  min={0}
                  className={cn(inputClass, 'w-24')}
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              Personal Information
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First name</label>
                  <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last (family) name</label>
                  <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Company name</label>
                <input type="text" value={form.company} onChange={(e) => set('company', e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Address</label>
                <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input type="text" value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>ZIP</label>
                  <input type="text" value={form.zip} onChange={(e) => set('zip', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Country</label>
                  <select value={form.country} onChange={(e) => set('country', e.target.value)} className={inputClass}>
                    <option value="">Select country</option>
                    {COUNTRIES.filter(Boolean).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input type="text" value={form.state} onChange={(e) => set('state', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone number</label>
                  <input type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Cell number</label>
                  <input type="text" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email address</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>VAT ID</label>
                <input type="text" value={form.vatId} onChange={(e) => set('vatId', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="space-y-6">
          {/* Service & Limits */}
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              Service & Limits
            </h2>
            <div className="space-y-4">
              {/* Service plan */}
              <div>
                <label className={labelClass}>Service plan</label>
                <select value={form.planId} onChange={(e) => set('planId', e.target.value)} className={inputClass}>
                  <option value="">Select plan</option>
                  {servicePlans.filter((p) => p.enabled).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Download limit */}
              <div>
                <label className={labelClass}>Download limit</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.dlLimitBytes}
                    onChange={(e) => set('dlLimitBytes', e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">Bytes</span>
                </div>
              </div>

              {/* Upload limit */}
              <div>
                <label className={labelClass}>Upload limit</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.ulLimitBytes}
                    onChange={(e) => set('ulLimitBytes', e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">Bytes</span>
                </div>
              </div>

              {/* Total limit */}
              <div>
                <label className={labelClass}>Total limit</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.totalLimitBytes}
                    onChange={(e) => set('totalLimitBytes', e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">Bytes</span>
                </div>
              </div>

              {/* Account expiry */}
              <div>
                <label className={labelClass}>Account expiry</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => set('expiryDate', e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-xs text-gray-400">(YYYY-MM-DD)</span>
                </div>
              </div>

              {/* Available online time */}
              <div>
                <label className={labelClass}>Available online time</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.timeLimitSecs}
                    onChange={(e) => set('timeLimitSecs', e.target.value)}
                    className={inputClass}
                    placeholder="00:00:00"
                  />
                  <span className="text-xs text-gray-400">(HH:MM:SS)</span>
                </div>
              </div>

              {/* Balance */}
              <div>
                <label className={labelClass}>Balance</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.balance}
                    onChange={(e) => set('balance', e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">NGN</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contract & Location */}
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              Contract & Location
            </h2>
            <div className="space-y-4">
              {/* Contract ID */}
              <div>
                <label className={labelClass}>Contract ID</label>
                <input type="text" value={form.contractId} onChange={(e) => set('contractId', e.target.value)} className={inputClass} />
              </div>

              {/* Contract valid till */}
              <div>
                <label className={labelClass}>Contract valid till</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={form.contractExpiry}
                    onChange={(e) => set('contractExpiry', e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-xs text-gray-400">(YYYY-MM-DD)</span>
                </div>
              </div>

              {/* Geolocation */}
              <div>
                <label className={labelClass}>Geolocation (lat., long.)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={form.latitude}
                      onChange={(e) => set('latitude', e.target.value)}
                      className={inputClass}
                      placeholder="Latitude"
                    />
                    <span className="text-sm text-gray-500">deg.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={form.longitude}
                      onChange={(e) => set('longitude', e.target.value)}
                      className={inputClass}
                      placeholder="Longitude"
                    />
                    <span className="text-sm text-gray-500">deg.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              Additional Info
            </h2>
            <div className="space-y-4">
              {/* Comment */}
              <div>
                <label className={labelClass}>Comment</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => set('comment', e.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </div>

              {/* Language */}
              <div>
                <label className={labelClass}>Language</label>
                <select value={form.language} onChange={(e) => set('language', e.target.value)} className={inputClass}>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              {/* User group */}
              <div>
                <label className={labelClass}>User group</label>
                <select value={form.groupId} onChange={(e) => set('groupId', e.target.value)} className={inputClass}>
                  <option value="">Select group</option>
                  {userGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Account owner / Registered by */}
              <div>
                <label className={labelClass}>Account owner</label>
                <select value={form.managerId} onChange={(e) => set('managerId', e.target.value)} className={inputClass}>
                  <option value="">Select manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.username}{m.firstName ? ` (${m.firstName}${m.lastName ? ' ' + m.lastName : ''})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom RADIUS attributes */}
              <div>
                <label className={labelClass}>Custom RADIUS attributes</label>
                <textarea
                  value={form.customAttrs}
                  onChange={(e) => set('customAttrs', e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="attribute=value, one per line"
                />
              </div>
            </div>
          </div>

          {/* Account Overview — edit mode only */}
          {isEdit && subscriber && (
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Account Overview
              </h2>
              <div className="space-y-2 text-sm">
                <InfoRow label="User name" value={subscriber.username} />
                <InfoRow label="Account type" value={subscriber.accountType} />
                <InfoRow label="Account status">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    subscriber.status === 'active' ? 'bg-green-100 text-green-700' :
                    subscriber.status === 'expired' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {subscriber.status}
                  </span>
                </InfoRow>
                <InfoRow label="Registration date" value={formatDate(subscriber.createdAt)} />
                <InfoRow label="Service plan" value={subscriber.plan?.name || 'n/a'} />
                <InfoRow label="User group" value={subscriber.group?.name || 'n/a'} />
                {subscriber.updatedAt && (
                  <InfoRow label="Last updated" value={formatDateTime(subscriber.updatedAt)} />
                )}
              </div>
            </div>
          )}

          {/* SMS / Verification Counters — edit mode only */}
          {isEdit && subscriber && (
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Verification & Counters
              </h2>
              <div className="space-y-2 text-sm">
                <InfoRow label="SMS sent count" value={`${subscriber.smsSentCount ?? 0} times`} />
                <InfoRow label="Verification code failed" value={`${subscriber.verifyFailures ?? 0} times`} />
                <InfoRow label="PIN code failed" value={`${subscriber.pinFailures ?? 0} times`} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-500 mt-4 mb-6 text-center">
        <span className="text-red-500">*</span> Fields are mandatory
      </p>

      {/* Quick Action Links — edit mode only */}
      {isEdit && subscriber && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-3 text-xs">
            {QUICK_ACTIONS.map(({ label, path }) => (
              <Link
                key={path}
                href={`/dashboard/subscribers/${subscriber.id}${path}`}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                [{label}]
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 font-medium">{label}:</span>
      <span className="text-gray-900 text-right">{children || value || 'n/a'}</span>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: 'traffic report', path: '/traffic' },
  { label: 'connection report', path: '/auth-log' },
  { label: 'add credits', path: '/add-credits' },
  { label: 'add deposit', path: '/add-deposit' },
  { label: 'list invoices', path: '/invoices' },
  { label: 'change service plan', path: '/change-service' },
  { label: 'service plan history', path: '/service-history' },
];
