import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Double-submit cookie CSRF protection — ported from PKbizMap
 * (middlewares/csrfProtection.js) and rewritten in TypeScript.
 *
 * A token `<randomHex>.<hmacHex>` is stored in a readable `XSRF-TOKEN`
 * cookie and must be sent back in the `x-csrf-token` header. The HMAC is
 * bound to the session fingerprint (the auth cookie, or "anonymous").
 * Safe methods (GET/HEAD/OPTIONS) are never blocked. In test mode the
 * middleware is a no-op so the existing API tests can run without a
 * browser session.
 */

const ENFORCED_AUTH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/verify-reset-otp',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/resend-otp',
  '/api/v1/auth/resend-reset-otp',
  '/api/v1/claims/verify',
];

function setCsrfToken(res: Response, fingerprint = 'anonymous'): string {
  const effectiveFingerprint = fingerprint || 'anonymous';
  const randomHex = crypto.randomBytes(32).toString('hex');
  const hmacHex = crypto
    .createHmac('sha256', config.jwt.secret)
    .update(`${randomHex}:${effectiveFingerprint}`)
    .digest('hex');
  const token = `${randomHex}.${hmacHex}`;
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.set('X-CSRF-Token', token);
  return token;
}

export function getCsrfToken(req: Request, res: Response): void {
  const fingerprint = (req.cookies as any)?.[config.cookie.name] || 'anonymous';
  const token = setCsrfToken(res, fingerprint);
  res.json({ success: true, data: { csrfToken: token } });
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (config.env === 'test') return next();
  const method = req.method.toUpperCase();
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return next();

  const rawPath = (req.path || '').toLowerCase();
  const normalisedPath = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
  const hasSessionCookie = Boolean((req.cookies as any)?.[config.cookie.name]);
  const isClaimRoute =
    normalisedPath === '/api/v1/claims/verify' ||
    (normalisedPath.startsWith('/api/v1/businesses/') && normalisedPath.endsWith('/claim'));
  const isEnforcedAuthRoute = ENFORCED_AUTH_PATHS.includes(normalisedPath) || isClaimRoute;

  if (!hasSessionCookie && !isEnforcedAuthRoute) return next();

  const cookieToken = (req.cookies as any)?.['XSRF-TOKEN'] || (req.cookies as any)?.csrfToken;
  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  if (!cookieToken || !headerToken || typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    res.status(403).json({ success: false, message: 'Forbidden: Invalid or missing CSRF token.' });
    return;
  }
  const parts = cookieToken.split('.');
  if (parts.length !== 2) {
    res.status(403).json({ success: false, message: 'Forbidden: Invalid or missing CSRF token.' });
    return;
  }
  const [randomHex, hmacHex] = parts;
  const fingerprint = (req.cookies as any)?.[config.cookie.name] || 'anonymous';
  const expectedHmac = crypto
    .createHmac('sha256', config.jwt.secret)
    .update(`${randomHex}:${fingerprint}`)
    .digest('hex');
  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  const hmacBuf = Buffer.from(hmacHex);
  const expectedHmacBuf = Buffer.from(expectedHmac);
  const isHmacValid = hmacBuf.length === expectedHmacBuf.length && crypto.timingSafeEqual(hmacBuf, expectedHmacBuf);
  const isDoubleSubmitValid = headerBuf.length === cookieBuf.length && crypto.timingSafeEqual(headerBuf, cookieBuf);
  if (!isHmacValid || !isDoubleSubmitValid) {
    res.status(403).json({ success: false, message: 'Forbidden: Invalid or missing CSRF token.' });
    return;
  }
  next();
}
