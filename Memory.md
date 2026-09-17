# VoiCe — Live Memory

**Last Updated:** 2026-09-17  
**Current Milestone:** Multi-Surface Architecture & Implementation (Cloudflare Pages + Supabase + Claude API + Expo EAS)  
**Product Name:** VoiCe  

---

## 1. Locked State & Architecture
- **Product Name:** VoiCe (AI-powered chat analysis and human smart reply generation).
- **Tone & Persona Rules:**
  - Removed "Gen-Z", "introvert", and "extrovert" tags.
  - Enforced **Human-First** natural texting style: concise (1–2 sentences max), realistic conversational cadence, situational humor, genuine emotion, zero robotic brochure language.
  - 7 Tones: Natural, Funny, Flirty, Spicy, Professional, Romantic, Sarcastic.
  - 4 Human Delivery Nuances: Casual & Direct, Witty & Teasing, Warm & Engaging, Unfiltered & Real.
- **Tech Stack:**
  - Web & Edge Hosting: Cloudflare Pages (free SSL, global edge CDN, unlimited static).
  - Edge Serverless Functions: Cloudflare Pages Functions (`web/functions/api/`).
  - Database, Auth & Storage: Supabase (PostgreSQL, Supabase Auth + Google OAuth, Supabase Storage, strict RLS).
  - Mobile: React Native + TypeScript via Expo, built and deployed via Expo EAS.
  - AI Pipeline: Claude 3.5 Sonnet server-side via Pages Functions (zero client-exposed keys).
- **Security Baseline:** Fully aligned with the Master Auth Hardening Checklist (RLS on all tables, httpOnly cookies/secure store, strict IDOR prevention, CSRF-protected OAuth).

---

## 2. In-Flight Work
- [x] Initialized core governance documents (`PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Memory.md`, `decisions.md`).
- [ ] Implement `supabase/schema.sql` with full PostgreSQL schema and RLS policies.
- [ ] Implement `web/index.html` with dark cinematic aesthetic and live interactive VoiCe engine.
- [ ] Implement `web/functions/api/` Cloudflare Pages Functions.
- [ ] Scaffold `mobile/` React Native Expo application with Zustand stores and screens.
- [ ] Run security & validation audits.

---

## 3. Handoff Rule
Any developer or AI agent must read `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `decisions.md`, and this file before modifying scope or architectural boundaries.
