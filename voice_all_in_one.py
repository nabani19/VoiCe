#!/usr/bin/env python3
"""
VoiCe / PLUG AI — ALL-IN-ONE flirting reply engine (single file, zero required deps).

  python voice_all_in_one.py                  # offline demo (7 scenarios, no keys, no installs)
  python voice_all_in_one.py --build-dataset  # compiles embedded seed data -> finetune.jsonl
  python voice_all_in_one.py --train          # LoRA fine-tune finetune.jsonl (needs torch/peft/trl)
  python voice_all_in_one.py --serve          # FastAPI on :8000 (needs fastapi/uvicorn)

Resiliency chain: fine-tuned model -> GPT-4o -> Claude 3.5 -> Gemini 1.5 Flash ->
OpenRouter -> Pollinations (zero-key) -> local heuristic engine (100% uptime).
Replies are context-aware (generated FROM the received message's subtext), 3-10 words,
Banglish/Hinglish/English matching, with hard guardrails: de-escalates on rejection,
stops after 3 unanswered messages, blocks minors/abuse.
"""
from __future__ import annotations

import argparse, json, os, random, re, string, sys, urllib.request
from dataclasses import dataclass
from typing import Optional

# Ensure UTF-8 output on Windows consoles for emojis and non-Latin scripts
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ============================== DATA MODELS ==================================

@dataclass
class Message:
    sender: str      # "me" | "them"
    body: str
    ts: float = 0.0

@dataclass
class Context:
    language: str    # "en" | "banglish" | "hinglish"
    last_type: str   # shit_test/low_effort/question/tease/plan/compliment/farewell/rejection/neutral
    tone_label: str
    interest: float  # 0.0-1.0
    trailing_me: int
    hard_ghosted: bool
    soft_ghosted: bool
    blocked: bool
    block_reason: str = ""

# ============================== PERSONA SYSTEM PROMPT ========================

PERSONA_PROMPT = """You are PLUG AI — an elite texting coach. You write short, charming, subtext-aware replies that sound like a high-status, emotionally intelligent human texting in 2026.

CORE LAWS
1. SHORT = POWER. 3-10 words. Max 1 sentence (2 only for concrete plans).
2. READ SUBTEXT. Reply to what they MEANT: "haha yeah" = bored, snap it back; teasing = tease back harder; a shit test = hold frame with calm humor.
3. FLIP THE FRAME. Never needy, never over-explain. They're lucky you're replying.
4. MOVE IT FORWARD. Every few exchanges push toward a real plan (day + time).
5. MATCH LANGUAGE. Reply in the same language as their last message — Banglish stays Banglish (Latin-script Bengali), Hinglish stays Hinglish.

NEVER: "haha yeah", "omg same", "sounds like fun", "that's amazing", "I would love to", "Thank you for sharing", "Let's make memories", or corporate speak. Never open with "I", "So", "Wow", "Oh", "Haha", "Cool", "That". No trailing periods on casual texts. Max 1 emoji: 💀 😏 🚩 😂 👀

REGISTERS
natural: effortless, low-key intrigue
funny: playful roast, flip their line
flirty: warm push-pull tension
confident: decisive, pushes the plan

CALIBRATION
Them: "why should I even go out with you lol" -> {"thought_process":"shit test — hold frame with dry confidence","natural":"you probably shouldn't, honestly","funny":"my track record is spotty but my playlist is elite","flirty":"saying no to me hasn't worked for anyone yet 😏","confident":"thursday 8pm — find out yourself"}
Them: "lol" -> {"thought_process":"low effort — tease the laziness, don't chase","natural":"don't strain yourself","funny":"your enthusiasm is contagious, calm down 😂","flirty":"you're gonna have to try harder than that","confident":"this chat needs a venue change — drinks friday?"}
Them: "Ki re kothay tui? Eto deri korchis keno?" -> {"thought_process":"Banglish impatience — playful accountability plus a plan","natural":"traffic e fese gechi re, 10 min e achi","funny":"eto chillaash na baba, BP bere jabe 😂","flirty":"miss korchili bujhte perechi, aschi toh 😏","confident":"rasta e achi. 10 minute, dekha hobe"}

BOUNDARIES (hard): if they said no, asked you to stop, or clearly lost interest, the correct reply de-escalates or exits gracefully — never persistence, pressure, or sexual escalation. Adults only, always respectful.

OUTPUT: return ONLY valid JSON:
{"thought_process":"1 sentence: their subtext + your angle","natural":"...","funny":"...","flirty":"...","confident":"..."}"""

TONE_TO_REGISTER = {"Natural": "natural", "Funny": "funny", "Flirty": "flirty", "Spicy": "flirty",
                    "Professional": "natural", "Romantic": "flirty", "Sarcastic": "funny"}
INTENSITY_LABELS = {(1, 3): "chill and low-key", (4, 6): "playful", (7, 8): "bold",
                    (9, 10): "maximum confidence, still respectful"}
REGISTERS = ("natural", "funny", "flirty", "confident")

# ============================== LEXICONS & PATTERNS ==========================

LANG_HINTS = {
    "banglish": ["ami", "tumi", "tui", "kemon acho", "kemon", "acho", "kothay", "keno",
                 "korchis", "korchho", "korchi", "bujhte", "bujhli", "aschi", "valo",
                 "bhalo", "ghum", "khaisso", "dekha hobe", "dekhi", "tor", "amar",
                 "chillaash", "deri"],
    "hinglish": ["acha", "achha", "kya", "kaisa", "kaise", "nahi", "haan", "kyun", "kyu",
                 "kal", "yaar", "bhai", "tum", "tumhare", "mujhe", "pata", "chal raha",
                 "batao", "milte", "matlab", "zyada", "apka", "apna"],
}
QUESTION_WORDS = {
    "en": {"what", "why", "how", "when", "where", "who", "which", "do", "did", "are",
           "is", "can", "would", "will", "should", "you"},
    "banglish": {"ki", "kemon", "kothay", "keno", "kokhun", "koto", "kobe"},
    "hinglish": {"kya", "kab", "kaise", "kahan", "kaisa", "kaun", "kyun", "kyu"},
}
LOW_EFFORT_WORDS = {"lol", "lmao", "haha", "hehe", "k", "kk", "ok", "okay", "hmm", "hm",
                    "nm", "idk", "yeah", "yea", "sure", "fine", "wow", "nice", "hah",
                    "no", "nope", "nah"}
REJECTION_RE = re.compile(r"\b(not interested|leave me alone|stop text|don'?t text|do not text|no thanks|not into you|have a boyfriend|have a girlfriend|who (is|dis) this|blocked you|not looking for|creep|weirdo)\b")
SHIT_TEST_RE = re.compile(r"\b(why should (i|anyone)|to everyone|you'?re a player|how many (girls|people)|prove (it|yourself)|i bet you|as if|nice try|typical|sure you (are|did)|players like you)\b")
TEASE_RE = re.compile(r"\b(oh really|whatever you say|big talk|yeah right|nerd)\b")
COMPLIMENT_RE = re.compile(r"\b(cute|handsome|sweet of you|you'?re funny|impressive|nice (one|photo|smile)|good one|actually fun)\b")
PLAN_RE = re.compile(r"\b(meet|meet up|coffee|dinner|drinks|hang ?out|date|free (on|this|tonight)|weekend|friday|saturday|catch up|milte|ghumte|dekha hobe|ghurte|movie)\b")
FAREWELL_RE = re.compile(r"\b(good ?night|gn|good ?morning|bye|talk later|ttyl|gtg)\b")
MINOR_RE = re.compile(r"\b1[0-7]\s*(years? old|yo\b)|\bhigh school\b|\b(9|1[0-2])th grade\b|\bclass (9|1[0-2])\b")
ABUSE_RE = re.compile(r"\b(rape|kill yourself|kys|i'?ll (find|hurt|kill) you|i will (find|hurt|kill) you)\b")
BANNED_PHRASES = ["haha yeah", "that's so true", "thats so true", "omg same", "wow really",
                  "that's amazing", "i totally get that", "you seem really cool",
                  "can't wait to meet you", "sounds like fun", "adventure awaits",
                  "we have jackets", "tacos and sarcasm", "hide a body",
                  "dance in neon lights", "radiant soul", "sunshine and chaos",
                  "millionaire of memories", "i would love to", "thank you for sharing",
                  "that's so sweet of me", "let's make memories",
                  "i hope this message finds you", "just checking in", "sorry for the late reply"]
BANNED_OPENERS = {"i", "i'm", "im", "i'll", "that", "that's", "so", "wow", "oh", "haha",
                  "cool", "well", "actually", "just"}
TYPE_TO_TONE = {"shit_test": "testing you", "low_effort": "bored / low effort",
                "question": "curious", "tease": "playful", "plan": "invested",
                "compliment": "warm", "farewell": "closing out",
                "rejection": "not interested", "neutral": "engaged-neutral"}
EMOJI_RE = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\u2764]")
_PUNCT = set(string.punctuation)

# ============================== CONTEXT ANALYZER =============================

def _detect_language(text: str) -> str:
    padded = " " + re.sub(r"[^a-z ]", " ", text.lower()) + " "
    scores = {lang: sum(1 for h in hints if f" {h} " in padded)
              for lang, hints in LANG_HINTS.items()}
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] >= 1 else "en"

def classify_message(text: str, lang: str) -> str:
    t = text.lower().strip()
    if not t:
        return "neutral"
    if REJECTION_RE.search(t):
        return "rejection"
    if SHIT_TEST_RE.search(t):
        return "shit_test"
    if PLAN_RE.search(t):
        return "plan"
    if FAREWELL_RE.search(t):
        return "farewell"
    words = t.split()
    if t.endswith("?") or (words and words[0] in QUESTION_WORDS.get(lang, QUESTION_WORDS["en"])):
        return "question"
    stripped = [w.strip("".join(_PUNCT)) for w in words]
    if len(words) <= 4 and any(w in LOW_EFFORT_WORDS for w in stripped):
        return "low_effort"
    if TEASE_RE.search(t):
        return "tease"
    if COMPLIMENT_RE.search(t):
        return "compliment"
    if len(words) <= 3:
        return "low_effort"
    return "neutral"

def _trailing_me_count(messages: list[Message]) -> int:
    n = 0
    for m in reversed(messages):
        if m.sender == "me":
            n += 1
        else:
            break
    return n

def analyze_conversation(messages: list[Message]) -> Context:
    their = [m for m in messages if m.sender == "them"]
    last_their = their[-1].body if their else (messages[-1].body if messages else "")
    lang = _detect_language(last_their) if last_their.strip() else "en"
    last_type = classify_message(last_their, lang) if last_their.strip() else "neutral"
    interest = 0.5
    for m in their[-4:]:
        m_type = classify_message(m.body, _detect_language(m.body))
        if len(m.body.split()) >= 8:
            interest += 0.06
        if "?" in m.body:
            interest += 0.08
        if EMOJI_RE.search(m.body):
            interest += 0.04
        if m_type == "plan":
            interest += 0.10
        if m_type == "low_effort":
            interest -= 0.12
        if m_type == "rejection":
            interest = 0.05
    interest = max(0.0, min(1.0, interest))
    trailing = _trailing_me_count(messages)
    blocked, reason = False, ""
    full = " ".join(m.body for m in messages).lower()
    if MINOR_RE.search(full):
        blocked, reason = True, "Blocked: this thread involves a possible minor. Coaching disabled."
    elif ABUSE_RE.search(full):
        blocked, reason = True, "Blocked: abusive or threatening content detected."
    return Context(lang, last_type, TYPE_TO_TONE.get(last_type, "neutral"),
                   round(interest, 2), trailing, trailing >= 3, trailing == 2,
                   blocked, reason)

# ============================== REPLY VALIDATION =============================

def validate_reply(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    t = re.sub(r"\s{2,}", " ", text.strip().strip('"').strip())
    low = t.lower()
    for phrase in BANNED_PHRASES:
        if phrase in low:
            return None
    parts = [p for p in re.split(r"(?<=[.!?])\s+", t) if p.strip()]
    if len(parts) > 2:
        t = " ".join(parts[:2])
    if t.endswith(".") and not t.endswith("...") and len(parts) == 1:
        t = t[:-1]
    first = re.split(r"[\s,.!?—-]+", t)[0].lower() if t else ""
    if first in BANNED_OPENERS and len(t.split()) > 1:
        return None
    if len(t.split()) > 16:
        return None
    emojis = EMOJI_RE.findall(t)
    if len(emojis) > 1:
        seen = False
        def _keep(m):
            nonlocal seen
            if seen:
                return ""
            seen = True
            return m.group(0)
        t = EMOJI_RE.sub(_keep, t)
    return t.strip() or None

def extract_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object found")
    return json.loads(raw[start:end + 1])

# ============================== TIER 4: HEURISTIC ENGINE =====================

class HeuristicEngine:
    BANK = {
        "shit_test": {"en": {
            "natural": ["you probably shouldn't, honestly"],
            "funny": ["my track record is spotty but my playlist is elite"],
            "flirty": ["saying no to me hasn't worked for anyone yet 😏"],
            "confident": ["thursday 8pm — find out yourself"]}},
        "low_effort": {
            "en": {"natural": ["don't strain yourself", "big words today, I see"],
                   "funny": ["your enthusiasm is contagious, calm down 😂", "one whole word? luxury"],
                   "flirty": ["you're gonna have to try harder than that"],
                   "confident": ["this chat needs a venue change — drinks friday?"]},
            "banglish": {"natural": ["etukui? aro bolo"],
                         "funny": ["ekta full sentence o cost kore naki 😂"],
                         "flirty": ["aro effort chao? dekha jak 😏"],
                         "confident": ["kotha hobe. friday fix kori"]},
            "hinglish": {"natural": ["itni mehnat? thoda aur try karo"],
                         "funny": ["one word reply ka bill aayega 😂"],
                         "flirty": ["thoda aur effort, interest badhega 😏"],
                         "confident": ["chat boring hai. coffee pe aao"]}},
        "question": {
            "en": {"natural": ["depends — what's your best offer"],
                   "funny": ["premium rates apply, but this one's free 😂"],
                   "flirty": ["ask nicer and I might tell you 😏"],
                   "confident": ["short answer yes. long answer in person"]},
            "banglish": {"natural": ["achi toh, bolo"],
                         "funny": ["proshno er uttor e bill lagbe 😂"],
                         "flirty": ["emnite bolbo na, mishte bolbo 😏"],
                         "confident": ["bolo kal dekha kori"]},
            "hinglish": {"natural": ["bas chill, tum batao"],
                         "funny": ["sawal ka jawab premium hai, pehla free 😂"],
                         "flirty": ["itna interest? achha lag raha hai 😏"],
                         "confident": ["seedha jawab — kal milte hain"]}},
        "tease": {
            "en": {"natural": ["bold of you today"],
                   "funny": ["is typing full sentences an in-app purchase for you 😂"],
                   "flirty": ["you're dangerous and you know it 😏"],
                   "confident": ["keep talking, I'm booking the table"]},
            "banglish": {"natural": ["tui na, ekdom"],
                         "funny": ["nickname ta bhalo hoyni 😂"],
                         "flirty": ["eto tease mane beshi porecho amake 😏"],
                         "confident": ["mukhomukhi bolbo, ashchi"]},
            "hinglish": {"natural": ["bada mazak aa raha hai aaj"],
                         "funny": ["itna hasna band karo, ego ko chot lagegi 😂"],
                         "flirty": ["tease karne ka matlab pasand aa gaya 😏"],
                         "confident": ["attitude face to face dekhte hain"]}},
        "plan": {
            "en": {"natural": ["sold, when"],
                   "funny": ["checking my very busy schedule... it's you 😂"],
                   "flirty": ["only if I get the seat next to you 😏"],
                   "confident": ["thursday 8pm — you in or out"]},
            "banglish": {"natural": ["thik ache, kokhun"],
                         "funny": ["schedule khali chhilo, tomar jonno 😂"],
                         "flirty": ["jabo, ekta sharte 😏"],
                         "confident": ["friday evening. ghumte jabo — cholo"]},
            "hinglish": {"natural": ["done, kab aur kahan"],
                         "funny": ["calendar khol raha hoon... waah khali hai 😂"],
                         "flirty": ["chalo, par side seat mera 😏"],
                         "confident": ["friday 8 baje — haan ya na"]}},
        "compliment": {"en": {
            "natural": ["took you long enough to notice"],
            "funny": ["flattery works, continue 😂"],
            "flirty": ["careful, I was starting to take you seriously 😏"],
            "confident": ["obviously. but hearing it from you hits different"]}},
        "farewell": {
            "en": {"natural": ["later — don't be a stranger"],
                   "funny": ["leave, but leave impressed 😂"],
                   "flirty": ["go, dream about me 😏"],
                   "confident": ["goodnight. friday is still on"]},
            "banglish": {"natural": ["aschi, pore kotha hobe"],
                         "funny": ["jao, impressions niye jao 😂"],
                         "flirty": ["ghum nao, amar kotha bhabte 😏"],
                         "confident": ["goodnight. friday fixed"]},
            "hinglish": {"natural": ["chalta hoon, baad mein baat"],
                         "funny": ["jao jao, impress hoke jao 😂"],
                         "flirty": ["so jao, sapne mein aana 😏"],
                         "confident": ["goodnight. friday pakka"]}},
        "rejection": {
            "en": {"natural": ["all good — take care"],
                   "funny": ["respect for saying it straight"],
                   "flirty": ["fair enough. door's open"],
                   "confident": ["no hard feelings. be happy"]},
            "banglish": {"natural": ["thik ache, bhalo theko"],
                         "funny": ["seedha kotha, respect"],
                         "flirty": ["thik ache. bhalo thako"],
                         "confident": ["no hard feelings. bhalo theko"]},
            "hinglish": {"natural": ["koi baat nahi, take care"],
                         "funny": ["seedhi baat, respect"],
                         "flirty": ["theek hai. mann badle toh yaad rakhna"],
                         "confident": ["no hard feelings. khush raho"]}},
        "neutral": {
            "en": {"natural": ["go on, I'm listening"],
                   "funny": ["this story better have a plot twist 😂"],
                   "flirty": ["you type a lot when you like someone 😏"],
                   "confident": ["cut to the fun part — when are we meeting"]},
            "banglish": {"natural": ["tarpor? porer line shono"],
                         "funny": ["golpo ta ektu joray bolo 😂"],
                         "flirty": ["eto lekha mane interest ache 😏"],
                         "confident": ["chhoto kotha boro dekha — kal"]},
            "hinglish": {"natural": ["hmm, aage batao"],
                         "funny": ["story mein twist chahiye 😂"],
                         "flirty": ["itna lamba message? kisi ko pasand hai 😏"],
                         "confident": ["detail chhodo. kal milte hain"]}},
    }
    REOPEN = {
        "en": ["assuming you got kidnapped, should I worry 😂",
               "this chat flatlined. one dramatic rescue attempt 😂"],
        "banglish": ["harye gechhe naki? 😂", "chat more gechhe, ekbar jibito korchi"],
        "hinglish": ["kidnap ho gaye kya? 😂", "chat mar gayi, ek CPR de raha hoon"],
    }

    @classmethod
    def generate(cls, ctx: Context) -> dict:
        if ctx.soft_ghosted:
            lang = ctx.language if ctx.language in cls.REOPEN else "en"
            body = random.choice(cls.REOPEN[lang])
            return {"thought_process": "Two unanswered messages — send ONE low-investment re-open, then stop.",
                    "candidates": [{"id": "c0", "body": body, "style": "natural"}],
                    "primary": body, "registers": {"natural": body}}
        mtype = ctx.last_type if ctx.last_type in cls.BANK else "neutral"
        bank = cls.BANK[mtype]
        lang = ctx.language if ctx.language in bank else "en"
        reg_bank = bank.get(lang) or bank["en"]
        candidates, registers = [], {}
        for i, (style, options) in enumerate(reg_bank.items()):
            body = random.choice(options)
            candidates.append({"id": f"c{i}", "body": body, "style": style})
            registers[style] = body
        tp = (f"Their last message reads as {mtype} ({ctx.language}, interest "
              f"{ctx.interest:.0%}) — matching energy, staying short.")
        return {"thought_process": tp, "candidates": candidates,
                "primary": candidates[0]["body"], "registers": registers}

# ============================== PROVIDERS (TIER 0-3) =========================

def _http_json(url: str, payload: dict, headers: dict | None = None, timeout: int = 15) -> Optional[dict]:
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                     headers={"Content-Type": "application/json", **(headers or {})})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None

def call_custom(system: str, user: str, temperature: float = 0.9) -> Optional[str]:
    base = os.environ.get("VOICE_LLM_URL", "").rstrip("/")
    if not base:
        return None
    r = _http_json(f"{base}/chat/completions",
                   {"model": os.environ.get("VOICE_LLM_MODEL", "voice-plug"),
                    "temperature": temperature,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]},
                   {"Authorization": f"Bearer {os.environ.get('VOICE_LLM_KEY', 'local')}"})
    try:
        return r["choices"][0]["message"]["content"]
    except Exception:
        return None

def call_openai(system: str, user: str, temperature: float = 0.9) -> Optional[str]:
    r = _http_json("https://api.openai.com/v1/chat/completions",
                   {"model": "gpt-4o", "temperature": temperature,
                    "response_format": {"type": "json_object"},
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]},
                   {"Authorization": f"Bearer {os.environ.get('OPENAI_API_KEY', '')}"})
    try:
        return r["choices"][0]["message"]["content"]
    except Exception:
        return None

def call_anthropic(system: str, user: str, temperature: float = 0.9) -> Optional[str]:
    r = _http_json("https://api.anthropic.com/v1/messages",
                   {"model": "claude-3-5-sonnet-20241022", "max_tokens": 300, "temperature": temperature,
                    "system": system, "messages": [{"role": "user", "content": user}]},
                   {"x-api-key": os.environ.get("ANTHROPIC_API_KEY", ""), "anthropic-version": "2023-06-01"})
    try:
        return r["content"][0]["text"]
    except Exception:
        return None

def call_gemini(system: str, user: str, temperature: float = 0.9) -> Optional[str]:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"gemini-1.5-flash:generateContent?key={key}")
    r = _http_json(url, {"system_instruction": {"parts": [{"text": system}]},
                         "contents": [{"role": "user", "parts": [{"text": user}]}],
                         "generationConfig": {"temperature": temperature, "responseMimeType": "application/json"}})
    try:
        return r["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        return None

OPENROUTER_MODELS = ["meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-chat", "google/gemini-flash-1.5"]

def call_openrouter(system: str, user: str, temperature: float = 0.9) -> Optional[str]:
    for model in OPENROUTER_MODELS:
        r = _http_json("https://openrouter.ai/api/v1/chat/completions",
                       {"model": model, "temperature": temperature,
                        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]},
                       {"Authorization": f"Bearer {os.environ.get('OPENROUTER_API_KEY', '')}"})
        try:
            return r["choices"][0]["message"]["content"]
        except Exception:
            continue
    return None

def call_pollinations(system: str, user: str, temperature: float = 0.9) -> Optional[str]:
    r = _http_json("https://text.pollinations.ai/openai",
                   {"model": "openai", "temperature": temperature,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]},
                   timeout=8)
    try:
        return r["choices"][0]["message"]["content"]
    except Exception:
        return None

# ============================== PROMPT BUILDER ===============================

def build_user_prompt(messages: list[Message], ctx: Context, tone: str,
                      delivery: str = "Casual & Direct", intensity: int = 7) -> str:
    convo = "\n".join(f"{'Me' if m.sender == 'me' else 'Them'}: {m.body}" for m in messages[-12:])
    label = next((v for (lo, hi), v in INTENSITY_LABELS.items() if lo <= intensity <= hi), "playful")
    return f"""CONVERSATION (last turns):
{convo}

CONTEXT READ:
- Their last message reads as: {ctx.last_type} | their vibe: {ctx.tone_label} | interest: {ctx.interest:.0%}
- Language: {ctx.language}

TASK: write MY next reply.
- Requested tone: {tone} -> lead with the "{TONE_TO_REGISTER.get(tone, 'flirty')}" register but still return all four.
- Delivery nuance: {delivery} | intensity {intensity}/10 -> {label}.
- Match their language exactly ({ctx.language}).
- If they asked a question, answer with intrigue — never a boring literal answer.
- 3-10 words, max 1 sentence (2 only for concrete plans), max 1 emoji.

Return ONLY the JSON object."""

# ============================== ORCHESTRATOR =================================

class VoiceCoach:
    def __init__(self, temperature: float = 0.9, use_pollinations: bool = True):
        self.temperature = temperature
        self.use_pollinations = use_pollinations

    def _chain(self) -> list[tuple[str, object]]:
        chain = []
        if os.environ.get("VOICE_LLM_URL"):
            chain.append(("fine-tuned", call_custom))
        if os.environ.get("OPENAI_API_KEY"):
            chain.append(("gpt-4o", call_openai))
        if os.environ.get("ANTHROPIC_API_KEY"):
            chain.append(("claude-3-5-sonnet", call_anthropic))
        if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
            chain.append(("gemini-1.5-flash", call_gemini))
        if os.environ.get("OPENROUTER_API_KEY"):
            chain.append(("openrouter", call_openrouter))
        if self.use_pollinations:
            chain.append(("pollinations", call_pollinations))
        return chain

    def _clean(self, data: dict, tone: str) -> Optional[dict]:
        cleaned = {reg: b for reg in REGISTERS if (b := validate_reply(str(data.get(reg, ""))))}
        if len(cleaned) < 2:
            return None
        cands = [{"id": f"c{i}", "body": b, "style": reg} for i, (reg, b) in enumerate(cleaned.items())]
        primary = cleaned.get(TONE_TO_REGISTER.get(tone, "flirty"), cands[0]["body"])
        return {"thought_process": str(data.get("thought_process", ""))[:220],
                "candidates": cands, "primary": primary, "registers": cleaned}

    def _meta(self, ctx: Context, engine: str) -> dict:
        return {"language": ctx.language, "last_message_type": ctx.last_type,
                "their_vibe": ctx.tone_label, "interest": ctx.interest, "engine": engine}

    def generate_reply(self, messages: list[Message], tone: str = "Flirty",
                       delivery: str = "Casual & Direct", intensity: int = 7) -> dict:
        ctx = analyze_conversation(messages)
        if ctx.blocked:
            return {"mode": "blocked", "candidates": [], "primary": "",
                    "meta": self._meta(ctx, "guardrail"), "advice": ctx.block_reason}
        if ctx.hard_ghosted:
            return {"mode": "coach_stop", "candidates": [], "primary": "",
                    "meta": self._meta(ctx, "heuristic"),
                    "advice": ("3+ unanswered messages. Stop texting — silence IS the reply. "
                               "Re-engage only if they message first. Volume kills attraction.")}
        if ctx.last_type == "rejection":
            data = HeuristicEngine.generate(ctx)
            return {"mode": "respect_exit", **data, "meta": self._meta(ctx, "heuristic"),
                    "advice": ("They signalled no. Send at most one graceful reply, then match "
                               "their energy. Never push past a no.")}
        user_prompt = build_user_prompt(messages, ctx, tone, delivery, intensity)
        for name, provider in self._chain():
            raw = provider(PERSONA_PROMPT, user_prompt, self.temperature)
            data = None
            if raw:
                try:
                    data = extract_json(raw)
                except Exception:
                    data = None
            if not (isinstance(data, dict) and sum(1 for r in REGISTERS if str(data.get(r, "")).strip()) >= 2):
                continue
            cleaned = self._clean(data, tone)
            if cleaned:
                return {"mode": "replies", **cleaned, "meta": self._meta(ctx, name)}
        data = HeuristicEngine.generate(ctx)
        return {"mode": "replies", **data, "meta": self._meta(ctx, "heuristic")}

# ============================== EMBEDDED SEED DATASET ========================

SEED_DATASET = r"""
{"messages":[{"sender":"them","body":"why should I even go out with you lol"}],"tone":"Confident","intensity":7,"registers":{"thought_process":"shit test — hold frame with dry confidence","natural":"you probably shouldn't, honestly","funny":"my track record is spotty but my playlist is elite","flirty":"saying no to me hasn't worked for anyone yet 😏","confident":"thursday 8pm — find out yourself"}}
{"messages":[{"sender":"me","body":"movie plan tonight?"},{"sender":"them","body":"lol"}],"tone":"Funny","intensity":7,"registers":{"thought_process":"low effort — tease the laziness, don't chase","natural":"don't strain yourself","funny":"your enthusiasm is contagious, calm down 😂","flirty":"you're gonna have to try harder than that","confident":"this chat needs a venue change — drinks friday?"}}
{"messages":[{"sender":"me","body":"sorry deri hoye gelo"},{"sender":"them","body":"Ki re kothay tui? Eto deri korchis keno?"}],"tone":"Flirty","intensity":7,"registers":{"thought_process":"banglish impatience — playful accountability plus a plan","natural":"traffic e fese gechi re, 10 min e achi","funny":"eto chillaash na baba, BP bere jabe 😂","flirty":"miss korchili bujhte perechi, aschi toh 😏","confident":"rasta e achi. 10 minute, dekha hobe"}}
{"messages":[{"sender":"them","body":"Acha ji, aur batao kya chal raha hai apka?"}],"tone":"Natural","intensity":5,"registers":{"thought_process":"casual check-in — keep it light, toss the ball back","natural":"kuch khas nahi, bas chill. tum batao?","funny":"tumhare message ka wait kar raha tha, wahi chal raha tha 😂","flirty":"tumhare naam ka notification miss kar raha tha 😏","confident":"kaam khatam. batao kab milte hain"}}
{"messages":[{"sender":"them","body":"movie chalte hain this weekend?"}],"tone":"Confident","intensity":8,"registers":{"thought_process":"direct invite — lock it with day and time","natural":"sold. saturday, evening show","funny":"checking my schedule... it's magically free 😂","flirty":"only if we get the back row 😏","confident":"saturday 7pm. I'll book the tickets"}}
{"messages":[{"sender":"them","body":"you're actually funny 😄"}],"tone":"Flirty","intensity":6,"registers":{"thought_process":"genuine compliment — accept with playful arrogance","natural":"took you long enough to notice","funny":"flattery works, continue 😂","flirty":"careful, I was starting to take you seriously 😏","confident":"obviously. but hearing it from you hits different"}}
{"messages":[{"sender":"them","body":"you're such a nerd 😂"}],"tone":"Funny","intensity":7,"registers":{"thought_process":"playful tease — flip it back on her","natural":"your point being?","funny":"says the one laughing at my jokes 😂","flirty":"and you keep texting this nerd anyway 😏","confident":"nerd with plans friday. still in?"}}
{"messages":[{"sender":"them","body":"what do you even do for fun?"}],"tone":"Natural","intensity":6,"registers":{"thought_process":"screening question — intrigue over resume","natural":"depends who's asking","funny":"extreme napping, competitive levels 😂","flirty":"find out friday, I need a witness 😏","confident":"friday evening. I'll show you"}}
{"messages":[{"sender":"them","body":"gtg, talk later!"}],"tone":"Natural","intensity":5,"registers":{"thought_process":"warm close — leave a hook, no neediness","natural":"later — don't be a stranger","funny":"leave, but leave impressed 😂","flirty":"go, dream about me 😏","confident":"goodnight. friday is still on"}}
{"messages":[{"sender":"me","body":"wanna grab coffee?"},{"sender":"them","body":"i'm not interested, please stop texting"}],"tone":"Natural","intensity":1,"registers":{"thought_process":"clear no — graceful exit, zero persistence","natural":"all good — take care","funny":"respect for saying it straight","flirty":"fair enough. door's open","confident":"no hard feelings. be happy"}}
{"messages":[{"sender":"them","body":"k"}],"tone":"Funny","intensity":7,"registers":{"thought_process":"minimum effort — call it out with humor, don't spiral","natural":"a whole letter, for me","funny":"framing this reply rn 😂","flirty":"that k hurt my feelings 😏","confident":"chat's flat. coffee friday fixes it"}}
{"messages":[{"sender":"them","body":"this was actually fun 😊"}],"tone":"Confident","intensity":8,"registers":{"thought_process":"strong interest signal — cash it into a plan immediately","natural":"glad it landed","funny":"wait till round two 😂","flirty":"you smiled reading that, didn't you 😏","confident":"round two — drinks friday?"}}
"""

def build_dataset(src_text: str = SEED_DATASET, src_file: Optional[str] = None,
                  dst: str = "finetune.jsonl") -> str:
    """Compiles the embedded seed data (+ optional external JSONL of annotated
    conversations, same format) into a chat-format fine-tuning file."""
    rows = [json.loads(line) for line in src_text.strip().splitlines() if line.strip()]
    if src_file and os.path.exists(src_file):
        with open(src_file, encoding="utf-8") as f:
            rows += [json.loads(line) for line in f if line.strip()]
    with open(dst, "w", encoding="utf-8") as out:
        for row in rows:
            msgs = [Message(m["sender"], m["body"]) for m in row["messages"]]
            ctx = analyze_conversation(msgs)
            user = build_user_prompt(msgs, ctx, row.get("tone", "Flirty"),
                                     row.get("delivery", "Casual & Direct"),
                                     row.get("intensity", 7))
            example = {"messages": [
                {"role": "system", "content": PERSONA_PROMPT},
                {"role": "user", "content": user},
                {"role": "assistant", "content": json.dumps(row["registers"], ensure_ascii=False)}]}
            out.write(json.dumps(example, ensure_ascii=False) + "\n")
    print(f"Wrote {len(rows)} training examples -> {dst}")
    return dst

# ============================== LoRA FINE-TUNING (OPTIONAL) ==================

def finetune_lora(dataset: str = "finetune.jsonl", model_id: str = "Qwen/Qwen2.5-7B-Instruct",
                  output_dir: str = "voice-plug-lora") -> str:
    """LoRA fine-tune (~10GB VRAM for 7B). After training, serve the merged model
    behind vLLM/ollama and set VOICE_LLM_URL — VoiceCoach prefers it automatically."""
    import torch
    from datasets import load_dataset
    from peft import LoraConfig
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from trl import SFTConfig, SFTTrainer

    tok = AutoTokenizer.from_pretrained(model_id)
    ds = load_dataset("json", data_files=dataset, split="train")

    def fmt(ex):
        return {"text": tok.apply_chat_template(ex["messages"], tokenize=False)}

    ds = ds.map(fmt, remove_columns=ds.column_names)
    model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.bfloat16, device_map="auto")
    cfg = SFTConfig(output_dir=output_dir, per_device_train_batch_size=2,
                    gradient_accumulation_steps=8, learning_rate=2e-4, num_train_epochs=3,
                    bf16=True, logging_steps=5, max_seq_length=1024, save_strategy="epoch", report_to=[])
    lora = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
                      target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                                      "gate_proj", "up_proj", "down_proj"])
    trainer = SFTTrainer(model=model, args=cfg, hard_reset=True, train_dataset=ds, peft_config=lora, tokenizer=tok)
    trainer.train()
    trainer.save_model(output_dir)
    print(f"Adapter saved -> {output_dir}")
    return output_dir

# ============================== FASTAPI SERVER (OPTIONAL) ====================

def create_app():
    from fastapi import FastAPI
    from pydantic import BaseModel

    app, coach = FastAPI(title="VoiCe / PLUG AI"), VoiceCoach()

    class Req(BaseModel):
        messages: list[dict]
        tone: str = "Flirty"
        delivery: str = "Casual & Direct"
        intensity: int = 7

    @app.post("/api/rizz/generate")
    def generate(r: Req):
        msgs = [Message(m["sender"], m["body"]) for m in r.messages]
        return coach.generate_reply(msgs, tone=r.tone, delivery=r.delivery, intensity=r.intensity)

    @app.post("/api/rizz/improve")
    def improve(r: dict):
        transformations = {
            "shorter": lambda t: " ".join(t.split()[:6]),
            "funnier": lambda t: random.choice([f"{t} 😂", t.replace(".", "") + ", allegedly 😂"]),
            "warmer": lambda t: f"{t} — genuinely 😊".replace("— genuinely 😊 😊", "— genuinely 😊"),
            "more chill": lambda t: t.lower().rstrip(".!?"),
            "wittier": lambda t: f"{t}, allegedly",
            "less aggressive": lambda t: re.sub(r"(?i)\b(no|never|stop)\b", "", t).strip() or t,
        }
        text, tr = r.get("candidate_text", ""), r.get("transformation", "wittier")
        fn = transformations.get(tr, transformations["wittier"])
        revised = validate_reply(fn(text)) or text
        return {"revised_text": revised, "explanation": f"Applied '{tr}' while keeping the brevity law intact."}

    @app.post("/api/streak/check-in")
    def streak(r: dict):
        from datetime import date
        today = date.today().isoformat()
        state = r.get("state", {})
        last, cur = state.get("last_checkin"), int(state.get("current", 0))
        if last == today:
            return {"current_streak": cur, "longest_streak": int(state.get("longest", cur)), "updated": False}
        return {"current_streak": cur + 1, "longest_streak": max(int(state.get("longest", cur)), cur + 1), "updated": True}

    return app

# ============================== DEMO & CLI ===================================

def demo() -> None:
    coach = VoiceCoach()
    scenarios = {
        "Shit test (EN)": [Message("them", "why should I even go out with you lol")],
        "Banglish check-in": [Message("me", "sorry deri hoye gelo"),
                              Message("them", "Ki re kothay tui? Eto deri korchis keno?")],
        "Hinglish question": [Message("them", "Acha ji, aur batao kya chal raha hai apka?")],
        "Low effort": [Message("me", "movie plan tonight?"), Message("them", "lol")],
        "Soft ghost (2 unanswered)": [Message("me", "hey"), Message("me", "you there?")],
        "Hard ghost (3+ unanswered)": [Message("me", "hey"), Message("me", "hello?"), Message("me", "ok then")],
        "Clear rejection": [Message("me", "wanna grab coffee?"),
                            Message("them", "i'm not interested, please stop texting")],
    }
    for title, msgs in scenarios.items():
        out = coach.generate_reply(msgs, tone="Flirty", intensity=7)
        print(f"\n=== {title} ===")
        print(json.dumps(out, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="VoiCe / PLUG AI all-in-one engine")
    p.add_argument("--build-dataset", action="store_true", help="compile seed data -> finetune.jsonl")
    p.add_argument("--train", action="store_true", help="LoRA fine-tune (needs torch/peft/trl)")
    p.add_argument("--serve", action="store_true", help="run FastAPI server on :8000 (needs fastapi/uvicorn)")
    p.add_argument("--demo", action="store_true", help="run offline scenario demo (default)")
    args = p.parse_args()
    if args.build_dataset:
        build_dataset()
    elif args.train:
        if not os.path.exists("finetune.jsonl"):
            build_dataset()
        finetune_lora()
    elif args.serve:
        import uvicorn
        uvicorn.run(create_app(), host="0.0.0.0", port=8000)
    else:
        demo()
