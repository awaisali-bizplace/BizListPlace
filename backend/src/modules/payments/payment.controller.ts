import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { PaymentSetting, getOrCreatePaymentSettings, FEE_COUNTRIES, feeCountryForCode } from './payment.model';
import { Business } from '../businesses/business.model';
import { AuthenticatedRequest } from '../../middleware/auth';
import { AuditService } from '../../services/audit.service';

function publicView(settings: any, isAdmin: boolean) {
  return {
    isEnabled: settings.isEnabled,
    fees: settings.fees,
    feeAmount: settings.fees?.Pakistan?.amount ?? settings.feeAmount ?? 0,
    qrCode: settings.qrCode || { url: '', publicId: '' },
    qrEnabled: settings.qrEnabled !== false,
    qrCountries: settings.qrCountries || ['Pakistan'],
    accountTitle: settings.accountTitle || '',
    bankName: settings.bankName || '',
    instructions: settings.instructions || '',
    paymentMethods: (settings.paymentMethods || []).filter((m: any) => isAdmin || m.isEnabled !== false),
  };
}

export class PaymentController {
  /** Public: what a listing owner needs to pay (enabled methods only). */
  static async getPublicPaymentSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await getOrCreatePaymentSettings();
      const isAdmin = req.user?.role === 'admin';
      res.json({ success: true, data: { settings: publicView(settings.toObject(), isAdmin) } });
    } catch (err) {
      next(err);
    }
  }

  /** Admin: full settings document. */
  static async getPaymentSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await getOrCreatePaymentSettings();
      res.json({ success: true, data: { settings: publicView(settings.toObject(), true) } });
    } catch (err) {
      next(err);
    }
  }

  static async updatePaymentSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await getOrCreatePaymentSettings();
      const body = req.body || {};
      if (typeof body.isEnabled === 'boolean') settings.isEnabled = body.isEnabled;
      if (body.fees && typeof body.fees === 'object') {
        for (const country of FEE_COUNTRIES) {
          const fee = body.fees[country];
          if (fee && typeof fee === 'object') {
            if (typeof fee.amount === 'number' && fee.amount >= 0) settings.fees[country].amount = fee.amount;
            if (typeof fee.currency === 'string') settings.fees[country].currency = fee.currency;
            if (typeof fee.symbol === 'string') settings.fees[country].symbol = fee.symbol;
          }
        }
      }
      if (typeof body.feeAmount === 'number' && body.feeAmount >= 0) {
        settings.feeAmount = body.feeAmount;
        settings.fees.Pakistan.amount = body.feeAmount;
      }
      if (typeof body.qrEnabled === 'boolean') settings.qrEnabled = body.qrEnabled;
      if (Array.isArray(body.qrCountries)) settings.qrCountries = body.qrCountries.map(String);
      if (typeof body.accountTitle === 'string') settings.accountTitle = body.accountTitle.trim();
      if (typeof body.bankName === 'string') settings.bankName = body.bankName.trim();
      if (typeof body.instructions === 'string') settings.instructions = body.instructions;
      if (body.qrCode && typeof body.qrCode.url === 'string') {
        settings.qrCode = { url: body.qrCode.url, publicId: body.qrCode.publicId || '' };
      }
      await settings.save();
      await AuditService.log('payment_settings_updated', 'business', String(settings._id), {}, req.user!._id, req.ip);
      res.json({ success: true, data: { settings: publicView(settings.toObject(), true) } });
    } catch (err) {
      next(err);
    }
  }

  static async addPaymentMethod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, kind, accountTitle, accountValue, details, countries } = req.body || {};
      if (!name || !kind || !accountTitle || !accountValue) {
        res.status(400).json({ success: false, message: 'name, kind, accountTitle and accountValue are required.' });
        return;
      }
      if (!['iban', 'number'].includes(kind)) {
        res.status(400).json({ success: false, message: 'kind must be "iban" or "number".' });
        return;
      }
      const settings = await getOrCreatePaymentSettings();
      settings.paymentMethods.push({
        name: String(name).trim(),
        kind,
        accountTitle: String(accountTitle).trim(),
        accountValue: String(accountValue).trim(),
        details: typeof details === 'string' ? details : '',
        cardImage: { url: '', publicId: '' },
        isEnabled: true,
        countries: Array.isArray(countries) && countries.length ? countries.map(String) : ['Pakistan'],
      } as any);
      await settings.save();
      res.status(201).json({ success: true, data: { settings: publicView(settings.toObject(), true) } });
    } catch (err) {
      next(err);
    }
  }

  static async updatePaymentMethod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await getOrCreatePaymentSettings();
      const method = (settings.paymentMethods as any).id(req.params.methodId);
      if (!method) {
        res.status(404).json({ success: false, message: 'Payment method not found.' });
        return;
      }
      const body = req.body || {};
      for (const key of ['name', 'accountTitle', 'accountValue', 'details'] as const) {
        if (typeof body[key] === 'string') method[key] = body[key].trim();
      }
      if (['iban', 'number'].includes(body.kind)) method.kind = body.kind;
      if (typeof body.isEnabled === 'boolean') method.isEnabled = body.isEnabled;
      if (Array.isArray(body.countries)) method.countries = body.countries.map(String);
      await settings.save();
      res.json({ success: true, data: { settings: publicView(settings.toObject(), true) } });
    } catch (err) {
      next(err);
    }
  }

  static async deletePaymentMethod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await getOrCreatePaymentSettings();
      const method = (settings.paymentMethods as any).id(req.params.methodId);
      if (!method) {
        res.status(404).json({ success: false, message: 'Payment method not found.' });
        return;
      }
      method.deleteOne();
      await settings.save();
      res.json({ success: true, message: 'Payment method deleted.' });
    } catch (err) {
      next(err);
    }
  }

  static async togglePaymentMethod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await getOrCreatePaymentSettings();
      const method = (settings.paymentMethods as any).id(req.params.methodId);
      if (!method) {
        res.status(404).json({ success: false, message: 'Payment method not found.' });
        return;
      }
      method.isEnabled = !method.isEnabled;
      await settings.save();
      res.json({ success: true, data: { settings: publicView(settings.toObject(), true) } });
    } catch (err) {
      next(err);
    }
  }

  static async deleteQrCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await getOrCreatePaymentSettings();
      settings.qrCode = { url: '', publicId: '' };
      await settings.save();
      res.json({ success: true, message: 'QR code removed.' });
    } catch (err) {
      next(err);
    }
  }

  /** Admin: list businesses that have a payment attached (receipts to verify). */
  static async getPayments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const businesses = await Business.find({
        $or: [
          { paymentStatus: { $in: ['pending', 'verified'] } },
          { 'paymentReceipt.url': { $ne: '' } },
          { paymentAmount: { $gt: 0 } },
        ],
      })
        .populate('ownerId', 'name email')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean();
      res.json({ success: true, data: businesses });
    } catch (err) {
      next(err);
    }
  }

  static async updateBusinessPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, amount } = req.body || {};
      if (!['none', 'pending', 'verified'].includes(status)) {
        res.status(400).json({ success: false, message: 'status must be none, pending or verified.' });
        return;
      }
      const business = await Business.findById(req.params.id);
      if (!business) {
        res.status(404).json({ success: false, message: 'Business not found.' });
        return;
      }
      business.paymentStatus = status;
      if (typeof amount === 'number' && amount >= 0) business.paymentAmount = amount;
      await business.save();
      await AuditService.log('business_payment_updated', 'business', String(business._id), { status }, req.user!._id, req.ip);
      res.json({ success: true, data: business });
    } catch (err) {
      next(err);
    }
  }

  static async deleteReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await Business.findById(req.params.id);
      if (!business) {
        res.status(404).json({ success: false, message: 'Business not found.' });
        return;
      }
      business.paymentReceipt = { url: '', publicId: '' };
      business.paymentAmount = 0;
      business.paymentStatus = 'pending';
      await business.save();
      res.json({ success: true, data: business });
    } catch (err) {
      next(err);
    }
  }

  /** Shared helper used by the admin approve gate. */
  static async feeForBusiness(business: { countryCode?: string }): Promise<{ amount: number; currency: string; symbol: string; enabled: boolean }> {
    const settings = await getOrCreatePaymentSettings();
    if (!settings.isEnabled) return { amount: 0, currency: 'PKR', symbol: 'Rs.', enabled: false };
    const fee = settings.getFeeForCountry(feeCountryForCode(business.countryCode));
    return { amount: fee.amount, currency: fee.currency, symbol: fee.symbol, enabled: true };
  }
}

export { Types };
