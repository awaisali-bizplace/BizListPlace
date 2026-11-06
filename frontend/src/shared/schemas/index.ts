import { z } from 'zod';
import {
  USER_ROLES,
  LISTING_STATUSES,
  BUSINESS_TYPES,
  VERIFICATION_STATUSES,
} from '../constants';

// Authentication Schemas
export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['user', 'business_owner']).default('user'),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const VerifyResetOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  otp: z
    .string()
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^[0-9]{6}$/, 'Code must contain only 6 digits'),
});
export type VerifyResetOtpInput = z.infer<typeof VerifyResetOtpSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().optional(),
  resetSessionToken: z.string().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// Business Location Schema
export const BusinessLocationSchema = z.object({
  branchName: z.string().min(2, 'Branch name is required').max(100),
  countryCode: z.string().length(2, 'Country code must be 2 characters (ISO-3166-1)').toUpperCase(),
  region: z.string().min(1, 'Region/State is required').max(80),
  city: z.string().min(1, 'City is required').max(80),
  postalCode: z.string().max(20).optional(),
  addressLine1: z.string().min(3, 'Address is required').max(150),
  addressLine2: z.string().max(150).optional(),
  isPrimary: z.boolean().default(false),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  openingHours: z.record(z.string()).optional(),
  timezone: z.string().optional(),
});
export type BusinessLocationInput = z.infer<typeof BusinessLocationSchema>;

// Business Listing Schema
export const CreateBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(120),
  description: z.string().min(20, 'Please provide a detailed description (min 20 characters)').max(3000),
  shortDescription: z.string().max(200).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  contactEmail: z.string().email('Must be a valid email').optional().or(z.literal('')),
  phone: z.string().min(5, 'Valid phone number required').max(30).optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  categoryIds: z.array(z.string()).min(1, 'Select at least one category'),
  businessType: z.enum(BUSINESS_TYPES).default('physical'),
  serviceAreas: z.array(z.string()).optional(),
  socialLinks: z
    .object({
      linkedin: z.string().url().optional().or(z.literal('')),
      twitter: z.string().url().optional().or(z.literal('')),
      facebook: z.string().url().optional().or(z.literal('')),
      instagram: z.string().url().optional().or(z.literal('')),
    })
    .optional(),
  primaryLocation: BusinessLocationSchema.optional(),
  images: z.array(z.string().url()).max(5).optional(),
  paymentAmount: z.number().min(0).optional(),
  paymentReceiptUrl: z.string().url().optional().or(z.literal('')),
});
export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;

// Payment Settings Schema (ported from PKbizMap PaymentSetting rules)
export const PaymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
  kind: z.enum(['iban', 'number']),
  accountTitle: z.string().min(1).max(100),
  accountValue: z.string().min(1).max(50),
  details: z.string().max(500).optional(),
  isEnabled: z.boolean().optional(),
  countries: z.array(z.string()).optional(),
});
export type PaymentMethodInput = z.infer<typeof PaymentMethodSchema>;

export const UpdatePaymentSettingsSchema = z.object({
  isEnabled: z.boolean().optional(),
  feeAmount: z.number().min(0).optional(),
  fees: z
    .object({
      Pakistan: z.object({ amount: z.number().min(0), currency: z.string().optional(), symbol: z.string().optional() }).partial().optional(),
      UAE: z.object({ amount: z.number().min(0), currency: z.string().optional(), symbol: z.string().optional() }).partial().optional(),
      USA: z.object({ amount: z.number().min(0), currency: z.string().optional(), symbol: z.string().optional() }).partial().optional(),
    })
    .partial()
    .optional(),
  qrEnabled: z.boolean().optional(),
  qrCountries: z.array(z.string()).optional(),
  accountTitle: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  instructions: z.string().max(2000).optional(),
});
export type UpdatePaymentSettingsInput = z.infer<typeof UpdatePaymentSettingsSchema>;

export const UpdateBusinessSchema = CreateBusinessSchema.partial();
export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;

// Review Schema
export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().min(3, 'Review headline must be at least 3 characters').max(100),
  content: z.string().min(15, 'Review content must be at least 15 characters').max(1500),
  authorName: z.string().max(80).optional(),
});
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

// Claim Request Schema
export const CreateClaimSchema = z.object({
  fullName: z.string().min(2, 'Full name and designation required').max(100),
  verificationOption: z.enum(['registered_email', 'corporate_email', 'alternative_proof']).default('corporate_email'),
  businessEmail: z.string().email('Provide a valid email address').toLowerCase(),
  phone: z.string().min(7, 'Valid business contact phone is required'),
  notes: z.string().max(1000).optional().default(''),
  verificationDocuments: z.array(z.string()).optional(),
});
export type CreateClaimInput = z.infer<typeof CreateClaimSchema>;

export const VerifyClaimOtpSchema = z.object({
  otp: z.string().length(6, 'Verification code must be 6 digits'),
});
export type VerifyClaimOtpInput = z.infer<typeof VerifyClaimOtpSchema>;

// Report Listing Schema
export const CreateReportSchema = z.object({
  reason: z.enum(['incorrect_info', 'spam_fraud', 'closed_down', 'offensive_content', 'other']),
  details: z.string().min(10, 'Please explain the issue in detail').max(1000),
});
export type CreateReportInput = z.infer<typeof CreateReportSchema>;

// Category Schema
export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  parentId: z.string().optional().nullable(),
  icon: z.string().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
