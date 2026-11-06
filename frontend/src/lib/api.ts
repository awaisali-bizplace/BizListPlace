import { cache } from 'react';

const API_BASE =
  (typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || 'http://127.0.0.1:5000/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1');

interface CacheEntry {
  data: any;
  expiresAt: number;
}

// In-memory cache to serve identical GET requests in 0ms without hitting the network repeatedly
const memoryCache = new Map<string, CacheEntry>();

function getCacheTtlMs(endpoint: string): number {
  if (endpoint.startsWith('/locations') || endpoint.includes('/countries')) return 600_000; // 10 mins
  if (endpoint.startsWith('/categories')) return 600_000; // 10 mins
  if (endpoint.includes('/featured')) return 300_000; // 5 mins
  if (endpoint.startsWith('/businesses')) return 120_000; // 2 mins
  return 60_000; // 1 min default for public GETs
}

export function clearApiCache(): void {
  memoryCache.clear();
}

// CSRF double-submit token (ported from PKbizMap). The backend issues an
// XSRF-TOKEN cookie + token from GET /auth/csrf-token; state-changing
// browser calls must send it back in the x-csrf-token header. Server-side
// calls (no browser cookie) do not need it.
let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

export async function getCsrfToken(forceRefresh = false): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (csrfToken && !forceRefresh) return csrfToken;
  if (csrfPromise && !forceRefresh) return csrfPromise;
  csrfPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/csrf-token`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      csrfToken = data?.data?.csrfToken || null;
      return csrfToken;
    } catch {
      return null;
    } finally {
      csrfPromise = null;
    }
  })();
  return csrfPromise;
}

async function fetchApiRaw<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; status?: number; [key: string]: any }> {
  const method = (options.method || 'GET').toUpperCase();
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let authHeader: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('bizlistplace_auth_token');
      if (token) {
        authHeader = { Authorization: `Bearer ${token}` };
      }
    } catch {}
  }

  const isPublicGet = method === 'GET' && !authHeader.Authorization;
  const now = Date.now();

  // Check fast in-memory cache for public GET requests
  if (isPublicGet && !options.cache && !(options as any).noCache) {
    const cached = memoryCache.get(url);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }
  }

  try {
    const ttlMs = getCacheTtlMs(endpoint);
    const nextOptions =
      typeof window === 'undefined' && isPublicGet
        ? { revalidate: Math.floor(ttlMs / 1000), ...options.next }
        : options.next;

    const isStateChanging = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    // Fetch a CSRF token once for browser state-changing calls, and retry
    // once with a fresh token if the backend rejects it (PKbizMap pattern).
    let csrfHeaders: Record<string, string> = {};
    if (isStateChanging && typeof window !== 'undefined') {
      const token = await getCsrfToken();
      if (token) csrfHeaders = { 'x-csrf-token': token };
    }

    let res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...csrfHeaders,
        ...options.headers,
      },
      credentials: typeof window !== 'undefined' ? undefined : 'include',
      ...(nextOptions ? { next: nextOptions } : {}),
    });

    if (res.status === 403 && isStateChanging && typeof window !== 'undefined') {
      const fresh = await getCsrfToken(true);
      if (fresh) {
        res = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...authHeader,
            'x-csrf-token': fresh,
            ...options.headers,
          },
          credentials: 'include',
          ...(nextOptions ? { next: nextOptions } : {}),
        });
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: data.message || `Request failed with status ${res.status}`,
        status: res.status,
        ...data,
      };
    }

    // Cache successful public GET responses
    if (isPublicGet && data.success !== false) {
      memoryCache.set(url, {
        data,
        expiresAt: now + ttlMs,
      });

      // Bound cache size to prevent memory leak
      if (memoryCache.size > 200) {
        const oldestKey = memoryCache.keys().next().value;
        if (oldestKey) memoryCache.delete(oldestKey);
      }
    }

    return data;
  } catch (err: any) {
    console.error(`Fetch API Error for ${url}:`, err.message);
    return {
      success: false,
      message: 'Unable to connect to BizListPlace directory service.',
    };
  }
}

export const fetchApi = cache(fetchApiRaw);
