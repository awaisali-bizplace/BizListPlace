import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Image upload — ported from PKbizMap (middlewares/upload.js, Cloudinary
 * + multer). Cloudinary is OPTIONAL: it is only used when
 * CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are
 * set. Without them, upload endpoints return 503 with a clear message and
 * the frontend falls back to accepting an image URL.
 *
 * No Cloudinary account from the zip was copied; the user must supply
 * their own keys (see backend/.env.example).
 */

export const cloudinaryConfigured = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

const storage = multer.memoryStorage();
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WebP are allowed.'));
};

export const uploadBusinessImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'paymentReceipt', maxCount: 1 },
]);

export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

function uploadBuffer(buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (err, result) => {
      if (err || !result) return reject(err || new Error('Cloudinary upload failed.'));
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

/** Upload every file in a multer `fields()` result and return urls by field. */
export async function uploadFiles(
  files: Record<string, Express.Multer.File[]>,
  folder: string
): Promise<Record<string, { url: string; publicId: string }[]>> {
  if (!cloudinaryConfigured) {
    throw Object.assign(new Error('Image upload is not configured. Set CLOUDINARY_* in the backend .env, or paste an image URL instead.'), { status: 503 });
  }
  const out: Record<string, { url: string; publicId: string }[]> = {};
  for (const [field, list] of Object.entries(files || {})) {
    out[field] = [];
    for (const file of list) out[field].push(await uploadBuffer(file.buffer, folder));
  }
  return out;
}

export function handleUploadErrors(err: any, _req: Request, res: Response, _next: NextFunction): void {
  if (err) {
    const status = err.status || 400;
    res.status(status).json({ success: false, message: err.message || 'Upload failed.' });
    return;
  }
  _next();
}
