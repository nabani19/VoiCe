# VoiCe — Delivery & Execution Phases

Each phase produces an independently testable increment.

---

## Phase 0 — Foundation & Supabase RLS Setup
- **Goal:** Database schema, RLS policies, and environment contracts are locked and tested.
- **Deliverables:** `supabase/schema.sql` with full table definitions, cascade constraints, foreign keys, and RLS policies for `profiles`, `conversations`, `messages`, `generations`, `replies`, `favorites`, `reports`, `streaks`.
- **Review Gate:** RLS policies prevent unauthorized reads/writes across user boundaries.

---

## Phase 1 — Dark Cinematic Web Surface & Rizz Engine (Cloudflare Pages)
- **Goal:** Public landing page and interactive VoiCe engine.
- **Deliverables:** `web/index.html` featuring full-bleed obsidian/rust styling, Barlow Condensed typography, interactive tone selection (Natural, Funny, Flirty, Spicy, Professional, Romantic, Sarcastic), human delivery styles, 1-tap copy to clipboard, "Make it better" rewrite demo, screenshot dropzone, conversation report preview, and functional early access form.
- **Review Gate:** Responsive on mobile/desktop; passes lighthouse accessibility; interactive controls work without lag.

---

## Phase 2 — Serverless Edge AI Pipeline (Cloudflare Pages Functions)
- **Goal:** Server-side AI orchestration with zero exposed keys.
- **Deliverables:** `web/functions/api/` handlers:
  - `analyze.ts`: Screenshot vision OCR & conversation state detection.
  - `rizz/generate.ts`: Claude 3.5 Sonnet smart reply generation.
  - `rizz/improve.ts`: Quick rewrite transformations.
  - `reports/generate.ts`: Comprehensive conversation report generator.
  - `streak/check-in.ts`: Idempotent streak tracker.
- **Review Gate:** All outputs validate against Zod schemas; prompt produces short, human, non-AI sounding lines.

---

## Phase 3 — Mobile Client Foundation (React Native + Expo EAS)
- **Goal:** Cross-platform mobile foundation with state management.
- **Deliverables:** `mobile/` directory setup with Expo SDK, TypeScript, `app.json`, `eas.json`, `@supabase/supabase-js`, `zustand`, `react-native-reanimated`, and theme tokens.
- **Review Gate:** Typecheck passes; Zustand stores initialize without side effects.

---

## Phase 4 — Mobile Core Screens & Features
- **Goal:** Complete user journey in React Native.
- **Deliverables:**
  - `HomeScreen`: Centerpiece VoiCe engine, tone selector, drag/drop & screenshot picker, streak badge.
  - `ResultScreen`: 3–5 short candidate cards, 1-tap clipboard copy with haptics, "Make this better" sheet, category-based favorite save.
  - `ReportScreen`: Full conversation report, flow timeline, positive cues, red flags with confidence tags, pro tips.
  - `FavoritesScreen`: Filterable tabs (*Flirty*, *Funny*, *Professional*, *Spicy*, etc.).
  - `HistoryScreen`: Filterable chat history by tone.
- **Review Gate:** Complete user loop runs seamlessly on mobile simulators and preview.

---

## Phase 5 — Auth Hardening, Auditing & Deployment
- **Goal:** Production-grade security and deployment readiness.
- **Deliverables:**
  - Automated security tests verifying RLS and IDOR resistance.
  - Supabase Auth + Google OAuth verified.
  - Cloudflare Pages deployment configuration (`wrangler.toml` or dashboard config).
  - Expo EAS build configuration for iOS and Android release pipelines.
- **Review Gate:** Passes the Master Auth Hardening checklist with zero critical findings.
