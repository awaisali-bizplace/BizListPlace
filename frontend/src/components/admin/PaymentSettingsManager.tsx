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
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center text-xs text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading payment settings…
      </div>
    );
  }

  const methods: IPaymentMethod[] = settings?.paymentMethods || [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-5">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>Payment Methods &amp; Per-Country Fees</span>
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Add the accounts listing owners pay to (for example JazzCash, Easypaisa or a bank account).
          Nothing is pre-filled — add only your own accounts. When payments are off, listings are free.
        </p>
      </div>

      {message && <p className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">{message}</p>}

      <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-[#1D68F2] border-slate-300" />
        <span>
          <span className="font-bold text-xs text-slate-900 block">Enable listing fee requirement</span>
          <span className="text-[11px] text-slate-500">When enabled, approval is blocked until the receipt is verified and covers the fee.</span>
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEE_COUNTRIES.map((country) => (
          <div key={country} className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Fee — {country} ({country === 'Pakistan' ? 'PKR' : country === 'UAE' ? 'AED' : 'USD'})
            </label>
            <input
              type="number"
              min="0"
              value={fees[country]}
              onChange={(e) => setFees((prev) => ({ ...prev, [country]: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#1D68F2]/20 focus:border-[#1D68F2] bg-white"
            />
            <p className="text-[11px] text-slate-400">0 = free for this country</p>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 block">Payment instructions shown to listing owners</label>
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Send the fee to one of the accounts below and paste your receipt link in the form."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1D68F2]/20 focus:border-[#1D68F2] bg-white"
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        <span>Save Fees &amp; Instructions</span>
      </button>

      <div className="space-y-3 pt-2">
        <h5 className="font-bold text-xs text-slate-900">Payment methods ({methods.length})</h5>
        {methods.length === 0 && (
          <p className="text-xs text-slate-500">No payment methods yet. Add your first one below — for example JazzCash, Easypaisa or a bank account.</p>
        )}
        {methods.map((m) => (
          <div key={m._id} className="border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-3">
            <div className="text-xs space-y-1 min-w-0">
              <div className="font-bold text-slate-900 text-sm">{m.name}</div>
              <div className="text-slate-600">Account title: {m.accountTitle}</div>
              <div className="text-slate-600">
                {m.kind === 'iban' ? 'IBAN' : 'Account number'}: <span className="font-mono font-semibold text-slate-900">{m.accountValue}</span>
              </div>
              {m.details && <div className="text-slate-500">{m.details}</div>}
              <div className="text-slate-400">{m.isEnabled ? 'Enabled' : 'Disabled'} · {m.countries?.join(', ') || 'Pakistan'}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => toggleMethod(m._id!)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
                {m.isEnabled ? 'Disable' : 'Enable'}
              </button>
              <button type="button" onClick={() => deleteMethod(m._id!)} className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
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
