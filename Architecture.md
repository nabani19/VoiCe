# VoiCe — System Architecture

**Architecture Status:** v2.1  
**App Name:** VoiCe  
**Core Pattern:** Serverless Edge API (Cloudflare Pages Functions) + Managed Backend/Auth/DB (Supabase) + Cross-Platform Mobile (Expo EAS) + Server-Side Tri-Model AI (Claude 3.5 Sonnet, ChatGPT-4o, Google Gemini 1.5).

---

## 1. Stack & Infrastructure

### 1.1 Web & Edge Hosting
- **Hosting**: Cloudflare Pages (GitHub auto-deploy, free SSL, unlimited static, global edge CDN).
- **Serverless API / Functions**: Cloudflare Pages Functions (`functions/api/*`).
  - No client-exposed keys; acts as the secure boundary between client apps and the Tri-Model AI engine (Claude 3.5 Sonnet, ChatGPT-4o, Google Gemini 1.5).
- **DNS / SSL**: Cloudflare Managed DNS with HTTP/3 and DDoS mitigation.

### 1.2 Database, Auth & Storage (Supabase)
- **Database**: Supabase PostgreSQL.
- **Row-Level Security (RLS)**: Enforced on all tables (`profiles`, `conversations`, `messages`, `generations`, `replies`, `favorites`, `reports`, `streaks`).
- **Authentication**: Supabase Auth supporting Email Magic Links, Passwords, and Google OAuth.
  - Server-side email verification and CSRF `state` parameter validation.
  - Token handling: Secure `httpOnly` cookies for web; `expo-secure-store` for mobile.
- **Storage**: Supabase Storage (`screenshots` bucket) with private access policies and short-term lifecycle rules.

### 1.3 Mobile Client (Expo EAS)
- **Framework**: React Native + TypeScript via Expo.
- **Build System**: Expo EAS (Expo Application Services) for automated cloud compilation to iOS (.ipa) and Android (.apk / .aab).
- **State Management**: **Zustand** as the sole client state library (strictly enforcing ADR-003).
- **Animations & Gestures**: React Native Reanimated + React Native Gesture Handler.
- **Storage**: `expo-secure-store` (tokens) and `@react-native-async-storage/async-storage` (ephemeral UI cache).

### 1.4 Tri-Model AI Engine (Claude + ChatGPT + Gemini)
- **Anthropic Claude 3.5 Sonnet** (`claude-3-5-sonnet-20241022`): Premier engine for nuanced emotional reasoning, subtle banter, and human conversational cadence.
- **OpenAI ChatGPT** (`gpt-4o` / `gpt-4o-mini`): Ultra-fast situational wit, snappy comebacks, and direct texting replies.
- **Google Gemini** (`gemini-1.5-flash` / `gemini-1.5-pro`): High-efficiency multimodal Vision OCR for complex screenshot layouts, timestamps, and multi-turn chat threads.
- **Unified Provider Adapter**: Supports direct provider APIs as well as multi-model routing via OpenRouter (`sk-or-v1-...`). All calls are strictly server-side with zero client-exposed keys.

---

## 2. Directory Structure

```text
PLUG ai/
├── PRD.md
├── Architecture.md
├── Rules.md
├── Phases.md
├── Memory.md
├── decisions.md
├── supabase/
│   ├── schema.sql           # Complete schema + RLS policies + indexes
│   └── seed.sql             # Demo data fixtures
├── web/
│   ├── index.html           # Dark cinematic marketing landing page + live VoiCe demo
│   ├── functions/
│   │   └── api/
│   │       ├── [[path]].ts  # Cloudflare Pages Functions router
│   │       ├── analyze.ts   # OCR & chat state detection
│   │       ├── rizz/
│   │       │   ├── generate.ts # 3-5 short human reply generation
│   │       │   └── improve.ts  # "Make this better" rewrite engine
│   │       ├── reports/
│   │       │   └── generate.ts # Flow, cues, red flags, pro tips
│   │       └── streak/
│   │           └── check-in.ts # Idempotent daily streak handler
│   └── public/
├── mobile/
│   ├── app.json             # Expo config
│   ├── eas.json             # Expo EAS build profiles
│   ├── package.json
│   ├── tsconfig.json
│   ├── App.tsx              # Root component
│   └── src/
│       ├── navigation/      # React Navigation tabs & stacks
│       ├── screens/
│       │   ├── Home/        # Centerpiece VoiCe engine & quick capture
│       │   ├── Results/     # Generated candidate cards & actions
│       │   ├── Report/      # Conversation diagnostic report
│       │   ├── Favorites/   # Categorized saved lines
│       │   └── History/     # Filterable past analyses
│       ├── components/      # Tone pills, reply cards, audio/bubble previews
│       ├── store/           # Zustand stores (useVoiceStore, useChatStore, etc.)
│       ├── services/        # Supabase client & API services
│       └── theme/           # Obsidian/Rust/Violet design tokens
└── server/                  # Optional standalone Node/Fastify server for Render deployment
    ├── package.json
    ├── tsconfig.json
    └── src/
```

---

## 3. Core Data Flow

```text
Chat Screenshot / Pasted Text
            ↓
Cloudflare Pages Function (/api/analyze)
            ↓
Tri-Model AI Vision OCR (Claude 3.5 / ChatGPT-4o / Gemini 1.5)
            ↓
Chat Segmenter (Bubble & speaker turns)
            ↓
Tone & Flow State Analyzer (7 Human Tones)
            ↓
Candidate Composer (Human-First, 1-2 sentences)
            ↓
Zod Schema Validation & Safety Filter
            ↓
Client Presentation (React Native / Web)
            ↓
User Actions: [Copy 1-tap] | [Save to Categorized Favorites] | [Make Better] | [View Report]
```

---

## 4. API Endpoints (Cloudflare Pages Functions)

### `POST /api/analyze`
- **Auth**: Optional anon session or verified Supabase JWT (`Bearer <token>`).
- **Body**: Multipart image or `{ text: string }`.
- **Output**:
  ```json
  {
    "conversation_id": "uuid",
    "messages": [
      { "sender": "them", "body": "Are you coming tonight?", "sequence": 1 },
      { "sender": "me", "body": "Still at work, might be a bit late", "sequence": 2 }
    ],
    "detected_tone": "Natural",
    "flow_stage": "Logistics / Invitation",
    "open_loops": ["Whether you are meeting them or skipping"],
    "confidence": 0.95
  }
  ```

### `POST /api/rizz/generate`
- **Body**: `{ conversation_id, tone, delivery, intensity, intent }`
- **Output**:
  ```json
  {
    "candidates": [
      { "id": "1", "body": "Count me in. Save me a seat?", "style": "playful" },
      { "id": "2", "body": "Running slightly behind, but definitely on my way.", "style": "direct" },
      { "id": "3", "body": "Depends on how good the food is 😌", "style": "teasing" }
    ]
  }
  ```

### `POST /api/rizz/improve`
- **Body**: `{ candidate_text, transformation }`
- **Transformations**: `"shorter" | "funnier" | "warmer" | "more chill" | "wittier" | "less aggressive"`
- **Output**: `{ revised_text: string, explanation: string }`

### `POST /api/reports/generate`
- **Body**: `{ conversation_id }`
- **Output**: Structured conversation report with flow arc, tone shifts, positive cues, red flags with confidence & evidence citations, and pro tips.

### `POST /api/streak/check-in`
- **Auth**: Required Supabase JWT.
- **Output**: `{ current_streak: number, longest_streak: number, updated: boolean }`

---

## 5. Security & Auth Hardening (ADR Enforced)
- **Zero Client Keys**: Neither the Claude, OpenAI, Gemini API keys, nor the Supabase service role key are ever exposed to the client.
- **Row-Level Security (RLS)**: Enforced on all PostgreSQL tables.
- **Strict IDOR Mitigation**: All mutations derive user identity directly from `auth.uid()`.
