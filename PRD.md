# VoiCe — Product Requirements Document

**Status:** Build-ready v2.1  
**Product Name:** VoiCe  
**Owner:** Product + Engineering  
**Primary Surface:** Mobile app (iOS/Android via Expo EAS)  
**Secondary Surface:** Web application & marketing landing page (Cloudflare Pages)  

---

## 1. Product in One Sentence
**VoiCe** turns chat screenshots or pasted conversation threads into **short, authentic, human-sounding reply options** through a dedicated smart reply engine, and provides a deep conversation diagnostic report to help users understand chat dynamics without ever sounding like an AI brochure.

---

## 2. Target User
People who experience hesitation, social friction, or uncertainty over what to text next in dating, friendships, and professional settings. Users who want quick, high-context phrasing that feels completely natural, confident, and true to a human conversational voice—never robotic, generic, or cringe.

---

## 3. Core Problem
Most AI writing assistants produce replies that are far too verbose, overly polite, repetitive, or sterile. They feel like emails written by an algorithmic bot. VoiCe solves this by prioritizing:
1. **Human authenticity**: Phrases sound like real people texting in 2026.
2. **Extreme brevity**: 1–2 punchy sentences maximum by default.
3. **Context-first flow**: Understanding message history, tone shifts, and open conversational loops.

`Screenshot / paste → analyze conversational state → pick tone & delivery → get 3–5 short human replies → copy / improve / save`

---

## 4. Product Principles
1. **Human over algorithmic.** Zero AI clichés, robotic greetings, or brochure speak. Replies sound genuine, effortless, and relatable.
2. **Short by default.** In texting, brevity is power. Most reply candidates fit into 1 or 2 concise sentences.
3. **Smart reply is the centerpiece.** Analysis exists to power the reply, not to overwhelm the user with academic charts.
4. **Context beats cleverness.** Always ground responses in what the other person actually said, including unanswered questions and tone trajectory.
5. **Signals are not certainties.** Surface observable cues (e.g. "enthusiastic follow-up", "hesitation on scheduling") without claiming to read minds or predict exact intent.
6. **Strict privacy by default.** Chat screenshots are highly sensitive. Images are processed in memory or stored in short-lived encrypted buckets with zero model training on user chats.
7. **Auth hardening & security.** Row-Level Security (RLS) on all user data; all AI calls are strictly server-side (zero exposed API keys).

---

## 5. P0 Scope — Release Blocker if Missing

### Capture & Understanding
- Import chat screenshots from device photo library or file picker.
- Drag-and-drop screenshot upload on web surface.
- Direct text paste fallback for quick texting help.
- High-accuracy vision/OCR engine (Claude 3.5 Sonnet Vision / Tesseract) detecting:
  - Speaker turns (`me` vs `them`),
  - Timestamp ordering,
  - Bubble segmentation.
- Conversational state object: topic, flow stage, tone trajectory, open loops, unanswered questions.

### The VoiCe Smart Reply Flow
- Dedicated centerpiece home module.
- **7 Core Human Tones**:
  - **Natural**: Relaxed, conversational, direct, low-effort charm.
  - **Funny**: Witty, clever, situational humor, good timing.
  - **Flirty**: Warm, playful, teasing, confident, respectful.
  - **Spicy**: Bold, charismatic tension without explicit or inappropriate content.
  - **Professional**: Clear, courteous, outcome-oriented, respectful of boundaries.
  - **Romantic**: Sincere, emotionally genuine, warm without being melodramatic.
  - **Sarcastic**: Dry wit, deadpan, playful irony when the chat context supports it.
- **Human Delivery Nuances**:
  - *Casual & Direct*, *Witty & Teasing*, *Warm & Engaging*, *Unfiltered & Real*.
- **Intensity Slider (1–10)**: Modulating subtlety vs boldness.
- **User Intent Selector**: Continue conversation, move toward making plans / date, clarify ambiguous message, recover from awkward pause, polite close.
- **Candidate Delivery**:
  - 3–5 distinct reply options per generation.
  - Distinct candidate style badges (e.g. `playful`, `bold`, `subtle`, `safe`).
  - 1-tap **Copy to Clipboard** with instant visual feedback.
  - 1-tap **Save to Favorites** with category tagging.
  - **"Make this reply better"** quick transforms: shorter, punchier, warmer, more chill, wittier, less aggressive.
  - **Regenerate** action.
- **Daily Streaks Motivator**:
  - Clean streak counter on home screen rewarding consistent daily use.

### Library & Organization
- **Favorites**: Grouped into dedicated categories (*Flirty*, *Funny*, *Professional*, *Spicy*, *Natural*, *Romantic*, *Sarcastic*).
- **History**: Chronological log of past chat analyses with tone-filtering chips.
- Search across saved lines and past threads.

### Full Conversation Diagnostic Report
- **Thread Health & Flow Timeline**: Visual arc from opener to current state.
- **Tone Trajectory**: How the vibe has evolved across messages.
- **Strong Signals**: Observed positive cues backed by message evidence.
- **Red Flags & Hesitations**: Grounded in textual facts with explicit confidence ratings (e.g., one-word replies, deflection).
- **How to Impress Them**: Concrete conversational advice tailored to the other person's interests and conversational style.
- **Pro Tips**: Next-move strategic suggestions presented as flexible options.

---

## 6. Architecture & Platform Stack
- **Frontend / Web**: Cloudflare Pages (single-repo static hosting + global CDN).
- **Serverless API**: Cloudflare Pages Functions (`/functions/api/`).
- **Database & Auth**: Supabase (PostgreSQL with Row-Level Security, Supabase Auth with Google OAuth).
- **Storage**: Supabase Storage with bucket-level encryption and short retention policies.
- **Mobile**: React Native + TypeScript with Expo, distributed via Expo EAS.
- **AI Core**: Anthropic Claude API (Claude 3.5 Sonnet) server-side via Pages Functions.

---

## 7. Safety, Trust & Privacy Boundaries
- No automated sending: User retains full control; lines are copied to clipboard for user pasting.
- Strictly non-explicit: "Spicy" mode provides bold conversational banter, never NSFW or coercive content.
- Zero client-side API secrets: All LLM/OCR tokens reside on serverless edge functions.
- Row-Level Security (RLS): Strict database isolation prevents any cross-tenant data leaks.
- Deletion is first-class: Users can delete conversations, messages, and saved replies at any time.
