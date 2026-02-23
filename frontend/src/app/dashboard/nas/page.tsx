'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, NasDevice } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import DataTable, { PageHeader } from '@/components/DataTable';

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
  }, [editDevice, open]);

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
            <input
              type="password"
              required
              value={form.secret}
              onChange={(e) => set('secret', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Password (StarOS only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
              <span className="text-xs text-gray-400 ml-2">(StarOS only)</span>
            </label>
            <input
              type="password"
              value={form.nasPassword}
              onChange={(e) => set('nasPassword', e.target.value)}
              disabled={!isStarOS}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
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
            <input
              type="password"
              value={form.apiPassword}
              onChange={(e) => set('apiPassword', e.target.value)}
              disabled={!isMikrotik}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

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

  const loadData = useCallback(() => {
    setLoading(true);
    api.get<NasDevice[]>('/nas').then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (nas: NasDevice) => {
    if (!confirm(`Delete NAS "${nas.name}"?`)) return;
    try {
      await api.delete(`/nas/${nas.id}`);
      loadData();
    } catch {}
  };

  const columns = [
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
          <button
            onClick={() => { setEditDevice(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add NAS
          </button>
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
