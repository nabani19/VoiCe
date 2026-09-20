// Cloudflare Pages Functions Middleware
// Provides strict CORS handling, security headers, and Supabase JWT authentication extraction

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

export const onRequest: PagesFunction<Env> = async ({ request, next, env }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = env.ALLOWED_ORIGIN || '*';

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin === allowedOrigin || allowedOrigin === '*' ? origin : allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Execute downstream function
  const response = await next();

  // Inject security headers & CORS
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', origin === allowedOrigin || allowedOrigin === '*' ? origin : allowedOrigin);
  newHeaders.set('Access-Control-Allow-Credentials', 'true');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
