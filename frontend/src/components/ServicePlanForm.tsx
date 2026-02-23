'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { api, ServicePlan, NasDevice, Manager } from '@/lib/api';
import { cn } from '@/lib/utils';

const PLAN_TYPES = [
  { value: 'prepaid', label: 'Prepaid regular' },
  { value: 'prepaid_card', label: 'Prepaid card or IAS' },
  { value: 'postpaid', label: 'Postpaid' },
  { value: 'email', label: 'Email' },
  { value: 'acl', label: 'RADIUS access list' },
];

export interface ServicePlanFormData {
  name: string;
  description: string;
  enabled: boolean;
  availableUcp: boolean;
  planType: string;
  capDownload: boolean;
  capUpload: boolean;
  capTotal: boolean;
  capExpiry: boolean;
  capTime: boolean;
  rateDl: number;
  rateUl: number;
  ciscoPolicyDl: string;
  ciscoPolicyUl: string;
  dailyDlMb: number;
  dailyUlMb: number;
  dailyTotalMb: number;
  dailyTimeHours: number;
  dailyTimeMinutes: number;
  dailyTimeSeconds: number;
  burstEnabled: boolean;
  burstLimitDl: number;
  burstLimitUl: number;
  burstThreshDl: number;
  burstThreshUl: number;
  burstTimeDl: number;
  burstTimeUl: number;
  priority: number;
  ipPool: string;
  nextDisabledId: string;
  nextExpiredId: string;
  nextDailyId: string;
  ignoreStaticIp: boolean;
  customAttrs: string;
  generateTftp: boolean;
  advancedCm: boolean;
  allowedNasIds: string[];
  allowedManagerIds: string[];
  // Accounting fields
  postpaidCalcDl: boolean;
  postpaidCalcUl: boolean;
  postpaidCalcTime: boolean;
  isMonthly: boolean;
  autoRenew: boolean;
  carryOver: boolean;
  resetOnExpiry: boolean;
  resetOnNegative: boolean;
  additionalCredits: boolean;
  netUnitPrice: number;
  grossUnitPrice: number;
  netAddPrice: number;
  grossAddPrice: number;
  dateAddMode: string;
  timeAddMode: string;
  trafficAddMode: string;
  expiryUnit: string;
  expiryUnitValue: number;
  initialExpiryVal: number;
  timeUnit: string;
  timeUnitValue: number;
  initialTimeSecs: number;
  dlTrafficUnitMb: number;
  initialDlMb: number;
  ulTrafficUnitMb: number;
  initialUlMb: number;
  totalTrafficUnitMb: number;
  initialTotalMb: number;
  minBaseAmount: number;
  addTrafficUnitMb: number;
  minAddAmount: number;
}

const DEFAULT_FORM: ServicePlanFormData = {
  name: '',
  description: '',
  enabled: true,
  availableUcp: false,
  planType: 'prepaid',
  capDownload: false,
  capUpload: false,
  capTotal: false,
  capExpiry: false,
  capTime: false,
  rateDl: 0,
  rateUl: 0,
  ciscoPolicyDl: '',
  ciscoPolicyUl: '',
  dailyDlMb: 0,
  dailyUlMb: 0,
  dailyTotalMb: 0,
  dailyTimeHours: 0,
  dailyTimeMinutes: 0,
  dailyTimeSeconds: 0,
  burstEnabled: false,
  burstLimitDl: 0,
  burstLimitUl: 0,
  burstThreshDl: 0,
  burstThreshUl: 0,
  burstTimeDl: 0,
  burstTimeUl: 0,
  priority: 8,
  ipPool: '',
  nextDisabledId: '',
  nextExpiredId: '',
  nextDailyId: '',
  ignoreStaticIp: false,
  customAttrs: '',
  generateTftp: false,
  advancedCm: false,
  allowedNasIds: [],
  allowedManagerIds: [],
  // Accounting defaults
  postpaidCalcDl: false,
  postpaidCalcUl: false,
  postpaidCalcTime: false,
  isMonthly: false,
  autoRenew: false,
  carryOver: false,
  resetOnExpiry: true,
  resetOnNegative: false,
  additionalCredits: false,
  netUnitPrice: 0,
  grossUnitPrice: 0,
  netAddPrice: 0,
  grossAddPrice: 0,
  dateAddMode: 'reset',
  timeAddMode: 'reset',
  trafficAddMode: 'reset',
  expiryUnit: 'days',
  expiryUnitValue: 0,
  initialExpiryVal: 0,
  timeUnit: 'minutes',
  timeUnitValue: 0,
  initialTimeSecs: 0,
  dlTrafficUnitMb: 0,
  initialDlMb: 0,
  ulTrafficUnitMb: 0,
  initialUlMb: 0,
  totalTrafficUnitMb: 0,
  initialTotalMb: 0,
  minBaseAmount: 1,
  addTrafficUnitMb: 1,
  minAddAmount: 1,
};

interface ServicePlanFormProps {
  initialData?: Partial<ServicePlanFormData>;
  isEdit?: boolean;
  onSubmit: (data: ServicePlanFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function ServicePlanForm({ initialData, isEdit, onSubmit, onDelete }: ServicePlanFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ServicePlanFormData>({ ...DEFAULT_FORM, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'accounting'>('general');

  const [nasList, setNasList] = useState<NasDevice[]>([]);
  const [managersList, setManagersList] = useState<Manager[]>([]);
  const [allPlans, setAllPlans] = useState<ServicePlan[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<NasDevice[]>('/nas'),
      api.get<Manager[]>('/managers'),
      api.get<ServicePlan[]>('/service-plans'),
    ]).then(([nas, managers, plans]) => {
      setNasList(nas);
      setManagersList(managers);
      setAllPlans(plans);
    }).catch(() => {});
  }, []);

  const set = (field: keyof ServicePlanFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const toggleListItem = (field: 'allowedNasIds' | 'allowedManagerIds', id: string) => {
    setForm((prev) => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] };
    });
  };

  const selectAllItems = (field: 'allowedNasIds' | 'allowedManagerIds', allIds: string[]) => {
    setForm((prev) => ({ ...prev, [field]: [...allIds] }));
  };

  const selectNoneItems = (field: 'allowedNasIds' | 'allowedManagerIds') => {
    setForm((prev) => ({ ...prev, [field]: [] }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Plan name is required';
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
    if (!confirm('Are you sure you want to delete this service plan?')) return;
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
  const sectionClass = 'bg-white rounded-xl border border-gray-200 p-6 mb-6';

  const dailyTimeStr = `${String(form.dailyTimeHours).padStart(2, '0')}:${String(form.dailyTimeMinutes).padStart(2, '0')}:${String(form.dailyTimeSeconds).padStart(2, '0')}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/service-plans')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Service Plan' : 'New Service Plan'}
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
            {saving ? 'Saving...' : isEdit ? 'Update Service' : 'Store Service'}
          </button>
        </div>
      </div>

      {errors._form && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errors._form}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'general' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('accounting')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'accounting' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Accounting
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Basic Information
              </h2>
              <div className="space-y-4">
                {/* Plan name */}
                <div>
                  <label className={labelClass}>
                    <span className="text-red-500">*</span> Plan name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    className={cn(inputClass, errors.name && 'border-red-300 focus:ring-red-500')}
                  />
                  {errors.name && <p className={errorClass}>{errors.name}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className={labelClass}>Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Enable */}
                <div>
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

                {/* Available in UCP */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.availableUcp}
                      onChange={(e) => set('availableUcp', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Available in UCP</span>
                  </label>
                </div>

                {/* Plan type */}
                <div>
                  <label className={labelClass}>Plan type</label>
                  <div className="space-y-2 mt-1">
                    {PLAN_TYPES.map((pt) => (
                      <label key={pt.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="planType"
                          value={pt.value}
                          checked={form.planType === pt.value}
                          onChange={(e) => set('planType', e.target.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{pt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Limits */}
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Limits
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.capDownload}
                    onChange={(e) => set('capDownload', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Limit download</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.capUpload}
                    onChange={(e) => set('capUpload', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Limit upload</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.capTotal}
                    onChange={(e) => set('capTotal', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Limit total traffic</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.capExpiry}
                    onChange={(e) => set('capExpiry', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Date expiry</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.capTime}
                    onChange={(e) => set('capTime', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Limit online time</span>
                </label>
              </div>
            </div>

            {/* Data Rate & Quotas */}
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Data Rate & Quotas
              </h2>
              <div className="space-y-4">
                {/* Data rate */}
                <div>
                  <label className={labelClass}>Data rate (DL / UL)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={form.rateDl}
                      onChange={(e) => set('rateDl', parseInt(e.target.value) || 0)}
                      className={cn(inputClass, 'w-32')}
                    />
                    <span className="text-sm text-gray-500">/</span>
                    <input
                      type="number"
                      min={0}
                      value={form.rateUl}
                      onChange={(e) => set('rateUl', parseInt(e.target.value) || 0)}
                      className={cn(inputClass, 'w-32')}
                    />
                    <span className="text-sm text-gray-500">kbps</span>
                    <span className="text-xs text-gray-400">(0 - no limit)</span>
                  </div>
                </div>

                {/* Cisco policy maps */}
                <div>
                  <label className={labelClass}>Cisco policy map (DL)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={form.ciscoPolicyDl}
                      onChange={(e) => set('ciscoPolicyDl', e.target.value)}
                      className={inputClass}
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">(Cisco only)</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Cisco policy map (UL)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={form.ciscoPolicyUl}
                      onChange={(e) => set('ciscoPolicyUl', e.target.value)}
                      className={inputClass}
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">(Cisco only)</span>
                  </div>
                </div>

                {/* Download quota per day */}
                <div>
                  <label className={labelClass}>Download quota per day</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={form.dailyDlMb}
                      onChange={(e) => set('dailyDlMb', parseInt(e.target.value) || 0)}
                      className={cn(inputClass, 'w-40')}
                    />
                    <span className="text-sm text-gray-500">MB</span>
                    <span className="text-xs text-gray-400">(0 - no download quota)</span>
                  </div>
                </div>

                {/* Upload quota per day */}
                <div>
                  <label className={labelClass}>Upload quota per day</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={form.dailyUlMb}
                      onChange={(e) => set('dailyUlMb', parseInt(e.target.value) || 0)}
                      className={cn(inputClass, 'w-40')}
                    />
                    <span className="text-sm text-gray-500">MB</span>
                    <span className="text-xs text-gray-400">(0 - no upload quota)</span>
                  </div>
                </div>

                {/* Total quota per day */}
                <div>
                  <label className={labelClass}>Total quota per day</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={form.dailyTotalMb}
                      onChange={(e) => set('dailyTotalMb', parseInt(e.target.value) || 0)}
                      className={cn(inputClass, 'w-40')}
                    />
                    <span className="text-sm text-gray-500">MB</span>
                    <span className="text-xs text-gray-400">(0 - no total quota)</span>
                  </div>
                </div>

                {/* Time quota per day */}
                <div>
                  <label className={labelClass}>Time quota per day</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={form.dailyTimeHours}
                      onChange={(e) => set('dailyTimeHours', parseInt(e.target.value) || 0)}
                      className={cn(inputClass, 'w-20 text-center')}
                      placeholder="HH"
                    />
                    <span className="text-gray-500">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={form.dailyTimeMinutes}
                      onChange={(e) => set('dailyTimeMinutes', parseInt(e.target.value) || 0)}
                      className={cn(inputClass, 'w-20 text-center')}
                      placeholder="MM"
                    />
                    <span className="text-gray-500">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={form.dailyTimeSeconds}
                      onChange={(e) => set('dailyTimeSeconds', parseInt(e.target.value) || 0)}
                      className={cn(inputClass, 'w-20 text-center')}
                      placeholder="SS"
                    />
                    <span className="text-xs text-gray-400">(HH:MM:SS) (00:00:00 - no time quota)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Burst Mode */}
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Burst Mode
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.burstEnabled}
                    onChange={(e) => set('burstEnabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable burst mode</span>
                </label>

                {form.burstEnabled && (
                  <div className="space-y-4 pl-7">
                    {/* Burst limit */}
                    <div>
                      <label className={labelClass}>Burst limit (DL / UL)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={form.burstLimitDl}
                          onChange={(e) => set('burstLimitDl', parseInt(e.target.value) || 0)}
                          className={cn(inputClass, 'w-32')}
                        />
                        <span className="text-sm text-gray-500">/</span>
                        <input
                          type="number"
                          min={0}
                          value={form.burstLimitUl}
                          onChange={(e) => set('burstLimitUl', parseInt(e.target.value) || 0)}
                          className={cn(inputClass, 'w-32')}
                        />
                        <span className="text-sm text-gray-500">kbps</span>
                      </div>
                    </div>

                    {/* Burst threshold */}
                    <div>
                      <label className={labelClass}>Burst threshold (DL / UL)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={form.burstThreshDl}
                          onChange={(e) => set('burstThreshDl', parseInt(e.target.value) || 0)}
                          className={cn(inputClass, 'w-32')}
                        />
                        <span className="text-sm text-gray-500">/</span>
                        <input
                          type="number"
                          min={0}
                          value={form.burstThreshUl}
                          onChange={(e) => set('burstThreshUl', parseInt(e.target.value) || 0)}
                          className={cn(inputClass, 'w-32')}
                        />
                        <span className="text-sm text-gray-500">kbps</span>
                      </div>
                    </div>

                    {/* Burst time */}
                    <div>
                      <label className={labelClass}>Burst time (DL / UL)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={form.burstTimeDl}
                          onChange={(e) => set('burstTimeDl', parseInt(e.target.value) || 0)}
                          className={cn(inputClass, 'w-32')}
                        />
                        <span className="text-sm text-gray-500">/</span>
                        <input
                          type="number"
                          min={0}
                          value={form.burstTimeUl}
                          onChange={(e) => set('burstTimeUl', parseInt(e.target.value) || 0)}
                          className={cn(inputClass, 'w-32')}
                        />
                        <span className="text-sm text-gray-500">seconds</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Priority & Pool */}
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Priority & Network
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Priority</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={form.priority}
                    onChange={(e) => set('priority', parseInt(e.target.value) || 8)}
                    className={cn(inputClass, 'w-24')}
                  />
                </div>
                <div>
                  <label className={labelClass}>IP pool name</label>
                  <input
                    type="text"
                    value={form.ipPool}
                    onChange={(e) => set('ipPool', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Next service references */}
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Service Transitions
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Next disabled service</label>
                  <select
                    value={form.nextDisabledId}
                    onChange={(e) => set('nextDisabledId', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">None</option>
                    {allPlans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Next expired service</label>
                  <select
                    value={form.nextExpiredId}
                    onChange={(e) => set('nextExpiredId', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">None</option>
                    {allPlans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Next daily service</label>
                  <select
                    value={form.nextDailyId}
                    onChange={(e) => set('nextDailyId', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">None</option>
                    {allPlans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Advanced */}
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Advanced
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.ignoreStaticIp}
                    onChange={(e) => set('ignoreStaticIp', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Ignore static IP</span>
                </label>

                <div>
                  <label className={labelClass}>Custom RADIUS attributes</label>
                  <textarea
                    value={form.customAttrs}
                    onChange={(e) => set('customAttrs', e.target.value)}
                    rows={4}
                    className={inputClass}
                    placeholder="One attribute per line"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.generateTftp}
                    onChange={(e) => set('generateTftp', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Generate TFTP boot file</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.advancedCm}
                    onChange={(e) => set('advancedCm', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Advanced CM configuration</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column - NAS & Managers lists */}
          <div className="space-y-6">
            {/* Allowed NASs */}
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-3 border-b border-gray-200">
                Allowed NASs
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                <div className="max-h-64 overflow-y-auto">
                  {nasList.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">No NAS devices found</p>
                  ) : (
                    nasList.map((nas) => (
                      <label
                        key={nas.id}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors',
                          form.allowedNasIds.includes(nas.id) && 'bg-blue-50 text-blue-700'
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleListItem('allowedNasIds', nas.id);
                        }}
                      >
                        <span className={cn(
                          'flex-1',
                          form.allowedNasIds.includes(nas.id) ? 'font-medium' : ''
                        )}>
                          {nas.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectAllItems('allowedNasIds', nasList.map((n) => n.id))}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  [all]
                </button>
                <button
                  type="button"
                  onClick={() => selectNoneItems('allowedNasIds')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  [none]
                </button>
              </div>
            </div>

            {/* Available for managers */}
            <div className={sectionClass}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-3 border-b border-gray-200">
                Available for Managers
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                <div className="max-h-64 overflow-y-auto">
                  {managersList.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">No managers found</p>
                  ) : (
                    managersList.map((mgr) => (
                      <label
                        key={mgr.id}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors',
                          form.allowedManagerIds.includes(mgr.id) && 'bg-blue-50 text-blue-700'
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleListItem('allowedManagerIds', mgr.id);
                        }}
                      >
                        <span className={cn(
                          'flex-1',
                          form.allowedManagerIds.includes(mgr.id) ? 'font-medium' : ''
                        )}>
                          {mgr.username}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectAllItems('allowedManagerIds', managersList.map((m) => m.id))}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  [all]
                </button>
                <button
                  type="button"
                  onClick={() => selectNoneItems('allowedManagerIds')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  [none]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'accounting' && (
        <AccountingTab form={form} set={set} allPlans={allPlans} inputClass={inputClass} labelClass={labelClass} sectionClass={sectionClass} />
      )}

      {/* Footer note */}
      <p className="text-xs text-gray-500 mt-6 mb-6">
        <span className="text-red-500">*</span> Fields are mandatory
      </p>
    </div>
  );
}

/* ======================== Accounting Tab ======================== */

const VAT_RATE = 0.075; // 7.5% Nigerian VAT

function computeVat(gross: number, net: number) {
  return Math.max(0, gross - net);
}

interface AccountingTabProps {
  form: ServicePlanFormData;
  set: (field: keyof ServicePlanFormData, value: any) => void;
  allPlans: ServicePlan[];
  inputClass: string;
  labelClass: string;
  sectionClass: string;
}

function AccountingTab({ form, set, allPlans, inputClass, labelClass, sectionClass }: AccountingTabProps) {
  const unitVat = computeVat(form.grossUnitPrice, form.netUnitPrice);
  const addVat = computeVat(form.grossAddPrice, form.netAddPrice);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Postpaid price calculation */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
          Postpaid Price Calculation
        </h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.postpaidCalcDl}
              onChange={(e) => set('postpaidCalcDl', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Download traffic</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.postpaidCalcUl}
              onChange={(e) => set('postpaidCalcUl', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Upload traffic</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.postpaidCalcTime}
              onChange={(e) => set('postpaidCalcTime', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Online time</span>
          </label>
        </div>
      </div>

      {/* Account options */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
          Account Options
        </h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isMonthly}
              onChange={(e) => set('isMonthly', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Monthly account</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoRenew}
              onChange={(e) => set('autoRenew', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Automatic renewal</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.carryOver}
              onChange={(e) => set('carryOver', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Carry over remaining traffic</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.resetOnExpiry}
              onChange={(e) => set('resetOnExpiry', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Reset counters if date is expired</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.resetOnNegative}
              onChange={(e) => set('resetOnNegative', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Reset counters if traffic is negative</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.additionalCredits}
              onChange={(e) => set('additionalCredits', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enable additional credits</span>
          </label>
        </div>
      </div>

      {/* Pricing */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
          Pricing
        </h2>
        <div className="space-y-4">
          {/* Net unit price */}
          <div>
            <label className={labelClass}>Net unit price</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.netUnitPrice}
                onChange={(e) => set('netUnitPrice', parseFloat(e.target.value) || 0)}
                className={cn(inputClass, 'w-40')}
              />
              <span className="text-sm text-gray-500">NGN</span>
            </div>
          </div>
          {/* Gross unit price */}
          <div>
            <label className={labelClass}>Gross unit price</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.grossUnitPrice}
                onChange={(e) => set('grossUnitPrice', parseFloat(e.target.value) || 0)}
                className={cn(inputClass, 'w-40')}
              />
              <span className="text-sm text-gray-500">NGN</span>
              <span className="text-xs text-gray-400 ml-2">VAT: {unitVat.toFixed(6)} NGN</span>
            </div>
          </div>
          {/* Net additional unit price */}
          <div>
            <label className={labelClass}>Net additional unit price</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.netAddPrice}
                onChange={(e) => set('netAddPrice', parseFloat(e.target.value) || 0)}
                className={cn(inputClass, 'w-40')}
              />
              <span className="text-sm text-gray-500">NGN</span>
            </div>
          </div>
          {/* Gross additional unit price */}
          <div>
            <label className={labelClass}>Gross additional unit price</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.grossAddPrice}
                onChange={(e) => set('grossAddPrice', parseFloat(e.target.value) || 0)}
                className={cn(inputClass, 'w-40')}
              />
              <span className="text-sm text-gray-500">NGN</span>
              <span className="text-xs text-gray-400 ml-2">VAT: {addVat.toFixed(6)} NGN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Addition Modes */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
          Addition Modes
        </h2>
        <div className="space-y-5">
          {/* Date addition mode */}
          <div>
            <label className={labelClass}>Date addition mode</label>
            <div className="space-y-2 mt-1">
              {[
                { value: 'reset', label: 'Reset expiry date' },
                { value: 'prolong', label: 'Prolong expiry date' },
                { value: 'prolong_corrected', label: 'Prolong expiry date with correction' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="dateAddMode"
                    value={opt.value}
                    checked={form.dateAddMode === opt.value}
                    onChange={(e) => set('dateAddMode', e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Time addition mode */}
          <div>
            <label className={labelClass}>Time addition mode</label>
            <div className="space-y-2 mt-1">
              {[
                { value: 'reset', label: 'Reset online time' },
                { value: 'prolong', label: 'Add online time' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="timeAddMode"
                    value={opt.value}
                    checked={form.timeAddMode === opt.value}
                    onChange={(e) => set('timeAddMode', e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Traffic addition mode */}
          <div>
            <label className={labelClass}>Traffic addition mode</label>
            <div className="space-y-2 mt-1">
              {[
                { value: 'reset', label: 'Reset traffic counters' },
                { value: 'additive', label: 'Add traffic' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="trafficAddMode"
                    value={opt.value}
                    checked={form.trafficAddMode === opt.value}
                    onChange={(e) => set('trafficAddMode', e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Units & Initial Values */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
          Units & Initial Values
        </h2>
        <div className="space-y-4">
          {/* Expiry date unit */}
          <div>
            <label className={labelClass}>Expiry date unit</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={form.expiryUnitValue}
                onChange={(e) => set('expiryUnitValue', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">Initial:</span>
              <input
                type="number"
                min={0}
                value={form.initialExpiryVal}
                onChange={(e) => set('initialExpiryVal', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <select
                value={form.expiryUnit}
                onChange={(e) => set('expiryUnit', e.target.value)}
                className={cn(inputClass, 'w-32')}
              >
                <option value="days">day(s)</option>
                <option value="months">month(s)</option>
              </select>
            </div>
          </div>

          {/* Online time unit */}
          <div>
            <label className={labelClass}>Online time unit</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={form.timeUnitValue}
                onChange={(e) => set('timeUnitValue', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">Initial:</span>
              <input
                type="number"
                min={0}
                value={form.initialTimeSecs}
                onChange={(e) => set('initialTimeSecs', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <select
                value={form.timeUnit}
                onChange={(e) => set('timeUnit', e.target.value)}
                className={cn(inputClass, 'w-32')}
              >
                <option value="minutes">minute(s)</option>
                <option value="hours">hour(s)</option>
              </select>
            </div>
          </div>

          {/* Download traffic unit */}
          <div>
            <label className={labelClass}>Download traffic unit</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={form.dlTrafficUnitMb}
                onChange={(e) => set('dlTrafficUnitMb', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">Initial:</span>
              <input
                type="number"
                min={0}
                value={form.initialDlMb}
                onChange={(e) => set('initialDlMb', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">MB</span>
            </div>
          </div>

          {/* Upload traffic unit */}
          <div>
            <label className={labelClass}>Upload traffic unit</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={form.ulTrafficUnitMb}
                onChange={(e) => set('ulTrafficUnitMb', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">Initial:</span>
              <input
                type="number"
                min={0}
                value={form.initialUlMb}
                onChange={(e) => set('initialUlMb', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">MB</span>
            </div>
          </div>

          {/* Total traffic unit */}
          <div>
            <label className={labelClass}>Total traffic unit</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={form.totalTrafficUnitMb}
                onChange={(e) => set('totalTrafficUnitMb', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">Initial:</span>
              <input
                type="number"
                min={0}
                value={form.initialTotalMb}
                onChange={(e) => set('initialTotalMb', parseInt(e.target.value) || 0)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quantities */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
          Quantities
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Minimal base quantity</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={form.minBaseAmount}
                onChange={(e) => set('minBaseAmount', parseInt(e.target.value) || 1)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">unit(s)</span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Additional traffic unit</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={form.addTrafficUnitMb}
                onChange={(e) => set('addTrafficUnitMb', parseInt(e.target.value) || 1)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">MB</span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Minimal additional quantity</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={form.minAddAmount}
                onChange={(e) => set('minAddAmount', parseInt(e.target.value) || 1)}
                className={cn(inputClass, 'w-24')}
              />
              <span className="text-sm text-gray-500">unit(s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
