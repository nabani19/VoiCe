# VoiCe — Architecture Decisions (ADR Log)

## ADR-001 — VoiCe Smart Reply is the Primary Product Flow
**Decision:** The home experience leads directly into VoiCe reply generation rather than treating chat analysis as a detached analytics tool.  
**Why:** Analysis is valuable because it sharpens the next message. Users open the app with the immediate desire to text back.

---

## ADR-002 — React Native + TypeScript via Expo for Mobile
**Decision:** Use React Native + TypeScript managed with Expo for iOS and Android.  
**Why:** High code reuse, rapid iteration, strong community ecosystem, and frictionless over-the-air updates.

---

## ADR-003 — Zustand is the Only Client State Library
**Decision:** Zustand is the sole client state-management library.  
**Why:** Eliminates unnecessary Redux/MobX boilerplate while providing atomic, reactive stores for generation state, chat turns, streaks, and favorites without context provider nesting.

---

## ADR-004 — Supabase for Database, Auth & Storage
**Decision:** Use Supabase PostgreSQL with native Supabase Auth and Storage.  
**Why:** Provides scalable PostgreSQL with built-in Row-Level Security, automated Google OAuth handling with CSRF state protection, and secure object storage under a generous free tier.

---

## ADR-005 — Provider Adapters for OCR and LLMs
**Decision:** Isolate vision and LLM models behind vendor-neutral internal contracts.  
**Why:** Decouples the application logic from provider APIs, allowing seamless switching between Anthropic Claude 3.5 Sonnet, OpenRouter, and Google Vision.

---

## ADR-006 — Structured AI Output Before UI Delivery
**Decision:** All LLM outputs must be validated against Zod schemas before being presented to the user or persisted.  
**Why:** Guarantees malformed or hallucinated formats are caught and retried before hitting the UI.

---

## ADR-007 — Conversation Reports are Evidence-Oriented
**Decision:** Diagnostic reports must clearly delineate between **observed text facts**, **model interpretations**, and **actionable suggestions**.  
**Why:** The app must be genuinely useful without pretending to possess psychic knowledge of another person's inner thoughts.

---

## ADR-008 — Temporary Screenshot Retention by Default
**Decision:** Process images in-memory whenever possible; store in temporary buckets with short TTLs.  
**Why:** User conversations are private and sensitive. Zero training is performed on uploaded screenshots.

---

## ADR-009 — Vanilla Single-File Marketing Landing Page
**Decision:** Keep the marketing landing page in `web/index.html` as high-performance vanilla HTML/CSS/JS.  
**Why:** Zero bundler dependencies, instantaneous loading on Cloudflare Pages edge CDN, and complete decoupling from mobile toolchains.

---

## ADR-010 — Cloudflare Pages & Functions for Hosting & Edge API
**Decision:** Deploy the web frontend on Cloudflare Pages and the serverless API via Cloudflare Pages Functions (`web/functions/api/*`).  
**Why:** Zero-maintenance serverless infrastructure with global low latency, free SSL, and secure secret injection.

---

## ADR-011 — Claude 3.5 Sonnet Server-Side Orchestration
**Decision:** Use Claude 3.5 Sonnet exclusively server-side via Cloudflare Pages Functions.  
**Why:** Claude 3.5 Sonnet leads the industry in nuanced social and emotional reasoning, subtle humor, and multimodal OCR accuracy. Server-side routing guarantees API keys are never leaked to clients.

---

## ADR-012 — Expo EAS for Mobile Distribution
**Decision:** Use Expo EAS for cloud building iOS and Android binaries.  
**Why:** Eliminates the need for local Xcode/Android Studio maintenance for continuous integration and store submission.

---

## ADR-013 — Human-First Conversational Tone Standard
**Decision:** Remove "Gen-Z", "introvert", and "extrovert" tags from tone and persona definitions. Enforce authentic, human-first conversational phrasing.  
**Why:** Users want messages that sound like real, confident, emotionally intelligent people texting—not algorithmic AI stereotypes.

---

## ADR-014 — Strict Row-Level Security (RLS) on All Tables
**Decision:** Enable and enforce PostgreSQL Row-Level Security (RLS) across all tables (`profiles`, `conversations`, `messages`, `generations`, `replies`, `favorites`, `reports`, `streaks`).  
**Why:** Prevents Insecure Direct Object References (IDOR). Even if an attacker manipulates API IDs or queries Supabase directly with an anon key, the database engine enforces tenant boundaries.
