// Catch-all proxy: forwards /api/data/* requests to the local Express Data API.
// The Express API runs at http://api:8080 inside the Docker Compose network.

import { PagesFunction } from '../_middleware';

const API_BASE = 'http://api:8080';

export const onRequest: PagesFunction = async ({ request, params }) => {
  const url = new URL(request.url);
  const route = Array.isArray(params.route) ? params.route.join('/') : (params.route as string) || '';
  const targetUrl = `${API_BASE}/data/${route}${url.search}`;

  try {
    const headers = new Headers();
    headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');

    const proxyRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });

    const body = await proxyRes.text();

    return new Response(body, {
      status: proxyRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Data API unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
