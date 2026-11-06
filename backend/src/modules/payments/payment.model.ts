import { Schema, model, Document, Types } from 'mongoose';

/**
 * Payment settings for BizListPlace — ported from the PKbizMap logic
 * (PaymentSetting.js) and rewritten in TypeScript for this monorepo.
 *
 * IMPORTANT: no payment account is hard-coded here. `paymentMethods` is
 * empty by default and `isEnabled` is false, so listings stay free until
 * the admin adds a payment method (JazzCash / Easypaisa / bank / IBAN…)
 * and a fee in the admin panel. Account numbers entered by the admin are
 * intentionally shown to listing owners on the add-business page — that
 * is how they know where to pay — so never put a private key here.
 */

export type PaymentMethodKind = 'iban' | 'number';

export interface IPaymentMethod {
  _id?: Types.ObjectId;
  name: string;
  kind: PaymentMethodKind;
  accountTitle: string;
  accountValue: string;
  details?: string;
  cardImage?: { url: string; publicId: string };
  isEnabled: boolean;
  countries: string[];
}

export interface ICountryFee {
  amount: number;
  currency: string;
  symbol: string;
}

export type FeeCountry = 'Pakistan' | 'UAE' | 'USA';

export const FEE_COUNTRIES: FeeCountry[] = ['Pakistan', 'UAE', 'USA'];

/** ISO country code (as stored on a Business) -> fee country name. */
export function feeCountryForCode(countryCode?: string): FeeCountry {
  switch ((countryCode || '').toUpperCase()) {
    case 'AE':
      return 'UAE';
    case 'US':
      return 'USA';
    case 'PK':
    default:
      return 'Pakistan';
  }
}

export interface IPaymentSettingDocument extends Document {
  singleton: string;
  isEnabled: boolean;
  fees: Record<FeeCountry, ICountryFee>;
  feeAmount: number;
  qrCode: { url: string; publicId: string };
  qrEnabled: boolean;
  qrCountries: string[];
  accountTitle: string;
  bankName: string;
  instructions: string;
  paymentMethods: IPaymentMethod[];
  getFeeForCountry(country: string): ICountryFee;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    kind: { type: String, required: true, enum: ['iban', 'number'] },
    accountTitle: { type: String, required: true, trim: true, maxlength: 100 },
    accountValue: { type: String, required: true, trim: true, maxlength: 50 },
    details: { type: String, default: '', trim: true, maxlength: 500 },
    cardImage: {
      url: { type: String, default: '', trim: true },
      publicId: { type: String, default: '', trim: true },
    },
    isEnabled: { type: Boolean, default: true },
    countries: { type: [String], default: ['Pakistan'] },
  },
  { timestamps: true }
);

const CountryFeeSchema = new Schema<ICountryFee>(
  {
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'PKR' },
    symbol: { type: String, default: 'Rs.' },
  },
  { _id: false }
);

const PaymentSettingSchema = new Schema<IPaymentSettingDocument>(
  {
    singleton: { type: String, default: 'main', unique: true, trim: true },
    isEnabled: { type: Boolean, default: false },
    fees: {
      Pakistan: { type: CountryFeeSchema, default: () => ({ amount: 0, currency: 'PKR', symbol: 'Rs.' }) },
      UAE: { type: CountryFeeSchema, default: () => ({ amount: 0, currency: 'AED', symbol: 'AED ' }) },
      USA: { type: CountryFeeSchema, default: () => ({ amount: 0, currency: 'USD', symbol: '$' }) },
    },
    feeAmount: { type: Number, default: 0, min: 0 },
    qrCode: {
      url: { type: String, default: '', trim: true },
      publicId: { type: String, default: '', trim: true },
    },
    qrEnabled: { type: Boolean, default: true },
    qrCountries: { type: [String], default: ['Pakistan'] },
    accountTitle: { type: String, default: '', trim: true },
    bankName: { type: String, default: '', trim: true },
    instructions: { type: String, default: '', trim: true, maxlength: 2000 },
    paymentMethods: { type: [PaymentMethodSchema], default: [] },
  },
  { timestamps: true }
);

PaymentSettingSchema.methods.getFeeForCountry = function (country: string): ICountryFee {
  const key = FEE_COUNTRIES.includes(country as FeeCountry)
    ? (country as FeeCountry)
    : feeCountryForCode(country);
  return this.fees?.[key] || { amount: this.feeAmount || 0, currency: 'PKR', symbol: 'Rs.' };
};

export const PaymentSetting = model<IPaymentSettingDocument>('PaymentSetting', PaymentSettingSchema);

export async function getOrCreatePaymentSettings(): Promise<IPaymentSettingDocument> {
  let doc = await PaymentSetting.findOne({ singleton: 'main' });
  if (!doc) {
    doc = await PaymentSetting.create({ singleton: 'main' });
  }
  return doc;
}
