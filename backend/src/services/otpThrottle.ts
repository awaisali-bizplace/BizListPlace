import { Schema, model, Document } from 'mongoose';

/**
 * OTP throttling — ported from PKbizMap (OtpEmailThrottle / OtpIpAttempt
 * models + otpManager.js), rewritten to use MongoDB instead of Upstash
 * Redis so no extra service is needed.
 *
 * Limits: 5 OTP emails per address per hour, 10 per IP per hour.
 * Returns false when the caller should be told to wait.
 */

interface IOtpThrottleDocument extends Document {
  key: string;
  kind: 'email' | 'ip';
  count: number;
  windowStart: Date;
}

const OtpThrottleSchema = new Schema<IOtpThrottleDocument>(
  {
    key: { type: String, required: true, index: true },
    kind: { type: String, required: true, enum: ['email', 'ip'] },
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

OtpThrottleSchema.index({ key: 1, kind: 1 }, { unique: true });
OtpThrottleSchema.index({ windowStart: 1 }, { expireAfterSeconds: 3600 });

const OtpThrottle = model<IOtpThrottleDocument>('OtpThrottle', OtpThrottleSchema);

export async function checkOtpThrottle(kind: 'email' | 'ip', key: string, max = kind === 'email' ? 5 : 10): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
  const doc = await OtpThrottle.findOne({ key: key.toLowerCase(), kind });
  if (!doc) {
    await OtpThrottle.create({ key: key.toLowerCase(), kind, count: 1, windowStart: now });
    return true;
  }
  if (doc.windowStart < windowStart) {
    doc.count = 1;
    doc.windowStart = now;
    await doc.save();
    return true;
  }
  if (doc.count >= max) return false;
  doc.count += 1;
  await doc.save();
  return true;
}
