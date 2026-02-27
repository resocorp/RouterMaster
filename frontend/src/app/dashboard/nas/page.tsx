'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api, NasDevice } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import DataTable, { PageHeader } from '@/components/DataTable';

interface ConnectionTestResult {
  success: boolean;
  message: string;
  routerIdentity?: string;
  routerVersion?: string;
  latencyMs?: number;
}

const NAS_TYPES = [
  { value: 'mikrotik', label: 'Mikrotik' },
  { value: 'chillispot', label: 'Chillispot' },
  { value: 'cisco', label: 'Cisco' },
  { value: 'staros', label: 'StarOS' },
  { value: 'pfsense', label: 'pfSense' },
  { value: 'other', label: 'Other' },
];

const DYNAMIC_RATE_OPTIONS = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'api', label: 'Mikrotik API (< MT v6)' },
  { value: 'coa', label: 'CoA (MT 6+)' },
];

const API_VERSION_OPTIONS = [
  { value: 'pre-6.45.1', label: 'Pre 6.45.1' },
  { value: '6.45.1+', label: '6.45.1 or newer' },
];

const CISCO_BW_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'rate-limit', label: 'Rate limit' },
  { value: 'policy-map', label: 'Policy map' },
];

interface NasFormData {
  name: string;
  ipAddress: string;
  type: string;
  secret: string;
  nasPassword: string;
  dynamicRate: string;
  apiUsername: string;
  apiPassword: string;
  apiVersion: string;
  ciscoBw: string;
  description: string;
}

const emptyForm: NasFormData = {
  name: '',
  ipAddress: '',
  type: 'mikrotik',
  secret: '',
  nasPassword: '',
  dynamicRate: 'disabled',
  apiUsername: 'admin',
  apiPassword: '',
  apiVersion: 'pre-6.45.1',
  ciscoBw: 'none',
  description: '',
};

function AddNasModal({ open, onClose, onSaved, editDevice }: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editDevice?: NasDevice | null;
}) {
  const [form, setForm] = useState<NasFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showApiPassword, setShowApiPassword] = useState(false);
  const [showNasPassword, setShowNasPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  useEffect(() => {
    if (editDevice) {
      setForm({
        name: editDevice.name,
        ipAddress: editDevice.ipAddress,
        type: editDevice.type,
        secret: editDevice.secret,
        nasPassword: editDevice.nasPassword || '',
        dynamicRate: editDevice.dynamicRate || 'disabled',
        apiUsername: editDevice.apiUsername || 'admin',
        apiPassword: editDevice.apiPassword || '',
        apiVersion: editDevice.apiVersion || 'pre-6.45.1',
        ciscoBw: editDevice.ciscoBw || 'none',
        description: editDevice.description || '',
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
    setTestResult(null);
  }, [editDevice, open]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      let result: ConnectionTestResult;
      if (editDevice) {
        result = await api.post<ConnectionTestResult>(`/nas/${editDevice.id}/test-connection`);
      } else {
        result = await api.post<ConnectionTestResult>('/nas/test-connection', {
          ipAddress: form.ipAddress,
          apiUsername: form.apiUsername,
          apiPassword: form.apiPassword,
          apiVersion: form.apiVersion,
        });
      }
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const set = (field: keyof NasFormData, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.nasPassword) delete payload.nasPassword;
      if (!form.apiPassword) delete payload.apiPassword;

      if (editDevice) {
        await api.put(`/nas/${editDevice.id}`, payload);
      } else {
        await api.post('/nas', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save NAS device');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const isStarOS = form.type === 'staros';
  const isMikrotik = form.type === 'mikrotik';
  const isCisco = form.type === 'cisco';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {editDevice ? 'Edit NAS Device' : 'New NAS'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* NAS Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NAS name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. Main MikroTik"
            />
          </div>

          {/* IP Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IP address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.ipAddress}
              onChange={(e) => set('ipAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. 10.0.0.1"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {NAS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 ml-2">(Mikrotik, Chillispot, Cisco)</span>
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                required
                value={form.secret}
                onChange={(e) => set('secret', e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  {showSecret ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Password (StarOS only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
              <span className="text-xs text-gray-400 ml-2">(StarOS only)</span>
            </label>
            <div className="relative">
              <input
                type={showNasPassword ? 'text' : 'password'}
                value={form.nasPassword}
                onChange={(e) => set('nasPassword', e.target.value)}
                disabled={!isStarOS}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowNasPassword(!showNasPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                disabled={!isStarOS}
                title={showNasPassword ? 'Hide' : 'Show'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  {showNasPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Dynamic data rate */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">Dynamic data rate</legend>
            <div className="space-y-1.5">
              {DYNAMIC_RATE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dynamicRate"
                    value={opt.value}
                    checked={form.dynamicRate === opt.value}
                    onChange={(e) => set('dynamicRate', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* API username (Mikrotik) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API user name
              <span className="text-xs text-gray-400 ml-2">(Mikrotik)</span>
            </label>
            <input
              type="text"
              value={form.apiUsername}
              onChange={(e) => set('apiUsername', e.target.value)}
              disabled={!isMikrotik}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* API password (Mikrotik) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API password
              <span className="text-xs text-gray-400 ml-2">(Mikrotik)</span>
            </label>
            <div className="relative">
              <input
                type={showApiPassword ? 'text' : 'password'}
                value={form.apiPassword}
                onChange={(e) => set('apiPassword', e.target.value)}
                disabled={!isMikrotik}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowApiPassword(!showApiPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                disabled={!isMikrotik}
                title={showApiPassword ? 'Hide' : 'Show'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  {showApiPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Test Connection Button */}
          {isMikrotik && form.ipAddress && form.apiUsername && (
            <div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50
                  bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {testing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Testing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                    </svg>
                    Test API Connection
                  </>
                )}
              </button>
              {testResult && (
                <div className={`mt-2 text-sm rounded-lg px-4 py-3 border ${
                  testResult.success
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                    )}
                    <div>
                      <p className="font-medium">{testResult.message}</p>
                      {testResult.latencyMs !== undefined && (
                        <p className="text-xs mt-0.5 opacity-75">Latency: {testResult.latencyMs}ms</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API version */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">API version</legend>
            <div className="space-y-1.5">
              {API_VERSION_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="apiVersion"
                    value={opt.value}
                    checked={form.apiVersion === opt.value}
                    onChange={(e) => set('apiVersion', e.target.value)}
                    disabled={!isMikrotik}
                    className="text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className={`text-sm ${isMikrotik ? 'text-gray-700' : 'text-gray-400'}`}>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Cisco bandwidth support */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">Cisco bandwidth support</legend>
            <div className="space-y-1.5">
              {CISCO_BW_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ciscoBw"
                    value={opt.value}
                    checked={form.ciscoBw === opt.value}
                    onChange={(e) => set('ciscoBw', e.target.value)}
                    disabled={!isCisco}
                    className="text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className={`text-sm ${isCisco ? 'text-gray-700' : 'text-gray-400'}`}>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Optional description..."
            />
          </div>

          <p className="text-xs text-red-500">* Fields are mandatory!</p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editDevice ? 'Update NAS' : 'Add NAS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NasPage() {
  const [data, setData] = useState<NasDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDevice, setEditDevice] = useState<NasDevice | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, { reachable: boolean }>>({});
  const [statusLoading, setStatusLoading] = useState(false);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    api.get<NasDevice[]>('/nas').then(setData).finally(() => setLoading(false));
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const result = await api.get<Record<string, { reachable: boolean }>>('/nas/status');
      setStatusMap(result);
    } catch {
      // silently fail status checks
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll status every 30 seconds
  useEffect(() => {
    loadStatus();
    statusIntervalRef.current = setInterval(loadStatus, 30000);
    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, [loadStatus]);

  // Refresh status when data changes
  useEffect(() => {
    if (data.length > 0) loadStatus();
  }, [data, loadStatus]);

  const handleDelete = async (nas: NasDevice) => {
    if (!confirm(`Delete NAS "${nas.name}"?`)) return;
    try {
      await api.delete(`/nas/${nas.id}`);
      loadData();
    } catch {}
  };

  const columns = [
    { key: 'status', label: 'Status', render: (n: NasDevice) => {
      const status = statusMap[n.id];
      const isMikrotik = n.type === 'mikrotik';
      if (!isMikrotik) {
        return (
          <span className="inline-flex items-center gap-1.5" title="Status check not available for this device type">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="text-xs text-gray-400">N/A</span>
          </span>
        );
      }
      if (!status) {
        return (
          <span className="inline-flex items-center gap-1.5" title="Checking...">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 animate-pulse" />
            <span className="text-xs text-gray-400">...</span>
          </span>
        );
      }
      return status.reachable ? (
        <span className="inline-flex items-center gap-1.5" title="API port reachable">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-700">Online</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5" title="API port unreachable">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-600">Offline</span>
        </span>
      );
    }},
    { key: 'name', label: 'Name', render: (n: NasDevice) => <span className="font-medium">{n.name}</span> },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'type', label: 'Type', render: (n: NasDevice) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
        {n.type}
      </span>
    )},
    { key: 'dynamicRate', label: 'Dynamic Rate', render: (n: NasDevice) => (
      <span className="text-gray-600 capitalize">{n.dynamicRate || 'disabled'}</span>
    )},
    { key: 'description', label: 'Description', render: (n: NasDevice) => n.description || '—' },
    { key: 'actions', label: '', render: (n: NasDevice) => (
      <div className="flex items-center gap-1 justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); setEditDevice(n); setShowModal(true); }}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(n); }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="NAS Devices"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={loadStatus}
              disabled={statusLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh connectivity status"
            >
              <svg className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Refresh Status
            </button>
            <button
              onClick={() => { setEditDevice(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add NAS
            </button>
          </div>
        }
      />
      <DataTable columns={columns} data={data} loading={loading} />
      <AddNasModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditDevice(null); }}
        onSaved={loadData}
        editDevice={editDevice}
      />
    </div>
  );
}
