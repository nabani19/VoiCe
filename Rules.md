# VoiCe — Engineering & Security Rules

## 1. Non-Negotiables
- Read `PRD.md`, `Architecture.md`, `Phases.md`, and `Memory.md` before initiating changes.
- `Architecture.md` is the single source of truth for system structure.
- `PRD.md` is the single source of truth for product scope.
- Never introduce a second client state-management library. **Zustand is the only approved client state library.**
- Update `Memory.md` after every completed milestone.
- Record any architectural pivots in `decisions.md`.

---

## 2. Security & Auth Hardening (Master Audit Enforced)

### 2.1 Authorization & Row-Level Security (RLS)
- **Never trust client-supplied `user_id`**: For every API endpoint, database query, or serverless function that mutates or reads user data, `user_id` must be derived from the verified server-side session (`auth.uid()`).
- **Enforce RLS on every database table**: Every table containing user data (`profiles`, `conversations`, `messages`, `generations`, `replies`, `favorites`, `reports`, `streaks`) must have PostgreSQL Row-Level Security enabled with explicit policies.

### 2.2 Token & Session Handling
- Store web auth tokens in `httpOnly`, `Secure`, `SameSite=Lax` cookies—never in raw `localStorage`.
- Mobile tokens must be secured via `expo-secure-store`.
- Refresh token rotation must be enabled, and logout must invalidate tokens server-side.

### 2.3 Secrets Boundary
- Never commit or bundle `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` in frontend or mobile bundles.
- Only the public `SUPABASE_ANON_KEY` (restricted by RLS) is permitted in client env configurations.

### 2.4 Input Trust & IDOR Prevention
- Re-validate ownership for every resource mutation (`WHERE id = $id AND user_id = auth.uid()`).
- Validate all incoming payloads with strict Zod schemas before processing.

### 2.5 Managed Google OAuth
- Always use Supabase Auth's native Google OAuth provider—never write custom hand-rolled redirect/token-exchange logic.
- Verify that the `state` parameter is handled automatically for CSRF protection.
- Associate accounts only by verified email match.

---

## 3. Human Tone & Phrasing Standards
- **Zero AI Brochure Speak**: Eliminate algorithmic phrases like "Certainly! Here are some replies:", "I'd be glad to help", or "As an AI language model".
- **Real Human Texting**: Replies must sound like a real, emotionally intelligent person messaging in 2026.
- **Brevity Rule**: 1–2 short sentences maximum by default. No paragraphs, no oversharing.
- **Tone Nuances**:
  - *Natural*: Effortless, casual, low-pressure.
  - *Funny*: Situational, witty, dry banter, good comedic timing.
  - *Flirty*: Confident, teasing, reciprocal warmth, respectful.
  - *Spicy*: Bold charismatic tension without crossing into explicit sexual or coercive content.
  - *Professional*: Clear, concise, respectful, outcome-oriented.
  - *Romantic*: Genuine, sincere, warm.
  - *Sarcastic*: Playful deadpan irony when context supports it.
- **Diversity**: Generated candidates must differ in conversational angle and energy, not just swap synonyms.

---

## 4. Privacy & Data Protection
- Never log raw screenshots or plaintext chat bodies to public application logs.
- Screenshots uploaded to Supabase Storage must have short-lived retention and private access controls.
- Deletion is first-class: Users can delete any conversation, message, or favorite instantly.
- Never train models on private user conversations.

---

## 5. UI & Design Standards
- **Aesthetic**: Full-bleed dark cinematic palette (`#080706` base, `#f4efe8` off-white text, `#c45c30` rust accent, `#8274ff` violet glow, `#9dc797` status green).
- **Typography**: Barlow Condensed / Oswald for display headlines, DM Sans / Inter for body, IBM Plex Mono / JetBrains Mono for utility labels.
- **Buttons**: Editorial underline and arrow (`↗`) treatments, monospace micro-bordered chips; avoid generic bulky pills.
- **Accessibility**: Visible `:focus-visible` rings, full support for `prefers-reduced-motion`, and accessible contrast ratios.
