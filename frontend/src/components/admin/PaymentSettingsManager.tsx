'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Loader2, Plus, Trash2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import type { IPaymentSettings, IPaymentMethod } from '@bizlistplace/shared';

/**
 * Admin payment-methods manager — ported from PKbizMap's payment
 * settings (PaymentSetting model + settingController).
 *
 * No payment account is hard-coded anywhere. Methods are empty until the
 * admin adds them here; the fee is 0 (free listings) until the admin sets
 * one. Values entered here are shown to listing owners on the
 * add-business page so they know where to pay.
 */

const FEE_COUNTRIES = ['Pakistan', 'UAE', 'USA'] as const;

export function PaymentSettingsManager() {
  const [settings, setSettings] = useState<IPaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [fees, setFees] = useState<Record<string, string>>({ Pakistan: '0', UAE: '0', USA: '0' });
  const [enabled, setEnabled] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [newMethod, setNewMethod] = useState({ name: '', kind: 'number' as 'iban' | 'number', accountTitle: '', accountValue: '', details: '' });

  const load = async () => {
    setLoading(true);
    const res = await fetchApi<{ settings: IPaymentSettings }>('/admin/settings/payment');
    if (res.success && res.data?.settings) {
      const s = res.data.settings;
      setSettings(s);
      setEnabled(!!s.isEnabled);
      setInstructions(s.instructions || '');
      setFees({
        Pakistan: String(s.fees?.Pakistan?.amount ?? 0),
        UAE: String(s.fees?.UAE?.amount ?? 0),
        USA: String(s.fees?.USA?.amount ?? 0),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    const res = await fetchApi<{ settings: IPaymentSettings }>('/admin/settings/payment', {
      method: 'PATCH',
      body: JSON.stringify({
        isEnabled: enabled,
        fees: {
          Pakistan: { amount: Number(fees.Pakistan) || 0 },
          UAE: { amount: Number(fees.UAE) || 0 },
          USA: { amount: Number(fees.USA) || 0 },
        },
        instructions,
      }),
    });
    setSaving(false);
    if (res.success && res.data?.settings) {
      setSettings(res.data.settings);
      setMessage('Payment settings saved.');
    } else {
      setMessage(res.message || 'Failed to save payment settings.');
    }
  };

  const addMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethod.name || !newMethod.accountTitle || !newMethod.accountValue) {
      setMessage('Method name, account title and account number/IBAN are required.');
      return;
    }
    const res = await fetchApi<{ settings: IPaymentSettings }>('/admin/settings/payment/methods', {
      method: 'POST',
      body: JSON.stringify({ ...newMethod, countries: ['Pakistan'] }),
    });
    if (res.success && res.data?.settings) {
      setSettings(res.data.settings);
      setNewMethod({ name: '', kind: 'number', accountTitle: '', accountValue: '', details: '' });
      setMessage('Payment method added.');
    } else {
      setMessage(res.message || 'Failed to add payment method.');
    }
  };

  const toggleMethod = async (id: string) => {
    const res = await fetchApi<{ settings: IPaymentSettings }>(`/admin/settings/payment/methods/${id}/toggle`, { method: 'PATCH' });
    if (res.success && res.data?.settings) setSettings(res.data.settings);
  };

  const deleteMethod = async (id: string) => {
    if (!window.confirm('Delete this payment method?')) return;
    const res = await fetchApi<{ settings: IPaymentSettings }>(`/admin/settings/payment/methods/${id}`, { method: 'DELETE' });
    if (res.success && res.data?.settings) setSettings(res.data.settings);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-xs text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading payment settings…
      </div>
    );
  }

  const methods: IPaymentMethod[] = settings?.paymentMethods || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
            <CreditCard className="w-4 h-4 text-[#1D68F2]" />
            <span>Payment Methods &amp; Per-Country Fees</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1D68F2] text-[11px] font-bold">
              {methods.length}
            </span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Add the accounts listing owners pay to (for example JazzCash, Easypaisa or a bank account).
            Nothing is pre-filled — add only your own accounts. When payments are off, listings are free.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[#1D68F2] hover:bg-[#1557D0] text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Save Fees &amp; Instructions</span>
        </button>
      </div>

      {message && <p className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">{message}</p>}

      {/* Payment requirement banner */}
      <div className={`p-4 rounded-2xl border space-y-3 ${enabled ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
              <CreditCard className="w-4 h-4 text-[#1D68F2]" />
              <span>Directory Listing Payment Requirement</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {enabled ? 'ENABLED / ON' : 'DISABLED / OFF'}
              </span>
            </h5>
            <p className="text-xs text-slate-500 mt-1">
              {enabled
                ? 'Payment is required: approval is blocked until the receipt is verified and covers the fee.'
                : 'Currently OFF: Business submissions are 100% FREE. No payment or receipt screenshot is required.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((prev) => !prev)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            {enabled ? 'Turn Payment OFF' : 'Turn Payment ON'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Use the Save button above to apply this change.
        </p>
      </div>

      {/* Per-country fees */}
      <div className="space-y-3">
        {FEE_COUNTRIES.map((country) => {
          const code = country === 'Pakistan' ? 'PK' : country === 'UAE' ? 'AE' : 'US';
          const currencyLabel =
            country === 'Pakistan' ? 'PKR (Rs.)' : country === 'UAE' ? 'AED' : 'USD ($)';
          const currencyCode = country === 'Pakistan' ? 'PKR' : country === 'UAE' ? 'AED' : 'USD';
          const symbol = country === 'Pakistan' ? 'Rs.' : country === 'UAE' ? 'AED' : '$';
          return (
            <div
              key={country}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                  {code}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{country}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1D68F2] text-[11px] font-bold">
                      {symbol} {fees[country]}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">Fixed Currency: {currencyLabel}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={fees[country]}
                  onChange={(e) => setFees((prev) => ({ ...prev, [country]: e.target.value }))}
                  aria-label={`Listing fee for ${country}`}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#1D68F2]/20 focus:border-[#1D68F2] bg-white text-right"
                />
                <span className="text-xs font-bold text-slate-500 w-8">{currencyCode}</span>
                <button
                  type="button"
                  onClick={() => setFees((prev) => ({ ...prev, [country]: '0' }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Set FREE
                </button>
              </div>
            </div>
          );
        })}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900">
          <strong>Multi-Country Pricing:</strong> Set the fee to <strong>0</strong> for any country to make
          listings 100% FREE for that country.
        </div>
      </div>

      <div className="space-y-1.5">
        <h5 className="font-bold text-sm text-slate-900">Payment Instructions for Users</h5>
        <p className="text-xs text-slate-500">
          These instructions are displayed to users on the submission and claim verification pages.
        </p>
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Send the fee to one of the accounts below and paste your receipt link in the form."
          aria-label="Payment instructions shown to listing owners"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1D68F2]/20 focus:border-[#1D68F2] bg-white"
        />
      </div>

      <div className="space-y-3 pt-2">
        <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
          <CreditCard className="w-4 h-4 text-[#1D68F2]" />
          <span>Custom Payment Methods &amp; Bank Accounts</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1D68F2] text-[11px] font-bold">
            {methods.length}
          </span>
        </h5>
        <p className="text-xs text-slate-500">
          Add branded bank cards (Meezan, SadaPay, NayaPay, JazzCash, Easypaisa, etc.) with custom
          IBAN/number details.
        </p>
        {methods.length === 0 && (
          <p className="text-xs text-slate-500">No payment methods yet. Add your first one below — for example JazzCash, Easypaisa or a bank account.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {methods.map((m) => (
            <div key={m._id} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{m.name}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {m.kind === 'iban' ? 'IBAN Account' : 'Account Number'}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                    m.isEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {m.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Title:</span>
                  <span className="font-bold text-slate-900 text-right break-words">{m.accountTitle}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 shrink-0">{m.kind === 'iban' ? 'IBAN:' : 'Number:'}</span>
                  <span className="font-mono font-semibold text-slate-900 text-right break-all">{m.accountValue}</span>
                </div>
                {m.details && <div className="text-slate-500 pt-1.5 border-t border-slate-200/70">{m.details}</div>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(m.countries?.length ? m.countries : ['Pakistan']).map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                    {c}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleMethod(m._id!)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  {m.isEnabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMethod(m._id!)}
                  title="Delete payment method"
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={addMethod} className="border-t border-slate-100 pt-4 space-y-3">
        <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add a payment method
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={newMethod.name}
            onChange={(e) => setNewMethod((p) => ({ ...p, name: e.target.value }))}
            placeholder="Method name — e.g. JazzCash"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1D68F2]/20 focus:border-[#1D68F2] bg-white"
          />
          <select
            value={newMethod.kind}
            onChange={(e) => setNewMethod((p) => ({ ...p, kind: e.target.value as 'iban' | 'number' }))}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="number">Account / wallet number</option>
            <option value="iban">IBAN</option>
          </select>
          <input
            value={newMethod.accountTitle}
            onChange={(e) => setNewMethod((p) => ({ ...p, accountTitle: e.target.value }))}
            placeholder="Account title"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1D68F2]/20 focus:border-[#1D68F2] bg-white"
          />
          <input
            value={newMethod.accountValue}
            onChange={(e) => setNewMethod((p) => ({ ...p, accountValue: e.target.value }))}
            placeholder="Account number or IBAN"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#1D68F2]/20 focus:border-[#1D68F2] bg-white"
          />
          <input
            value={newMethod.details}
            onChange={(e) => setNewMethod((p) => ({ ...p, details: e.target.value }))}
            placeholder="Details (optional)"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1D68F2]/20 focus:border-[#1D68F2] bg-white sm:col-span-2"
          />
        </div>
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#1D68F2] hover:bg-[#1554c9] text-white font-bold text-xs shadow-xs transition-colors">
          Add payment method
        </button>
      </form>
    </div>
  );
}
