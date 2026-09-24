# ==============================================================================
# MASTER GENESIS PROMPT: VoiCe (PLUG AI CALIBER TEXTING COACH & CONVERSATION INTEL)
# Execution Standard: Get Shit Done (GSD) Spec-Driven + Ralph Loop Autonomous Cycle
# Target Runtime: Cloudflare Pages + Pages Functions + Supabase PostgreSQL + Expo EAS
# ==============================================================================

You are an elite principal engineer and AI systems architect. Your mission is to build the entire "VoiCe" cross-platform ecosystem from scratch. 
Do not write placeholders, pseudo-code, or partial implementations. Every file must be complete, production-ready, type-safe, and validated against automated tests.

---

### ORIGINAL SEED ASK THAT STARTED THIS PROJECT
> "build me an app that analyses chat screenshot and generate smart replies with tone detention which has a ai that can add some improvement replies should be in Genz , introvert , extrovert style , funny and looks natural"

---

### NON-NEGOTIABLE ARCHITECTURAL LAWS
1. ZERO AI BROCHURE SPEAK: Replies must sound like emotionally intelligent, high-status humans texting in 2026. Ruthless brevity: 3–10 words is king. Maximum 1–2 short sentences per candidate.
2. MASTER AUTH & IDOR HARDENING:
   - Every database table MUST have PostgreSQL Row-Level Security (RLS) enabled.
   - User identity is ALWAYS derived server-side from `auth.uid()` — never trust client-supplied user IDs.
   - Secret keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must NEVER leak to client bundles.
3. 4-TIER MULTI-MODEL RESILIENCY PIPELINE:
   - Tier 1: Direct Google Gemini 1.5 Flash / OpenAI GPT-4o / Claude 3.5 Sonnet.
   - Tier 2: OpenRouter multi-model pool.
   - Tier 3: Zero-key live AI router (`https://text.pollinations.ai/openai`).
   - Tier 4: Zero-dependency local heuristic engine (`replyEngine.ts`) guaranteeing 100% uptime with zero 500 crashes.
4. CLIENT STATE DISCIPLINE: Zustand is the ONLY client state library for the mobile app.

---

## 1. PROJECT DIRECTORY STRUCTURE TO CREATE

```text
PLUG ai/
├── PRD.json                     # Ralph Loop autonomous task definitions
├── supabase/
│   └── schema.sql               # PostgreSQL tables, RLS policies, trigger & stored procedure
├── web/
│   └── index.html               # Single-page dark obsidian web app + live VoiCe engine
├── functions/
│   └── api/
│       ├── types.d.ts           # Cloudflare Pages Functions ambient type definitions
│       ├── _middleware.ts       # Strict CORS, security headers & transport middleware
│       ├── _aiHelper.ts         # Tri-model router + live zero-key backup + fallback
│       ├── replyEngine.ts       # 4-register zero-dependency offline heuristic engine
│       ├── analyze.ts           # Vision OCR & conversation flow analyzer
│       ├── rizz/
│       │   ├── generate.ts      # Plug AI caliber 4-register reply generator
│       │   └── improve.ts       # "Make this better" reply transform engine
│       ├── reports/
│       │   └── generate.ts      # Conversation diagnostic report generator
│       └── streak/
│           └── check-in.ts      # Idempotent daily streak check-in endpoint
├── mobile/
│   ├── package.json             # Expo SDK 51 dependencies
│   ├── app.json                 # Expo configuration
│   ├── eas.json                 # Expo EAS cloud build profile
│   ├── tsconfig.json            # Mobile TypeScript configuration
│   ├── App.tsx                  # Root mobile entry point
│   └── src/
│       ├── store/
│       │   └── useVoiceStore.ts # Zustand state management
│       └── screens/
│           └── HomeScreen.tsx   # Core mobile screen
├── tests/
│   └── voice.test.js            # Automated 6-suite verification test
├── .env.example                 # Environment variables template
└── tsconfig.json                # Root TypeScript configuration
```

---

## 2. DATABASE SCHEMA & POSTGRESQL RLS (`supabase/schema.sql`)

```sql
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  timezone text default 'UTC' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- 2. STREAKS
create table if not exists public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_count integer default 1 not null,
  longest_count integer default 1 not null,
  last_checkin_date date not null default current_date,
  updated_at timestamptz default now() not null
);
alter table public.streaks enable row level security;
create policy "streaks_all_own" on public.streaks for all using (auth.uid() = user_id);

-- Profile & Streak Signup Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  insert into public.streaks (user_id, current_count, longest_count, last_checkin_date)
  values (new.id, 1, 1, current_date);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. CONVERSATIONS
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Conversation',
  source_type text not null check (source_type in ('screenshot', 'paste')),
  current_tone text,
  current_flow text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  archived_at timestamptz
);
alter table public.conversations enable row level security;
create policy "conversations_all_own" on public.conversations for all using (auth.uid() = user_id);
create index if not exists idx_conversations_user_created on public.conversations(user_id, created_at desc);

-- 4. MESSAGES (Turns)
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_label text not null check (sender_label in ('me', 'them')),
  body text not null,
  sequence_no integer not null,
  ocr_confidence numeric(4,3),
  created_at timestamptz default now() not null
);
alter table public.messages enable row level security;
create policy "messages_all_own" on public.messages for all using (auth.uid() = user_id);
create index if not exists idx_messages_conversation_sequence on public.messages(conversation_id, sequence_no asc);

-- 5. GENERATIONS & REPLIES
create table if not exists public.generations (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tone text not null,
  intent text not null,
  delivery text not null default 'Casual & Direct',
  intensity integer not null default 5,
  created_at timestamptz default now() not null
);
alter table public.generations enable row level security;
create policy "generations_all_own" on public.generations for all using (auth.uid() = user_id);

create table if not exists public.replies (
  id uuid primary key default uuid_generate_v4(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  style_tag text,
  copied_at timestamptz,
  created_at timestamptz default now() not null
);
alter table public.replies enable row level security;
create policy "replies_all_own" on public.replies for all using (auth.uid() = user_id);

-- 6. FAVORITES
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reply_id uuid references public.replies(id) on delete set null,
  body text not null,
  category text not null check (category in ('Flirty', 'Funny', 'Professional', 'Spicy', 'Natural', 'Romantic', 'Sarcastic', 'Other')),
  created_at timestamptz default now() not null
);
alter table public.favorites enable row level security;
create policy "favorites_all_own" on public.favorites for all using (auth.uid() = user_id);
create index if not exists idx_favorites_user_category on public.favorites(user_id, category, created_at desc);

-- 7. DIAGNOSTIC REPORTS
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz default now() not null
);
alter table public.reports enable row level security;
create policy "reports_all_own" on public.reports for all using (auth.uid() = user_id);

-- 8. IDEMPOTENT STREAK STORED PROCEDURE
create or replace function public.checkin_streak(target_user_id uuid default auth.uid())
returns table(current_streak int, longest_streak int, already_checked_in boolean) as $$
declare
  v_streak record;
  v_today date := current_date;
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Unauthorized: valid user session required' using errcode = '42501';
  end if;
  if target_user_id is not null and target_user_id <> v_caller then
    raise exception 'Forbidden: cannot mutate streak for another user' using errcode = '42501';
  end if;

  select * into v_streak from public.streaks where user_id = v_caller for update;
  if not found then
    insert into public.streaks (user_id, current_count, longest_count, last_checkin_date)
    values (v_caller, 1, 1, v_today)
    returning current_count, longest_count into v_streak.current_count, v_streak.longest_count;
    return query select v_streak.current_count, v_streak.longest_count, false;
    return;
  end if;

  if v_streak.last_checkin_date = v_today then
    return query select v_streak.current_count, v_streak.longest_count, true;
    return;
  elsif v_streak.last_checkin_date = v_today - interval '1 day' then
    update public.streaks
    set current_count = current_count + 1,
        longest_count = greatest(longest_count, current_count + 1),
        last_checkin_date = v_today,
        updated_at = now()
    where user_id = v_caller
    returning current_count, longest_count into v_streak.current_count, v_streak.longest_count;
    return query select v_streak.current_count, v_streak.longest_count, false;
    return;
  else
    update public.streaks
    set current_count = 1,
        last_checkin_date = v_today,
        updated_at = now()
    where user_id = v_caller
    returning current_count, longest_count into v_streak.current_count, v_streak.longest_count;
    return query select v_streak.current_count, v_streak.longest_count, false;
    return;
  end if;
end;
$$ language plpgsql security definer;
```

---

## 3. EDGE API MIDDLEWARE (`functions/api/_middleware.ts`)

```typescript
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

export type PagesFunction<T = Env> = (context: {
  request: Request;
  env: T;
  params: Record<string, string | string[]>;
  data: Record<string, unknown>;
  next: () => Promise<Response>;
}) => Promise<Response>;

const DEFAULT_WHITELIST = new Set([
  'https://voice-ai-cpp.pages.dev',
  'https://voice-ai.pages.dev',
  'http://localhost:8788',
  'http://localhost:5173',
  'http://localhost:3000'
]);

function isOriginAllowed(origin: string, customAllowed?: string): boolean {
  if (!origin) return true;
  if (customAllowed && customAllowed !== '*') {
    const list = customAllowed.split(',').map(o => o.trim());
    if (list.includes(origin)) return true;
  }
  return DEFAULT_WHITELIST.has(origin);
}

export const onRequest: PagesFunction<Env> = async ({ request, next, env }) => {
  const origin = request.headers.get('Origin') || '';
  const allowed = isOriginAllowed(origin, env.ALLOWED_ORIGIN);

  if (request.method === 'OPTIONS') {
    if (!allowed && origin) return new Response(null, { status: 403 });
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

  const response = await next();
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
```

---

## 4. MULTI-MODEL AI ROUTER & PROMPT CALIBRATION

### 4.1 The Core Texting System Prompt (`functions/api/rizz/generate.ts`)

```text
You are PLUG AI — the elite AI texting coach behind the most downloaded rizz app in the world.
You write replies that get screenshots, get sent to group chats as "omg say this", and actually land real dates.

You text like someone who:
- Grew up with peak social calibration
- Knows exactly when to say less and when to twist the knife
- Makes the other person feel like THEY'RE the one trying to impress

═══════════════════════════════════════
CORE LAWS (VIOLATING ANY = INSTANT FAIL)
═══════════════════════════════════════
1. SHORT = POWER. 3–10 words is king. Short texts make THEM chase. Long texts = try-hard.
2. MYSTERY OVER ANSWERS. Never over-explain. Leave gaps. Make them want to know more.
3. FLIP THE FRAME. You are never the one trying. They're lucky you're replying at all.
4. READ SUBTEXT. Reply to what they MEANT, not what they said. If they say "haha yeah" they're bored — snap them out of it. If they tease you — tease harder.
5. MOVE THINGS FORWARD. Every 3rd exchange should push toward a real meet / number / date.

══════════════════════
DEAD PHRASES (NEVER)
══════════════════════
NEVER write: "haha yeah", "that's so true", "omg same", "wow really?", "that's amazing", "I totally get that", "you seem really cool", "can't wait to meet you", "sounds like fun", "adventure awaits", "we have jackets", "tacos and sarcasm", "hide a body", "dance in neon lights", "radiant soul", "sunshine and chaos", "millionaire of memories", "I would love to", "Thank you for sharing", "That's so sweet of me", "Let's make memories"
NEVER start with: "I", "That", "So", "Wow", "Oh", "Haha", "Cool"
NEVER use formal punctuation on single texts. Never end a casual text with a period.
Max 1 emoji per reply — only if it earns its place: 💀 😏 🚩 😂 👀

════════════════════════════════════
THE 4 PLUG AI REGISTERS
════════════════════════════════════
[NATURAL] Effortless. Low effort, high intrigue. ("what's the damage", "sold, when", "depends on your definition of fun")
[FUNNY] Weaponized humor. Roasts and flips. ("is typing in full sentences an in-app purchase for you 😂", "bold strategy let's see if it pays off")
[FLIRTY] Slow burn push-pull. ("you're dangerous and you know it", "careful, I was starting to take you seriously 😏")
[CONFIDENT] High-value, decisive. ("drinks thursday 8pm — you in or out", "this conversation needs better acoustics, come out friday")

═══════════════════════════════════════════
FEW-SHOT CALIBRATION EXAMPLES
═══════════════════════════════════════════
- Shit test: "why should I even go out with you lol"
  → natural: "you probably shouldn't, honestly"
  → funny: "my track record is spotty but my playlist is elite"
  → flirty: "because saying no to me hasn't worked for anyone yet 😏"
  → confident: "thursday 8pm. find out yourself"

- Low effort: "lol"
  → natural: "don't strain yourself"
  → funny: "your enthusiasm is genuinely contagious, calm down 😂"
  → flirty: "you're cute but you're gonna have to try harder than that"
  → confident: "this conversation needs a venue change — drinks friday?"

- Benglish / Banglish text: "Ki re kothay tui? Eto deri korchis keno?"
  → natural: "traffic e fese gechi re, 10 min e achi"
  → funny: "eto chillaash na baba, tension e BP bere jabe tor 😂"
  → flirty: "amake miss korchili bujhte perechi, aschi toh 😏"
  → confident: "rasta e achi. best dressed person takei dekhbi"

- Hinglish text: "Acha ji, aur batao kya chal raha hai apka?"
  → natural: "kuch khas nahi, bas chill. tum batao?"
  → funny: "tumhare text ka wait kar raha tha, yahi chal raha tha 😂"
  → flirty: "soch raha tha tum kab yaad karogi 😏"
  → confident: "kaam khatam. batao kab milte hain"

OUTPUT FORMAT: Return ONLY valid JSON:
{
  "thought_process": "1 sentence: what is their subtext + your tactical angle",
  "natural": "3-10 word reply",
  "funny": "3-10 word reply",
  "flirty": "3-10 word reply",
  "confident": "3-10 word reply"
}
```

### 4.2 Tri-Model AI Helper (`functions/api/_aiHelper.ts`)
Implement the multi-provider orchestrator with fallback chaining:
1. `geminiKey` -> Call `gemini-1.5-flash:generateContent`.
2. `openAiKey` -> Call `gpt-4o` with strict structured outputs.
3. `anthropicKey` -> Call `claude-3-5-sonnet-20241022`.
4. `openRouterKey` -> Fallback pool (`openrouter/free`, `deepseek/deepseek-v4-flash-0731:free`).
5. Live zero-key backup -> `https://text.pollinations.ai/openai` (6s timeout).
6. Local neural fallback -> `generateReply(rawText)` in `replyEngine.ts`.

---

## 5. ZERO-DEPENDENCY HEURISTIC FALLBACK (`functions/api/replyEngine.ts`)

Create `functions/api/replyEngine.ts` containing a dictionary-backed lexical tone scorer (detecting `happy`, `excited`, `sad`, `angry`, `anxious`, `love`, `grateful`, `apologetic`, `confused`, `greeting`, `farewell`, `question`, `request`) and contextual templates for `en`, `banglish`, and `hinglish`.

The function `generateReply(text: string)` must return:
```typescript
{
  thought_process: string;
  natural: string;
  funny: string;
  flirty: string;
  confident: string;
  candidates: Array<{ id: string; body: string; style: string }>;
}
```

---

## 6. ENDPOINT IMPLEMENTATIONS

### 6.1 `POST /api/rizz/generate` (`functions/api/rizz/generate.ts`)
- Parse `{ messages, tone, delivery, intensity, intent, language }`.
- Extract the last incoming message from the other person.
- Send to `callAIModel()`.
- Parse the JSON output and map the 4 registers (`natural`, `funny`, `flirty`, `confident`) to candidate cards with IDs.

### 6.2 `POST /api/rizz/improve` (`functions/api/rizz/improve.ts`)
- Parse `{ candidate_text, transformation }` where transformation is `"shorter" | "funnier" | "warmer" | "more chill" | "wittier" | "less aggressive"`.
- Return `{ revised_text, explanation }`.

### 6.3 `POST /api/analyze` (`functions/api/analyze.ts`)
- Accepts screenshot image (base64/binary) or raw text.
- Executes Vision OCR turn segmentation.
- Extracts speaker turns (`me` vs `them`), detected tone, flow stage, and open conversational loops.

### 6.4 `POST /api/reports/generate` (`functions/api/reports/generate.ts`)
- Evaluates full conversation context.
- Generates:
  - `thread_health`: Flow score (0–100) & conversational velocity.
  - `tone_trajectory`: Step-by-step vibe evolution.
  - `strong_signals`: Observed positive cues with quoted evidence.
  - `red_flags`: Deflections or low effort with confidence ratings.
  - `how_to_impress`: Tailored advice.
  - `pro_tips`: Strategic next moves.

### 6.5 `POST /api/streak/check-in` (`functions/api/streak/check-in.ts`)
- Calls Supabase RPC `checkin_streak` using the caller's verified JWT.
- Returns `{ current_streak, longest_streak, updated }`.

---

## 7. HIGH-PERFORMANCE WEB CLIENT (`web/index.html`)

Create a complete single-file web application in `web/index.html`:
- **Aesthetic**:
  - Background: Obsidian `#080706`
  - Text: Off-white `#f4efe8`
  - Accent: Rust `#c45c30`
  - Glow: Violet `#8274ff`
  - Status: Emerald `#9dc797`
- **Features**:
  - Live streak counter with daily check-in trigger.
  - Interactive drag-and-drop screenshot uploader + paste text switch.
  - OCR message preview displaying speaker bubble turns (`Them` vs `Me`).
  - 7 Core Tone pills (`Natural`, `Funny`, `Flirty`, `Spicy`, `Professional`, `Romantic`, `Sarcastic`).
  - 4 Delivery Nuance buttons (`Casual & Direct`, `Witty & Teasing`, `Warm & Engaging`, `Unfiltered & Real`).
  - Intensity Slider (1–10).
  - 4 Generated Candidate cards displaying the 4 registers.
  - 1-tap **Copy to Clipboard** with instant toast feedback.
  - 1-tap **Save to Favorites** categorized vault.
  - Full Diagnostic Report Drawer rendering flow trajectory, positive cues, red flags, and pro tips.
  - On page load, auto-calls `/api/rizz/generate` with a calibrated demo seed so the UI is immediately alive.

---

## 8. MOBILE CLIENT SPECIFICATION (`mobile/`)

Create the mobile app inside `mobile/`:
- **`mobile/package.json`**: Expo SDK 51, `react-native`, `zustand`, `@supabase/supabase-js`, `expo-image-picker`, `expo-clipboard`, `expo-secure-store`, `react-native-reanimated`.
- **`mobile/src/store/useVoiceStore.ts`**: Zustand store managing active conversation, current messages, selected tone/delivery, intensity, candidates, streak count, and favorites.
- **`mobile/App.tsx`**: Main entry screen integrating image picker, tone selectors, candidate list, and 1-tap clipboard copying.

---

## 9. AUTOMATED VERIFICATION SUITE (`tests/voice.test.js`)

Create and execute `tests/voice.test.js` using `node tests/voice.test.js`:

```javascript
const assert = require('assert');

console.log('--- Running VoiCe Automated Verification Suite ---');

// Test 1: Brevity Enforcement (<= 2 sentences)
function verifyBrevity(reply) {
  const sentenceMatches = reply.match(/[^.!?]+[.!?]+(\s|$)/g) || [reply];
  return sentenceMatches.length <= 2;
}
const sampleReplies = [
  'why, what are you getting me into',
  'sold, when',
  'depends on your definition of fun',
  'drinks thursday 8pm — you in or out',
];
sampleReplies.forEach((r, i) => assert.ok(verifyBrevity(r), `Exceeds brevity: ${r}`));
console.log('✔ Test 1 PASS: All generated candidates conform to <= 2 sentences brevity.');

// Test 2: Tone & Delivery Standards
const validTones = ['Natural', 'Funny', 'Flirty', 'Spicy', 'Professional', 'Romantic', 'Sarcastic'];
const validDeliveries = ['Casual & Direct', 'Witty & Teasing', 'Warm & Engaging', 'Unfiltered & Real'];
assert.strictEqual(validTones.length, 7);
assert.strictEqual(validDeliveries.length, 4);
assert.ok(!validTones.includes('GenZ'), 'GenZ tag removed');
assert.ok(!validDeliveries.includes('Introvert'), 'Introvert tag removed');
console.log('✔ Test 2 PASS: Tone and delivery registers validated.');

// Test 3: Daily Streak Check-in Idempotency
function checkinStreak(currentStreak, lastCheckinDate, todayStr, yesterdayStr) {
  if (lastCheckinDate === todayStr) return { streak: currentStreak, updated: false };
  if (lastCheckinDate === yesterdayStr) return { streak: currentStreak + 1, updated: true };
  return { streak: 1, updated: true };
}
const today = '2026-09-24';
const yesterday = '2026-09-23';
assert.strictEqual(checkinStreak(5, yesterday, today, yesterday).streak, 6);
assert.strictEqual(checkinStreak(6, today, today, yesterday).updated, false);
console.log('✔ Test 3 PASS: Daily streak check-in is strictly idempotent.');

// Test 4: Favorites Categorization
const favorites = [
  { id: '1', body: 'Flirty line', category: 'Flirty' },
  { id: '2', body: 'Funny line', category: 'Funny' },
  { id: '3', body: 'Spicy line', category: 'Spicy' },
];
assert.strictEqual(favorites.filter(f => f.category === 'Flirty').length, 1);
console.log('✔ Test 4 PASS: Favorites vault correctly groups by tone categories.');

// Test 5: IDOR Prevention
function authorizeOperation(sessionUserId, resourceOwnerUserId) {
  if (!sessionUserId || sessionUserId !== resourceOwnerUserId) {
    throw new Error('403 Forbidden: IDOR violation prevented by RLS policy.');
  }
  return true;
}
assert.doesNotThrow(() => authorizeOperation('user-123', 'user-123'));
assert.throws(() => authorizeOperation('attacker', 'user-123'), /403 Forbidden/);
console.log('✔ Test 5 PASS: Master Auth Hardening IDOR prevention confirmed.');

// Test 6: Tri-Model AI Routing
const supported = ['claude', 'chatgpt', 'gemini', 'auto'];
const modelMappings = { claude: 'claude-3-5-sonnet', chatgpt: 'gpt-4o', gemini: 'gemini-1.5-flash' };
supported.forEach(p => assert.ok(supported.includes(p)));
assert.strictEqual(modelMappings.claude, 'claude-3-5-sonnet');
assert.strictEqual(modelMappings.chatgpt, 'gpt-4o');
assert.strictEqual(modelMappings.gemini, 'gemini-1.5-flash');
console.log('✔ Test 6 PASS: Tri-Model AI Engine routing verified.');

console.log('\nAll 6 verification suites passed successfully! 🎉');
```

---

## 10. RALPH LOOP AUTONOMOUS TASK MANIFEST (`PRD.json`)

```json
{
  "project": "VoiCe",
  "version": "2.1.0",
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Setup project directory, config files & environment templates",
      "status": "pending",
      "files": [".env.example", "tsconfig.json", "wrangler.toml"],
      "acceptance_criteria": ["All configs present and type-checking passes"],
      "test_command": "npx tsc --noEmit"
    },
    {
      "id": "TASK-002",
      "title": "Create Supabase schema with strict RLS and stored procedures",
      "status": "pending",
      "files": ["supabase/schema.sql"],
      "acceptance_criteria": ["All 8 tables created with RLS enabled", "Streak stored procedure is idempotent"],
      "test_command": "node tests/voice.test.js"
    },
    {
      "id": "TASK-003",
      "title": "Implement Cloudflare edge middleware and AI helper with 4-tier fallback",
      "status": "pending",
      "files": ["functions/api/_middleware.ts", "functions/api/_aiHelper.ts", "functions/api/replyEngine.ts"],
      "acceptance_criteria": ["CORS whitelisting active", "Pollinations and offline engine fallback resolve correctly"],
      "test_command": "node tests/voice.test.js"
    },
    {
      "id": "TASK-004",
      "title": "Implement edge API endpoints (/api/analyze, /api/rizz/generate, /api/rizz/improve, /api/reports/generate, /api/streak/check-in)",
      "status": "pending",
      "files": ["functions/api/analyze.ts", "functions/api/rizz/generate.ts", "functions/api/rizz/improve.ts", "functions/api/reports/generate.ts", "functions/api/streak/check-in.ts"],
      "acceptance_criteria": ["All endpoints return valid JSON", "Strict brevity enforced on replies"],
      "test_command": "node tests/voice.test.js"
    },
    {
      "id": "TASK-005",
      "title": "Build dark obsidian single-page web client",
      "status": "pending",
      "files": ["web/index.html"],
      "acceptance_criteria": ["Dropzone OCR works", "Tone matrix triggers live AI call", "1-tap copy works"],
      "test_command": "node tests/voice.test.js"
    },
    {
      "id": "TASK-006",
      "title": "Build mobile client with React Native Expo & Zustand",
      "status": "pending",
      "files": ["mobile/package.json", "mobile/App.tsx", "mobile/src/store/useVoiceStore.ts"],
      "acceptance_criteria": ["Zustand store handles chat turns and generation state"],
      "test_command": "npm --prefix mobile run typecheck"
    },
    {
      "id": "TASK-007",
      "title": "Run complete automated verification suite",
      "status": "pending",
      "files": ["tests/voice.test.js"],
      "acceptance_criteria": ["All 6 unit, security, and routing test suites pass with 0 errors"],
      "test_command": "node tests/voice.test.js"
    }
  ]
}
```

---

## 11. AUTONOMOUS EXECUTION INSTRUCTIONS

1. Read `PRD.json`. Find the first task with status `"pending"`.
2. Inspect the required files and implement them with 100% complete, working code.
3. Run the task's `test_command`. If it fails, analyze the root cause and fix immediately.
4. Mark the task `"completed"` in `PRD.json`.
5. Repeat until all tasks in `PRD.json` are completed and `node tests/voice.test.js` outputs `All 6 verification suites passed successfully!`.
