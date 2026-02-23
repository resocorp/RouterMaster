'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/DataTable';

type Tab = 'general' | 'billing' | 'account' | 'selfreg' | 'notifications';

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'billing', label: 'Billing' },
  { key: 'account', label: 'Account' },
  { key: 'selfreg', label: 'Self Reg. & IAS' },
  { key: 'notifications', label: 'Notifications' },
];

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const selectCls = inputCls;
const checkboxCls = 'rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const sectionCls = 'bg-white rounded-xl border border-gray-200 p-6';

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start py-3 border-b border-gray-100 last:border-0">
      <label className="text-sm font-medium text-gray-700 sm:pt-2">
        {required && <span className="text-red-500 mr-1">*</span>}
        {label}
      </label>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={checkboxCls} />
      {label}
    </label>
  );
}

function CheckboxGrid({ items, checked, onChange }: { items: { key: string; label: string }[]; checked: string[]; onChange: (v: string[]) => void }) {
  const toggle = (key: string) => {
    if (checked.includes(key)) onChange(checked.filter((k) => k !== key));
    else onChange([...checked, key]);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={checked.includes(item.key)} onChange={() => toggle(item.key)} className={checkboxCls} />
          {item.label}
        </label>
      ))}
    </div>
  );
}

const MANDATORY_FIELD_OPTIONS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'zip', label: 'ZIP' },
  { key: 'country', label: 'Country' },
  { key: 'stateOrProvince', label: 'State or province' },
  { key: 'phone', label: 'Phone' },
  { key: 'cellNumber', label: 'Cell number' },
  { key: 'email', label: 'Email' },
  { key: 'vatId', label: 'VAT ID' },
  { key: 'cnic', label: 'CNIC' },
];

const SELF_REG_FIELD_OPTIONS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'zip', label: 'ZIP' },
  { key: 'country', label: 'Country' },
  { key: 'stateOrProvince', label: 'State or province' },
  { key: 'phone', label: 'Phone' },
  { key: 'cellNumber', label: 'Cell number' },
  { key: 'email', label: 'Email' },
  { key: 'vatId', label: 'VAT ID' },
];

const IAS_FIELD_OPTIONS = [
  { key: 'email', label: 'Email' },
  { key: 'cellNumber', label: 'Cell number' },
];

const PAYMENT_GATEWAYS = [
  { key: 'gwInternal', label: 'Internal' },
  { key: 'gwPaypalStandard', label: 'PayPal Website Payments Standard' },
  { key: 'gwPaypalPro', label: 'PayPal Website Payments Pro' },
  { key: 'gwPaypalExpress', label: 'PayPal Express Checkout' },
  { key: 'gwNetcash', label: 'Netcash' },
  { key: 'gwPayfast', label: 'Payfast' },
  { key: 'gwAuthorizeNet', label: 'Authorize.net' },
  { key: 'gwDpsPaymentExpress', label: 'DPS Payment Express' },
  { key: 'gw2Checkout', label: '2Checkout' },
  { key: 'gwPayU', label: 'PayU' },
  { key: 'gwPaytm', label: 'Paytm' },
  { key: 'gwBkash', label: 'bKash' },
  { key: 'gwFlutterwave', label: 'Flutterwave' },
  { key: 'gwEasypay', label: 'Easypay' },
  { key: 'gwMpesa', label: 'MPESA' },
  { key: 'gwCustom', label: 'Custom (user defined)' },
];

export default function SettingsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<Tab>('general');

  useEffect(() => {
    Promise.all([api.get('/settings/tenant'), api.get('/settings')])
      .then(([t, s]) => { setTenant(t); setSettings(s); })
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const set = useCallback((key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  const saveTenant = async () => {
    setSaving(true);
    try { await api.put('/settings/tenant', tenant); showMsg('Tenant saved'); }
    catch (e: any) { showMsg(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try { await api.put('/settings', settings); showMsg('Settings saved'); }
    catch (e: any) { showMsg(e.message, 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <PageHeader title="Settings" />
      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm border ${msgType === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msg}
        </div>
      )}

      <div className="grid gap-6">
        {/* Tenant Information */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold mb-4">Tenant Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name</label>
              <input type="text" value={tenant?.name || ''} onChange={(e) => setTenant({ ...tenant, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Domain</label>
              <input type="text" value={tenant?.domain || ''} onChange={(e) => setTenant({ ...tenant, domain: e.target.value })} className={inputCls} />
            </div>
          </div>
          <button onClick={saveTenant} disabled={saving} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
            {saving ? 'Saving...' : 'Save Tenant'}
          </button>
        </div>

        {/* System Settings with Tabs */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold mb-4">System Settings</h2>

          {/* Tab Bar */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px space-x-6 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-1">
              <FieldRow label="Disconnection method:">
                <div className="flex gap-4">
                  {['nas', 'remote'].map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="disconnectMethod" value={v} checked={settings?.disconnectMethod === v}
                        onChange={() => set('disconnectMethod', v)} className="text-blue-600 focus:ring-blue-500" />
                      {v === 'nas' ? 'NAS' : 'Remote'}
                    </label>
                  ))}
                </div>
              </FieldRow>

              <FieldRow label="Hide limits in user list view (performance):">
                <input type="checkbox" checked={settings?.hideLimitsInUserList ?? false}
                  onChange={(e) => set('hideLimitsInUserList', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Add new NAS to all services:">
                <input type="checkbox" checked={settings?.addNewNasToAllServices ?? true}
                  onChange={(e) => set('addNewNasToAllServices', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Add new manager to all services:">
                <input type="checkbox" checked={settings?.addNewManagerToAllServices ?? false}
                  onChange={(e) => set('addNewManagerToAllServices', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Disconnection time of date capped accounts:">
                <div className="flex items-center gap-2">
                  <select value={settings?.disconnectTimeHour ?? 23} onChange={(e) => set('disconnectTimeHour', parseInt(e.target.value))}
                    className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                  </select>
                  <span className="text-gray-500 font-medium">:</span>
                  <select value={settings?.disconnectTimeMinute ?? 59} onChange={(e) => set('disconnectTimeMinute', parseInt(e.target.value))}
                    className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                  </select>
                  <span className="text-xs text-gray-400">(HH:MM)</span>
                </div>
              </FieldRow>

              <p className="text-xs text-red-500 mt-4">* Fields are mandatory!</p>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-1">
              <FieldRow label="Currency:" required>
                <input type="text" value={settings?.currency || ''} onChange={(e) => set('currency', e.target.value)}
                  className={`${inputCls} max-w-[200px]`} />
              </FieldRow>

              <FieldRow label="VAT / GST:">
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" value={settings?.vatPercent ?? 0}
                    onChange={(e) => set('vatPercent', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} max-w-[120px]`} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </FieldRow>

              <FieldRow label="Adv. sales TAX:">
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" value={settings?.advSalesTax ?? 0}
                    onChange={(e) => set('advSalesTax', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} max-w-[120px]`} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </FieldRow>

              <FieldRow label="Postpaid renewal day:">
                <select value={settings?.postpaidRenewalDay ?? 1} onChange={(e) => set('postpaidRenewalDay', parseInt(e.target.value))}
                  className={`${selectCls} max-w-[100px]`}>
                  {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
              </FieldRow>

              <FieldRow label="Billing period begins on:">
                <select value={settings?.billingPeriodStart ?? 1} onChange={(e) => set('billingPeriodStart', parseInt(e.target.value))}
                  className={`${selectCls} max-w-[100px]`}>
                  {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
              </FieldRow>

              <FieldRow label="Grace period:">
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={settings?.gracePeriodDays ?? 1}
                    onChange={(e) => set('gracePeriodDays', parseInt(e.target.value) || 0)}
                    className={`${inputCls} max-w-[100px]`} />
                  <span className="text-sm text-gray-500">day(s)</span>
                </div>
              </FieldRow>

              <FieldRow label="Reset credits upon service change:">
                <input type="checkbox" checked={settings?.resetCreditsOnServiceChange ?? true}
                  onChange={(e) => set('resetCreditsOnServiceChange', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Disconnect postpaid users at the beginning of billing period:">
                <input type="checkbox" checked={settings?.disconnectPostpaidAtBillingStart ?? false}
                  onChange={(e) => set('disconnectPostpaidAtBillingStart', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Disable accounts due to unpaid invoices:">
                <input type="checkbox" checked={settings?.disableAccountsUnpaidInvoices ?? true}
                  onChange={(e) => set('disableAccountsUnpaidInvoices', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Disable accounts due to expired contract:">
                <input type="checkbox" checked={settings?.disableAccountsExpiredContract ?? true}
                  onChange={(e) => set('disableAccountsExpiredContract', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Enable voucher redemption (UCP):">
                <input type="checkbox" checked={settings?.enableVoucherRedemption ?? true}
                  onChange={(e) => set('enableVoucherRedemption', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Enable account recharge (UCP):">
                <input type="checkbox" checked={settings?.enableAccountRecharge ?? true}
                  onChange={(e) => set('enableAccountRecharge', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Enable deposit purchase (UCP):">
                <input type="checkbox" checked={settings?.enableDepositPurchase ?? true}
                  onChange={(e) => set('enableDepositPurchase', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Enabled payment gateways:">
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_GATEWAYS.map((gw) => (
                    <label key={gw.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={settings?.[gw.key] ?? false}
                        onChange={(e) => set(gw.key, e.target.checked)} className={checkboxCls} />
                      {gw.label}
                    </label>
                  ))}
                </div>
              </FieldRow>

              <p className="text-xs text-red-500 mt-4">* Fields are mandatory!</p>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-1">
              <FieldRow label="Lock first seen MAC address:">
                <input type="checkbox" checked={settings?.lockFirstMac ?? false}
                  onChange={(e) => set('lockFirstMac', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Enable user data edit (UCP):">
                <input type="checkbox" checked={settings?.ucpEditData ?? false}
                  onChange={(e) => set('ucpEditData', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Enable service change (UCP):">
                <div className="flex flex-col gap-2">
                  {[
                    { value: 'never', label: 'Never' },
                    { value: 'only_when_expired', label: 'Only when expired' },
                    { value: 'any_time', label: 'Any time' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="ucpServiceChange" value={opt.value}
                        checked={settings?.ucpServiceChange === opt.value}
                        onChange={() => set('ucpServiceChange', opt.value)}
                        className="text-blue-600 focus:ring-blue-500" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </FieldRow>

              <FieldRow label="Enable password change (UCP):">
                <input type="checkbox" checked={settings?.ucpChangePassword ?? false}
                  onChange={(e) => set('ucpChangePassword', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Mandatory fields:">
                <CheckboxGrid
                  items={MANDATORY_FIELD_OPTIONS}
                  checked={settings?.mandatoryFields ?? []}
                  onChange={(v) => set('mandatoryFields', v)}
                />
              </FieldRow>

              <p className="text-xs text-red-500 mt-4">* Fields are mandatory!</p>
            </div>
          )}

          {/* Self Reg & IAS Tab */}
          {activeTab === 'selfreg' && (
            <div className="space-y-1">
              <FieldRow label="Enable self registration:">
                <input type="checkbox" checked={settings?.selfRegEnabled ?? false}
                  onChange={(e) => set('selfRegEnabled', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <FieldRow label="Name self registration requires:">
                <div className="flex flex-col gap-2">
                  <CheckboxField label="SMS activation" checked={settings?.selfRegNameRequiresSms ?? false}
                    onChange={(v) => set('selfRegNameRequiresSms', v)} />
                  <CheckboxField label="Email activation" checked={settings?.selfRegNameRequiresEmail ?? false}
                    onChange={(v) => set('selfRegNameRequiresEmail', v)} />
                </div>
              </FieldRow>

              <FieldRow label="Cell number self registration requires:">
                <CheckboxField label="SMS activation" checked={settings?.selfRegCellRequiresSms ?? false}
                  onChange={(v) => set('selfRegCellRequiresSms', v)} />
              </FieldRow>

              <FieldRow label="Self registration mandatory fields:">
                <CheckboxGrid
                  items={SELF_REG_FIELD_OPTIONS}
                  checked={settings?.selfRegMandatoryFields ?? []}
                  onChange={(v) => set('selfRegMandatoryFields', v)}
                />
              </FieldRow>

              <FieldRow label="Self registration allows:">
                <div className="flex flex-col gap-2">
                  <CheckboxField label="Duplicate email address" checked={settings?.selfRegAllowDuplicateEmail ?? false}
                    onChange={(v) => set('selfRegAllowDuplicateEmail', v)} />
                  <CheckboxField label="Duplicate cell number" checked={settings?.selfRegAllowDuplicateCell ?? false}
                    onChange={(v) => set('selfRegAllowDuplicateCell', v)} />
                </div>
              </FieldRow>

              <FieldRow label="Self registration default sim-use:">
                <input type="number" min="1" value={settings?.selfRegDefaultSimUse ?? 1}
                  onChange={(e) => set('selfRegDefaultSimUse', parseInt(e.target.value) || 1)}
                  className={`${inputCls} max-w-[100px]`} />
              </FieldRow>

              <FieldRow label="Self registration default user group:">
                <input type="text" value={settings?.selfRegDefaultUserGroup || ''} placeholder="Self registration"
                  onChange={(e) => set('selfRegDefaultUserGroup', e.target.value)}
                  className={`${inputCls} max-w-[250px]`} />
              </FieldRow>

              <FieldRow label="Captcha forced:">
                <input type="checkbox" checked={settings?.captchaEnabled ?? false}
                  onChange={(e) => set('captchaEnabled', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <div className="border-t border-gray-200 my-4" />

              <FieldRow label="IAS mandatory fields:">
                <CheckboxGrid
                  items={IAS_FIELD_OPTIONS}
                  checked={settings?.iasMandatoryFields ?? []}
                  onChange={(v) => set('iasMandatoryFields', v)}
                />
              </FieldRow>

              <FieldRow label="IAS registration allows:">
                <div className="flex flex-col gap-2">
                  <CheckboxField label="Duplicate email address" checked={settings?.iasAllowDuplicateEmail ?? false}
                    onChange={(v) => set('iasAllowDuplicateEmail', v)} />
                  <CheckboxField label="Duplicate cell number" checked={settings?.iasAllowDuplicateCell ?? false}
                    onChange={(v) => set('iasAllowDuplicateCell', v)} />
                </div>
              </FieldRow>

              <FieldRow label="IAS account requires SMS verification:">
                <input type="checkbox" checked={settings?.iasSmsVerification ?? false}
                  onChange={(e) => set('iasSmsVerification', e.target.checked)} className={checkboxCls} />
              </FieldRow>

              <p className="text-xs text-red-500 mt-4">* Fields are mandatory!</p>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-1">
              <FieldRow label="Notify manager upon self registration:">
                <CheckboxField label="Email" checked={settings?.notifyManagerOnRegEmail ?? true}
                  onChange={(v) => set('notifyManagerOnRegEmail', v)} />
              </FieldRow>

              <FieldRow label="New service plan activated:">
                <div className="flex gap-6">
                  <CheckboxField label="Email" checked={settings?.newServicePlanEmail ?? true}
                    onChange={(v) => set('newServicePlanEmail', v)} />
                  <CheckboxField label="SMS" checked={settings?.newServicePlanSms ?? false}
                    onChange={(v) => set('newServicePlanSms', v)} />
                </div>
              </FieldRow>

              <FieldRow label="Welcome message:">
                <div className="flex gap-6">
                  <CheckboxField label="Email" checked={settings?.welcomeEmail ?? true}
                    onChange={(v) => set('welcomeEmail', v)} />
                  <CheckboxField label="SMS" checked={settings?.welcomeSms ?? false}
                    onChange={(v) => set('welcomeSms', v)} />
                </div>
              </FieldRow>

              <FieldRow label="Account renewal notification:">
                <div className="flex gap-6">
                  <CheckboxField label="Email" checked={settings?.renewalNotificationEmail ?? true}
                    onChange={(v) => set('renewalNotificationEmail', v)} />
                  <CheckboxField label="SMS" checked={settings?.renewalNotificationSms ?? false}
                    onChange={(v) => set('renewalNotificationSms', v)} />
                </div>
              </FieldRow>

              <FieldRow label="Account expiry alert:">
                <div className="flex gap-6">
                  <CheckboxField label="Email" checked={settings?.expiryAlertEmail ?? true}
                    onChange={(v) => set('expiryAlertEmail', v)} />
                  <CheckboxField label="SMS" checked={settings?.expiryAlertSms ?? true}
                    onChange={(v) => set('expiryAlertSms', v)} />
                </div>
              </FieldRow>

              <div className="border-t border-gray-200 my-4" />

              <FieldRow label="Alert level:">
                <div className="flex gap-4">
                  {['fixed', 'percent'].map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="alertLevelType" value={v} checked={settings?.alertLevelType === v}
                        onChange={() => set('alertLevelType', v)} className="text-blue-600 focus:ring-blue-500" />
                      {v === 'fixed' ? 'Fixed value' : 'Percent'}
                    </label>
                  ))}
                </div>
              </FieldRow>

              <FieldRow label="Download alert:">
                <div className="flex items-center gap-3">
                  <input type="number" min="0" value={settings?.alertDlMb ?? 0}
                    onChange={(e) => set('alertDlMb', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} max-w-[120px]`} />
                  <span className="text-sm text-gray-500">MB</span>
                  <input type="number" min="0" max="100" step="0.01" value={settings?.alertDlPercent ?? 0}
                    onChange={(e) => set('alertDlPercent', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} max-w-[100px]`} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </FieldRow>

              <FieldRow label="Upload alert:">
                <div className="flex items-center gap-3">
                  <input type="number" min="0" value={settings?.alertUlMb ?? 0}
                    onChange={(e) => set('alertUlMb', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} max-w-[120px]`} />
                  <span className="text-sm text-gray-500">MB</span>
                  <input type="number" min="0" max="100" step="0.01" value={settings?.alertUlPercent ?? 0}
                    onChange={(e) => set('alertUlPercent', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} max-w-[100px]`} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </FieldRow>

              <FieldRow label="Total traffic alert:">
                <div className="flex items-center gap-3">
                  <input type="number" min="0" value={settings?.alertTotalMb ?? 0}
                    onChange={(e) => set('alertTotalMb', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} max-w-[120px]`} />
                  <span className="text-sm text-gray-500">MB</span>
                  <input type="number" min="0" max="100" step="0.01" value={settings?.alertTotalPercent ?? 0}
                    onChange={(e) => set('alertTotalPercent', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} max-w-[100px]`} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </FieldRow>

              <FieldRow label="Online time alert:">
                <div className="flex items-center gap-3">
                  <input type="text" value={settings?.alertOnlineTime || '00:00:00'}
                    onChange={(e) => set('alertOnlineTime', e.target.value)}
                    placeholder="00:00:00"
                    className={`${inputCls} max-w-[120px]`} />
                  <span className="text-xs text-gray-400">(HH:MM:SS)</span>
                  <input type="number" min="0" max="100" step="0.01" value={settings?.alertOnlineTimePercent ?? 0}
                    onChange={(e) => set('alertOnlineTimePercent', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} max-w-[100px]`} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </FieldRow>

              <FieldRow label="Expiry alert:">
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={settings?.alertExpiryDays ?? 3}
                    onChange={(e) => set('alertExpiryDays', parseInt(e.target.value) || 0)}
                    className={`${inputCls} max-w-[100px]`} />
                  <span className="text-sm text-gray-500">day(s)</span>
                </div>
              </FieldRow>

              <FieldRow label="Send expiry alert:">
                <div className="flex gap-4">
                  {[
                    { value: true, label: 'Only once' },
                    { value: false, label: 'Multiple times' },
                  ].map((opt) => (
                    <label key={String(opt.value)} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="alertSendOnce" checked={(settings?.alertSendOnce ?? true) === opt.value}
                        onChange={() => set('alertSendOnce', opt.value)}
                        className="text-blue-600 focus:ring-blue-500" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </FieldRow>

              <p className="text-xs text-red-500 mt-4">* Fields are mandatory!</p>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button onClick={saveSettings} disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
