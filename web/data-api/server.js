// VoiCe — Local Data API (Express + PostgreSQL)
// Provides CRUD endpoints for conversations, favorites, streaks, and reports.
// Runs on port 8080 inside the sandbox; wrangler proxies /data/* requests here.

import express from 'express';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://voice:voice@db:5432/voice';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// ── DB Initialization ──────────────────────────────────────────────────────
async function initDB(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const schema = readFileSync(join(__dirname, 'schema-local.sql'), 'utf-8');
      await client.query(schema);
      client.release();
      console.log('[DB] Schema initialized');
      return;
    } catch (err) {
      console.log(`[DB] Waiting for database... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Database not available after 30 retries');
}

// ── Conversations ───────────────────────────────────────────────────────────

app.get('/data/conversations', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.title, c.source_type, c.current_tone, c.created_at,
        (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY sequence_no DESC LIMIT 1) AS last_message,
        (SELECT count(*) FROM messages WHERE conversation_id = c.id) AS message_count
       FROM conversations c
       WHERE c.user_id = $1 AND c.archived_at IS NULL
       ORDER BY c.created_at DESC`,
      [DEMO_USER_ID]
    );
    res.json({ conversations: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/data/conversations', async (req, res) => {
  const { messages = [], tone, source_type = 'paste', title } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const convResult = await client.query(
      `INSERT INTO conversations (user_id, title, source_type, current_tone)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [DEMO_USER_ID, title || 'New Conversation', source_type, tone || null]
    );
    const convId = convResult.rows[0].id;

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      await client.query(
        `INSERT INTO messages (conversation_id, user_id, sender_label, body, sequence_no)
         VALUES ($1, $2, $3, $4, $5)`,
        [convId, DEMO_USER_ID, m.sender === 'me' ? 'me' : 'them', m.body, i + 1]
      );
    }

    await client.query('COMMIT');
    res.json({ id: convId, created_at: convResult.rows[0].created_at });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── Generations (Smart Reply History) ────────────────────────────────────────

app.post('/data/generations', async (req, res) => {
  const { messages = [], tone, intent = 'continue', delivery = 'Casual & Direct', intensity = 6, replies = [], title } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create conversation from analyzed messages
    const convResult = await client.query(
      `INSERT INTO conversations (user_id, title, source_type, current_tone)
       VALUES ($1, $2, 'screenshot', $3) RETURNING id, created_at`,
      [DEMO_USER_ID, title || 'Chat Analysis', tone || null]
    );
    const convId = convResult.rows[0].id;

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      await client.query(
        `INSERT INTO messages (conversation_id, user_id, sender_label, body, sequence_no)
         VALUES ($1, $2, $3, $4, $5)`,
        [convId, DEMO_USER_ID, m.sender === 'me' ? 'me' : 'them', m.body, i + 1]
      );
    }

    // Create generation record
    const genResult = await client.query(
      `INSERT INTO generations (conversation_id, user_id, tone, intent, delivery, intensity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [convId, DEMO_USER_ID, tone || 'Flirty', intent, delivery, intensity]
    );
    const genId = genResult.rows[0].id;

    // Save reply candidates
    for (const r of replies) {
      await client.query(
        `INSERT INTO replies (generation_id, user_id, body, style_tag)
         VALUES ($1, $2, $3, $4)`,
        [genId, DEMO_USER_ID, r.body, r.style || null]
      );
    }

    await client.query('COMMIT');
    res.json({ id: genId, conversation_id: convId, created_at: genResult.rows[0].created_at });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/data/generations', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.tone, g.intent, g.delivery, g.intensity, g.created_at,
        c.title AS conversation_title,
        c.id AS conversation_id,
        (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY sequence_no DESC LIMIT 1) AS last_message,
        (SELECT count(*) FROM messages WHERE conversation_id = c.id) AS message_count,
        COALESCE(
          (SELECT json_agg(json_build_object('id', r.id, 'body', r.body, 'style_tag', r.style_tag) ORDER BY r.created_at)
           FROM replies r WHERE r.generation_id = g.id),
          '[]'::json
        ) AS replies
       FROM generations g
       JOIN conversations c ON g.conversation_id = c.id
       WHERE g.user_id = $1 AND c.archived_at IS NULL
       ORDER BY g.created_at DESC`,
      [DEMO_USER_ID]
    );
    res.json({ generations: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Favorites ──────────────────────────────────────────────────────────────

app.get('/data/favorites', async (req, res) => {
  try {
    const { category } = req.query;
    const params = [DEMO_USER_ID];
    let query = 'SELECT * FROM favorites WHERE user_id = $1';
    if (category && category !== 'all') {
      query += ' AND category = $2';
      params.push(category);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ favorites: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/data/favorites', async (req, res) => {
  const { body, category } = req.body;
  if (!body) return res.status(400).json({ error: 'Body is required' });
  try {
    const result = await pool.query(
      `INSERT INTO favorites (user_id, body, category)
       VALUES ($1, $2, $3) RETURNING id, created_at`,
      [DEMO_USER_ID, body, category || 'Other']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/data/favorites/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE id = $1 AND user_id = $2',
      [req.params.id, DEMO_USER_ID]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Streaks ─────────────────────────────────────────────────────────────────

app.get('/data/streak', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT current_count, longest_count, last_checkin_date FROM streaks WHERE user_id = $1',
      [DEMO_USER_ID]
    );
    if (result.rows.length === 0) {
      return res.json({ current_streak: 0, longest_streak: 0, already_checked_in: false });
    }
    const row = result.rows[0];
    const today = new Date().toISOString().split('T')[0];
    const lastDate = row.last_checkin_date instanceof Date
      ? row.last_checkin_date.toISOString().split('T')[0]
      : String(row.last_checkin_date).split('T')[0];
    res.json({
      current_streak: row.current_count,
      longest_streak: row.longest_count,
      already_checked_in: lastDate === today
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/data/streak/checkin', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT current_count, longest_count, last_checkin_date FROM streaks WHERE user_id = $1',
      [DEMO_USER_ID]
    );

    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO streaks (user_id, current_count, longest_count, last_checkin_date) VALUES ($1, 1, 1, CURRENT_DATE)',
        [DEMO_USER_ID]
      );
      return res.json({ current_streak: 1, longest_streak: 1, already_checked_in: false });
    }

    const row = rows[0];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const lastDate = row.last_checkin_date instanceof Date
      ? row.last_checkin_date.toISOString().split('T')[0]
      : String(row.last_checkin_date).split('T')[0];

    if (lastDate === today) {
      return res.json({
        current_streak: row.current_count,
        longest_streak: row.longest_count,
        already_checked_in: true
      });
    }

    const newCurrent = lastDate === yesterdayStr ? row.current_count + 1 : 1;
    const newLongest = Math.max(newCurrent, row.longest_count);

    await pool.query(
      'UPDATE streaks SET current_count = $1, longest_count = $2, last_checkin_date = CURRENT_DATE, updated_at = NOW() WHERE user_id = $3',
      [newCurrent, newLongest, DEMO_USER_ID]
    );

    res.json({ current_streak: newCurrent, longest_streak: newLongest, already_checked_in: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reports ──────────────────────────────────────────────────────────────────

app.get('/data/reports', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.payload, r.created_at, c.title AS conversation_title
       FROM reports r
       LEFT JOIN conversations c ON r.conversation_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [DEMO_USER_ID]
    );
    res.json({ reports: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/data/reports', async (req, res) => {
  const { conversation_id, payload } = req.body;
  if (!payload) return res.status(400).json({ error: 'Payload is required' });
  try {
    const result = await pool.query(
      `INSERT INTO reports (conversation_id, user_id, payload)
       VALUES ($1, $2, $3) RETURNING id, created_at`,
      [conversation_id || null, DEMO_USER_ID, JSON.stringify(payload)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Start ────────────────────────────────────────────────────────────────────

initDB().then(() => {
  app.listen(8080, () => console.log('[API] Data API running on port 8080'));
}).catch(err => {
  console.error('[API] Failed to start:', err);
  process.exit(1);
});
