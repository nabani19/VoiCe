// Cloudflare Pages Functions Middleware
// Provides strict CORS origin whitelisting, security headers, and transport protection

export type { PagesFunction } from './types';

export interface Env {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALLOWED_ORIGIN?: string;
}

const DEFAULT_WHITELIST = new Set([
  'https://voice-ai-cpp.pages.dev',
  'https://voice-ai.pages.dev',
  'http://localhost:8788',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000'
]);

function isOriginAllowed(origin: string, customAllowedOrigin?: string): boolean {
  if (!origin) return true; // Same-origin or non-browser request
  if (customAllowedOrigin && customAllowedOrigin !== '*') {
    const customList = customAllowedOrigin.split(',').map(o => o.trim());
    if (customList.includes(origin)) return true;
  }
  return DEFAULT_WHITELIST.has(origin);
}

export const onRequest: PagesFunction<Env> = async ({ request, next, env }) => {
  const origin = request.headers.get('Origin') || '';
  const allowed = isOriginAllowed(origin, env.ALLOWED_ORIGIN);

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    if (!allowed && origin) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': origin ? 'true' : 'false',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      },
    });
  }

  // Execute downstream function
  const response = await next();

  // Inject security headers & strict CORS
  const newHeaders = new Headers(response.headers);

  if (allowed && origin) {
    newHeaders.set('Access-Control-Allow-Origin', origin);
    newHeaders.set('Access-Control-Allow-Credentials', 'true');
    newHeaders.set('Vary', 'Origin');
  }

  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
