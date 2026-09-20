// POST /api/streak/check-in — Idempotent Daily Streak Check-in
import { Env, PagesFunction } from '../_middleware';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Valid session token required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const supabaseUrl = env.SUPABASE_URL;
    const anonKey = env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      // In local demo mode without live Supabase configured
      return new Response(JSON.stringify({
        success: true,
        data: { current_streak: 5, longest_streak: 12, already_checked_in: false, message: 'Local check-in recorded.' },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Verify user with Supabase Auth (server-side verification)
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
      },
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session token.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = await userRes.json() as any;
    const verifiedUserId = userData.id;

    // 2. Call Supabase RPC 'checkin_streak' with verified user ID (Prevents IDOR)
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/checkin_streak`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_user_id: verifiedUserId }),
    });

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      throw new Error(`RPC call failed: ${errText}`);
    }

    const result = await rpcRes.json() as any;
    const streakInfo = Array.isArray(result) ? result[0] : result;

    return new Response(JSON.stringify({
      success: true,
      data: {
        current_streak: streakInfo?.current_streak ?? 1,
        longest_streak: streakInfo?.longest_streak ?? 1,
        already_checked_in: streakInfo?.already_checked_in ?? false,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Streak error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to record streak.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
