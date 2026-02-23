'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/DataTable';

export default function SettingsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([api.get('/settings/tenant'), api.get('/settings')])
      .then(([t, s]) => { setTenant(t); setSettings(s); })
      .finally(() => setLoading(false));
  }, []);

  const saveTenant = async () => {
    setSaving(true);
    try { await api.put('/settings/tenant', tenant); setMsg('Tenant saved'); } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try { await api.put('/settings', settings); setMsg('Settings saved'); } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <PageHeader title="Settings" />
      {msg && <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">{msg}</div>}

      <div className="grid gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Tenant Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={tenant?.name || ''} onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input type="text" value={tenant?.domain || ''} onChange={(e) => setTenant({ ...tenant, domain: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <button onClick={saveTenant} disabled={saving} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
            {saving ? 'Saving...' : 'Save Tenant'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">System Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <input type="text" value={settings?.currency || ''} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT %</label>
              <input type="number" value={settings?.vatPercent ?? 0} onChange={(e) => setSettings({ ...settings, vatPercent: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disconnect Method</label>
              <select value={settings?.disconnectMethod || 'nas'} onChange={(e) => setSettings({ ...settings, disconnectMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="nas">NAS</option>
                <option value="coa">CoA</option>
              </select>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {['ucpEditData', 'ucpChangePassword', 'ucpRedeemVoucher', 'ucpViewInvoices'].map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings?.[key] ?? false} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                  className="rounded border-gray-300" />
                {key.replace('ucp', 'UCP ').replace(/([A-Z])/g, ' $1').trim()}
              </label>
            ))}
          </div>
          <button onClick={saveSettings} disabled={saving} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
