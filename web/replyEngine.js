/**
 * replyEngine.js — offline tone detection + reply generation.
 * Zero dependencies. Works in browser (<script type="module">) and Node.
 *
 * Usage:
 *   import { generateReply } from "./replyEngine.js";
 *   const out = generateReply("I got the job!!! 🎉", { name: "Rahul" });
 *   // out = { tone, confidence, intent, lang, natural, funny, flirty, confident, scores }
 */

// ---------- 1. Lexicon: word -> [tone, weight] ----------
const LEX = {
  happy:    "happy glad great good nice awesome amazing wonderful fantastic fine cool lovely perfect enjoy enjoying fun yay congrats congratulations won passed selected bhalo bhalo-i moja mast badhiya accha achha",
  excited:  "excited thrilled pumped cant-wait finally omg wow insane epic hype letsgo let's-go uffff",
  sad:      "sad upset down depressed lonely cry crying hurt hurts miss missed sorry-to lost failed fail failure tired exhausted bored dukkho kharap mon-kharap udas",
  angry:    "angry mad furious annoyed annoying irritated hate hated stupid idiot worst ridiculous pathetic useless rag rege gussa bakwas pagol",
  anxious:  "worried worry nervous scared afraid anxious stress stressed stressing tension tensed panic exam-tomorrow deadline dar bhoy bhoi chinta",
  love:     "love loved miss-you darling babe baby sweetheart cute handsome beautiful bhalobashi pyaar jaan shona",
  grateful: "thanks thank thankyou thx appreciate appreciated grateful dhonnobad dhanyavad shukriya",
  apologetic: "sorry apologize apologies my-bad forgive maaf khoma",
  confused: "confused confusing unclear dont-understand huh what-do-you-mean lost-me bujhlam-na samajh-nahi",
};
const WEIGHT = { happy: 1, excited: 1.3, sad: 1.2, angry: 1.3, anxious: 1.2, love: 1.3, grateful: 1.5, apologetic: 1.5, confused: 1.2 };

const WORD2TONE = {};
for (const [tone, words] of Object.entries(LEX)) {
  for (const w of words.split(/\s+/)) WORD2TONE[w] = tone;
}

const EMOJI = {
  "😊": "happy", "😄": "happy", "😁": "happy", "🙂": "happy", "👍": "happy", "😀": "happy",
  "🎉": "excited", "🔥": "excited", "🤩": "excited", "🥳": "excited", "😍": "love",
  "❤️": "love", "❤": "love", "😘": "love", "🥰": "love", "💕": "love",
  "😢": "sad", "😭": "sad", "😞": "sad", "💔": "sad", "😔": "sad",
  "😡": "angry", "😠": "angry", "🤬": "angry", "😤": "angry",
  "😰": "anxious", "😨": "anxious", "😟": "anxious", "😥": "anxious",
  "🙏": "grateful", "😕": "confused", "🤔": "confused", "😅": "apologetic",
};

const NEGATORS = new Set(["not", "no", "never", "dont", "don't", "didnt", "didn't", "isnt", "isn't", "cant", "can't", "wasnt", "wasn't", "nahi", "na", "nai"]);
const BOOSTERS = new Set(["very", "so", "really", "too", "extremely", "super", "totally", "bohot", "khub", "onek"]);
const POSITIVE = new Set(["happy", "excited", "love", "grateful"]);
const NEGATIVE = new Set(["sad", "angry", "anxious"]);

// Phrase patterns that are stronger than single words
const PHRASES = [
  [/\bthank(s| you| u)\b/i, "grateful", 2],
  [/\b(sorry|my bad|apolog\w+)\b/i, "apologetic", 2],
  [/\bi (love|luv) (you|u)\b/i, "love", 3],
  [/\bi miss (you|u)\b/i, "love", 2.5],
  [/\bcan'?t wait\b/i, "excited", 2],
  [/\b(so|very) (happy|glad)\b/i, "happy", 2],
  [/\b(fed up|sick of|shut up)\b/i, "angry", 2.5],
  [/\bi('| a)?m (so |very )?(scared|nervous|worried)\b/i, "anxious", 2],
  [/\bwhat do you mean\b|\bi don'?t (get|understand)\b/i, "confused", 2],
  [/\bi('| a)?m (so |very )?(sad|down|depressed)\b/i, "sad", 2.5],
];

// ---------- 2. Intent + language detection ----------
const INTENTS = [
  ["farewell", /\b(bye|goodbye|good night|gn|see you|take care|ttyl|talk later|tata|allah hafez)\b/i],
  ["greeting", /^\s*(hi+|hello+|hey+|yo|sup|good (morning|afternoon|evening)|namaste|namaskar|assalamu|kemon acho|kya haal|how are you|how's it going|hru)\b/i],
  ["request",  /\b(please|pls|can you|could you|would you|help me|need (you )?to)\b/i],
  ["question", /\?\s*$|^\s*(what|why|how|when|where|who|which|kobe|kothay|keno|kivabe|kya|kyun)\b/i],
];
const BANGLISH = /\b(ami|tumi|apni|acho|achi|bhalo|kemon|khub|onek|hobe|korbo|korchi|jai|aschi|dada|didi|bondhu|ki|kore|ache|bhalobashi|mon|kharap|dukkho|kothay|kokhon|keno|shotti|ajke|ekhon)\b/i;
const HINGLISH = /\b(kya|hai|bhai|yaar|aaj|nahi|chal|kuch|dekh|kar|bol|raha|rahi|hum|kaise|kahan|sahi|arre|theek|bohot)\b/i;

function detectIntent(text) {
  for (const [name, re] of INTENTS) if (re.test(text)) return name;
  return "statement";
}

function detectLang(text) {
  if (BANGLISH.test(text)) return "banglish";
  if (HINGLISH.test(text)) return "hinglish";
  return "en";
}

// ---------- 3. Tone scoring ----------
export function detectTone(text) {
  const scores = { happy: 0, excited: 0, sad: 0, angry: 0, anxious: 0, love: 0, grateful: 0, apologetic: 0, confused: 0 };
  const clean = text.toLowerCase().replace(/[^\p{L}\p{N}\s'\-]/gu, " ");
  const tokens = clean.split(/\s+/).filter(Boolean);

  tokens.forEach((tok, i) => {
    const tone = WORD2TONE[tok];
    if (!tone) return;
    let w = WEIGHT[tone];
    const prev = tokens.slice(Math.max(0, i - 2), i);
    if (prev.some((p) => BOOSTERS.has(p))) w *= 1.5;
    if (prev.some((p) => NEGATORS.has(p))) {
      if (POSITIVE.has(tone)) scores.sad += w * 0.8;
      else if (NEGATIVE.has(tone)) scores.happy += w * 0.4;
    } else scores[tone] += w;
  });

  for (const [re, tone, w] of PHRASES) if (re.test(text)) scores[tone] += w;
  for (const ch of text.match(/\p{Extended_Pictographic}\uFE0F?/gu) || []) if (EMOJI[ch]) scores[EMOJI[ch]] += 1.5;

  const bangs = (text.match(/!/g) || []).length;
  const letters = text.replace(/[^A-Za-z]/g, "");
  const capsRatio = letters.length > 4 ? letters.replace(/[^A-Z]/g, "").length / letters.length : 0;
  if (bangs >= 2) { scores.excited += 0.8; scores.angry += scores.angry > 0 ? 0.8 : 0; }
  if (capsRatio > 0.6) { scores.angry += scores.angry > 0 ? 1.2 : 0; scores.excited += 0.8; }
  if (/\.{3,}|…/.test(text)) { scores.sad += scores.sad > 0 ? 0.5 : 0; scores.anxious += scores.anxious > 0 ? 0.5 : 0; }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [top, topScore] = ranked[0];
  if (topScore < 0.8) return { tone: "neutral", confidence: 0.5, scores };
  const total = ranked.reduce((s, [, v]) => s + v, 0);
  return { tone: top, confidence: Math.min(0.99, +(topScore / total).toFixed(2)), scores };
}

// ---------- 4. Smart Reply Templates (4 registers x 3 languages) ----------  {n} = ", Name" or ""
const T = {
  en: {
    happy: {
      natural: ["love that for you{n}, tell me more", "sounds like a huge win honestly", "you're in a good mood, what happened?"],
      funny: ["look at you thriving, don't forget the little people 😂", "are you always this cheerful or did you win the lottery?", "save some happiness for the rest of us"],
      flirty: ["you in a good mood looks dangerous on you 😉", "celebrating without me? bold move", "your energy is contagious, not gonna lie"],
      confident: ["you earned it. let's grab drinks to celebrate", "told you that would work out. what's next?", "deserve every bit of it. proud of you"]
    },
    excited: {
      natural: ["no way, that's actually huge! tell me everything", "let's go! that's so sick", "honestly that made my day hearing that"],
      funny: ["calm down, you're gonna pull a muscle 😂", "don't get too famous on me now", "okay deep breath, now give me the full story"],
      flirty: ["i love how excited you get, it's genuinely hot 😏", "we definitely need to celebrate this in person", "you're cute when you're hyped up"],
      confident: ["knew you were gonna crush it. dinner's on you 😉", "just the beginning for you. let's mark the occasion", "elite moves. let's celebrate this week"]
    },
    sad: {
      natural: ["hate hearing that{n}. what happened?", "sorry you're dealing with that, here if you need to vent", "rough day? take it easy tonight"],
      funny: ["who do i need to roast for this? give me names 😂", "today is officially cancelled, tomorrow we start over", "let's blame the universe and order takeout"],
      flirty: ["wish i was there to take your mind off things 😉", "let me distract you for an hour, you need a break", "you need a distraction and i'm great at that"],
      confident: ["one bad day doesn't change anything. shake it off", "you've handled worse. let's get you out of your head tonight", "take a breath. you're gonna be completely fine"]
    },
    angry: {
      natural: ["yeah that's super frustrating, don't blame you at all", "sounds like a headache. what did they do?", "honestly valid. vent to me, i'm listening"],
      funny: ["take a deep breath, jail looks bad on both of us 😂", "channel that rage into something fun", "who gave them permission to test you today?"],
      flirty: ["you're kind of hot when you're feisty 😏", "come blow off some steam with me later", "let me take you out so you can forget all about it"],
      confident: ["don't give them that much power over your mood", "not worth your energy. let it go and focus on tonight", "shake it off. let's change the topic to something better"]
    },
    anxious: {
      natural: ["deep breath, you're definitely overthinking it", "one step at a time, you've got this handled", "stressing won't help, what's the immediate next thing?"],
      funny: ["remember: panic is cardio, so at least you got a workout 😂", "overthinking is a full-time job for you isn't it?", "worst case we move to a remote island, problem solved"],
      flirty: ["stop overthinking, you're way too smart for that 😉", "wish i was there to calm you down right now", "i have faith in you even when you don't"],
      confident: ["trust yourself. you're more than ready for this", "you've done the work, now just go execute", "breathe. you've got this completely locked down"]
    },
    love: {
      natural: ["appreciate you saying that honestly ❤️", "that actually made me smile", "you're pretty great yourself you know"],
      funny: ["are you trying to get on my good side? it's working 😂", "who paid you to be this nice to me?", "careful, you're boosting my ego way too high"],
      flirty: ["keep talking like that and see what happens 😉", "you're making it very hard not to kiss you right now", "admit it, you're obsessed with me"],
      confident: ["i know, the feeling's mutual. let's see each other soon", "that's what i like to hear. you're special to me too", "glad you finally realized. when am i seeing you?"]
    },
    grateful: {
      natural: ["of course{n}, happy to help anytime", "anytime, don't even worry about it", "got you, always"],
      funny: ["you owe me coffee now, no excuses ☕", "i accept payment in pizza and good company 😂", "just making sure i remain your favorite person"],
      flirty: ["for you? i'd do a lot more than that 😉", "you can thank me properly over drinks this week", "you're lucky i like you so much"],
      confident: ["always got your back. no need to say thanks", "of course. that's what i'm here for", "anytime. you'd do the same for me"]
    },
    apologetic: {
      natural: ["all good{n}, don't worry about it at all", "no stress, things happen!", "completely fine, you're good"],
      funny: ["i'll forgive you, but you're buying the first round 😂", "apology accepted, strike one though 😉", "don't push your luck, but you're forgiven"],
      flirty: ["i'll let it slide, but only because you're cute 😉", "you're gonna have to make it up to me in person", "lucky for you, i have a soft spot for you"],
      confident: ["we're good. let's just move forward", "no apology needed. focus on what's next", "all forgiven. don't sweat it"]
    },
    confused: {
      natural: ["what part did you want me to clear up?", "haha my bad, let me rephrase that", "wait what's confusing? tell me"],
      funny: ["did i stutter or did you just zone out on me? 😂", "it's not rocket science, but i'll explain anyway", "pretend you understood so we both look smart"],
      flirty: ["i'll explain it over drinks, deal? 😉", "you're cute when you're confused", "just trust my lead, you'll figure it out"],
      confident: ["let me simplify it for you. here's the deal", "easy fix. let's look at the main point", "bottom line: here's what matters"]
    },
    neutral: {
      natural: ["yeah that makes sense honestly", "fair enough, what are you thinking next?", "gotcha, tell me more about that"],
      funny: ["bold move, let's see if it pays off 😂", "are you always this mysterious or just today?", "fascinating story, tell me more"],
      flirty: ["you're interesting, i'll give you that 😉", "careful, you're getting my full attention now", "i like where this is heading..."],
      confident: ["sounds good. let's make a move on it", "handled. what's your schedule look like this week?", "i'm down. let's make it happen"]
    },
    greeting: {
      natural: ["hey{n}! what are you up to today?", "hey stranger, how's your day going?", "yo, good timing. what's up?"],
      funny: ["look who decided to bless my notifications 😂", "well well, look who finally remembered i exist", "are you always this fashionably late to text?"],
      flirty: ["hey you 😉 was just thinking about you", "well hello... must be my lucky day", "finally texted me, took you long enough 😏"],
      confident: ["hey. let's catch up, what's your week looking like?", "hey, perfect timing. what are you getting into tonight?", "hey. let's skip the small talk, what's your vibe today?"]
    },
    farewell: {
      natural: ["talk soon{n}, have a great night!", "catch you later, take care!", "gn! chat tomorrow"],
      funny: ["don't do anything i wouldn't do 😂", "try not to dream about me too much", "bye, don't miss me too hard"],
      flirty: ["sweet dreams... try not to think about me too much 😉", "goodnight, talk to you first thing tomorrow", "dream of me 😏"],
      confident: ["goodnight. let's grab coffee this weekend", "take care. i'll hit you up tomorrow", "sleep well. talk soon"]
    },
    question: {
      natural: ["honestly yeah, what made you ask?", "good question, give me a sec to think", "depends on what you had in mind!"],
      funny: ["is this an interrogation? do i need my lawyer? 😂", "i'll tell you, but it's gonna cost you a coffee", "classified information, sorry 😉"],
      flirty: ["why so curious about me all of a sudden? 😉", "i'll tell you if you answer one of mine first", "ask me in person and maybe i'll tell you"],
      confident: ["simple answer: yes. now what's the plan?", "i've got the answer, but what do you think?", "let's discuss that over drinks thursday"]
    },
    request: {
      natural: ["yeah for sure, what's the details?", "definitely, happy to help out", "send it over, i'll check it out"],
      funny: ["what's in it for me? negotiate with me 😂", "only if it doesn't involve heavy lifting or math", "i'll do it, but you officially owe me"],
      flirty: ["say please and maybe i will 😉", "for you? i'll make an exception", "only if you promise to be nice to me this week"],
      confident: ["consider it done. send the details", "no problem, i'll take care of it", "i got you. don't worry about it"]
    }
  },
  banglish: {
    happy: {
      natural: ["Wow, khub bhalo laglo shunte! 😊 Ki korchish?", "Darun! Aro bolo!"],
      funny: ["Lottery jetechis naki? Party kobe? 😂", "Amar chara enjoy korchis, pap hobe!"],
      flirty: ["Tor hashi ta bhabtei amar bhalo lagche 😉", "Eto khushi keno? Amar kotha bhabchili naki?"],
      confident: ["Tui deserve koris etai. Enjoy kor.", "Just the beginning. Aro bhalo hobe."]
    },
    excited: {
      natural: ["Ki darun khobor! 🎉 Sob bolo!", "Osadharon! Onek onek congrats!"],
      funny: ["Shanto ho, nishash ne, tarpor bol 😂", "Party to bantai! Kothay jabi bol?"],
      flirty: ["Tor excitement ta khub cute lagche 😏", "Sathe thakle ekhuni celebrate kortam."],
      confident: ["I knew it! Tui chhere dewar patro nos.", "Perfect execution. Well done."]
    },
    sad: {
      natural: ["Shune kharap laglo. Bolte chaile ami achi 💛", "Mon kharap korish na, sob thik hoye jabe."],
      funny: ["Ke kadiyeche bol? Tar bari giye mara-mari korbo 😂", "Ice-cream khabi? Mon thik hoye jabe."],
      flirty: ["Istg samne thakle ekta tight hug ditam ekhon.", "Kivabe tor mon bhalo kora jay bol?"],
      confident: ["Tui strong, ei phase ta kete jabe. Focus thak.", "Take your time. Ami achi tor pase."]
    },
    angry: {
      natural: ["Rag hoyar motoi ghotona. Ki hoyeche bol?", "Bujhte parchi, shanto hoye bolo ki hoyeche."],
      funny: ["Ghore bose theke rag korish na, chal baire theke ghure ashi 😂", "Jel khate raji achi tor jonno, bol kake marte hobe."],
      flirty: ["Rege gele toke aro cute lage 😉", "Chere de ogulo, amar sathe kotha bol, bhalo lagbe."],
      confident: ["Don't react now. Cool down first.", "Oder ignore kor. Tui tor kaj e mon de."]
    },
    anxious: {
      natural: ["Chinta korish na, tui parbi! Ki niye tension?", "Ek ek kore dekhi, sob thik hoye jabe."],
      funny: ["Tension nite hobe na, ota ami korchi. Tui chill kor 😂", "Amar ashirbad tor sathe ache, parbi tui!"],
      flirty: ["Ami sathe thakte eto chinta kisher? 😉", "Ektu lomba nishash ne... ami achi to."],
      confident: ["You are ready. Overthink koris na.", "Tor theke onek tough situation geche. Eta parbi."]
    },
    love: {
      natural: ["Aww, khub misti! 💕", "Ami-o toke bhalobashi ❤️"],
      funny: ["Makhon lagano hocche naki? 😂", "Ei sob bole amar theke taka dhar chaibi naki?"],
      flirty: ["Aro bhalo kore bolte hobe... 😉", "Janis i to, tor jonno ami pagol."],
      confident: ["I know. Amaro same feelings.", "Thanks. Tui-o amar kache onek special."]
    },
    grateful: {
      natural: ["Kono byapar na! 😊", "Welcome! Aro dorkar hole bolish."],
      funny: ["Party te treat diyo kintu 😂", "Credit ta kintu pura amar, mone rakhish!"],
      flirty: ["Eto easily chhere debo na, next time kiss chai 😉", "Amar jonno anything for you."],
      confident: ["Of course. I got your back.", "No problem. Amader moddhe egulo lage na."]
    },
    apologetic: {
      natural: ["Kono problem nai! 😊", "Thik ache, tension nish na."],
      funny: ["Ek bar-er moton map korlam... next time kintu kotha shonabo 😂", "Sorry bolte hobe na, ek cup coffee khawabi."],
      flirty: ["Sorry te hobe na, map chaite hole dekha korte hobe 😉", "Toke to ami emni-i map kore dii."],
      confident: ["All good. Eta niye ar kotha bolar dorkar nei.", "It's fine. Move on kori amra."]
    },
    confused: {
      natural: ["Ami bujhiye bolchi. Kon ta bujhte parcho na?", "Tension nai, step by step dekhi."],
      funny: ["Amio kono matha-munda bujhchi na 😂", "Ami ki ei topic e kono degree niyechi naki?"],
      flirty: ["Etogulo kotha na bhebe amar sathe dekha kor, bujhiye debo 😉", "Boka boka kothabarta chara, tor aro bhalo kono plan ache?"],
      confident: ["Matter ta khub simple. Ami toke point wise bolchi.", "Don't overcomplicate. Eta evabe dekh."]
    },
    neutral: {
      natural: ["Achha, bujhlam. Tarpor?", "Thik ache, bolo."],
      funny: ["Oh achha... er theke exciting kono khobor nei? 😂", "Hmm, tarpor naki sob thik thak?"],
      flirty: ["Aro kichu bolar ache, naki ekhon amar pালা? 😉", "Toke kotha bolte dekhte amar bhalo lage."],
      confident: ["Got it. Next ki plan?", "Understood. Ami handle korchi eta."]
    },
    greeting: {
      natural: ["Hey! Kemon acho? 👋", "Hi! Ki khobor?"],
      funny: ["Bachte hole obhilombe text kor! Kemon achis? 😂", "Toke abar ke block theke unblock korlo?"],
      flirty: ["Tor kothai bhabchilam... ki korchis? 😉", "Eto miss korchis naki amake?"],
      confident: ["Hey. Ekhoni free holam. Bol.", "Hi. Shob thik ache?"]
    },
    farewell: {
      natural: ["Bye! Abar kotha hobe 👋", "Bhalo theko! Pore kotha hobe."],
      funny: ["Jaa baba, bacha geli amar theke ajker moto 😂", "Tata! Rasta cross korar shomoy phone ghaatish na!"],
      flirty: ["Swapne dekhbi amake, ready thakish 😉", "Miss korish, taratari phirbo."],
      confident: ["Take care. Kotha hocche pore.", "Catch you later. Good night."]
    },
    question: {
      natural: ["Bhalo proshno! Ektu details dao?", "Dekhchi, ar ektu bolo?"],
      funny: ["Googol kake bole janis to? Okhane search kor! 😂", "Amar theke eto asha korish na, amio jani na!"],
      flirty: ["Eto koutuhol keno amar bepare? 😉", "Bolbo... kintu ektu kachhe ashte hobe."],
      confident: ["I know exactly. Shon tahole.", "Eta khub simple, ami bolchi."]
    },
    request: {
      natural: ["Obosshoi! Ki lagbe bolo?", "Thik ache, ki korte hobe?"],
      funny: ["Etai baki chhilo tor theke asha korar! Ki chai bol 😂", "Free te noy kintu, treat baki thakbe."],
      flirty: ["Tor jonno ki na korte pari 😉 Bolo ki lagbe.", "Ki hobe er bodole? Ektu ador pabo?"],
      confident: ["Done. Tui details pathiye de.", "No tension. Ami kore dicchi."]
    }
  },
  hinglish: {
    happy: {
      natural: ["Arre waah, sunke achha laga! 😊 Aur batao?", "Sahi hai! Yeh toh badhiya khabar hai."],
      funny: ["Party kab hai phir? Kanjoosi mat karna 😂", "Aisa lag raha hai koi lottery lag gayi ho!"],
      flirty: ["Teri khushi dekh kar mujhe aur khushi hoti hai 😉", "Itni smile kyun aa rahi hai? Mere baare mein soch rahi thi?"],
      confident: ["You deserve it. Enjoy kar.", "Told you things would work out. Great job."]
    },
    excited: {
      natural: ["Kya baat hai! 🎉 Pura scene bata!", "Bohot sahi! Congratulations!"],
      funny: ["Thoda saans le, aur phir se theek se bata 😂", "Itni excitement mein phone mat gira dena."],
      flirty: ["Teri ye vibe bohot cute lag rahi hai aaj 😏", "Saath hote toh abhi celebrate karte."],
      confident: ["Maan gaya tujhe. Well done.", "I knew you could do it. Party on me."]
    },
    sad: {
      natural: ["Sunke bura laga. Kuch baat karni hai toh bata 💛", "Tension mat le, sab theek ho jayega."],
      funny: ["Bata kisne rulaya tujhe? Usko toh main abhi dekhta hoon 😂", "Rona band kar, chal momos khane chalte hain."],
      flirty: ["Kaash main paas hota toh ek tight hug de deta tujhe.", "Teri sad face achhi nahi lagti, smile kar de na yaar."],
      confident: ["Tough time hai, but tu isse nikal aayega. Focus on the good.", "I'm here for you. Tu akela nahi hai isme."]
    },
    angry: {
      natural: ["Gussa aana laazmi hai. Hua kya theek se bata?", "Shant ho ja thoda. Main samajh raha hoon."],
      funny: ["Ghar pe baith ke gussa mat kar, bahar chalte hain 😂", "Chal plan banate hain badla lene ka."],
      flirty: ["Gusse mein aur bhi cute lagti hai tu 😉", "Gussa chhod, mere baare mein soch, mood theek ho jayega."],
      confident: ["React mat kar abhi. Let it slide for now.", "Unko unki limit mein rakhna padega. Calm down first."]
    },
    anxious: {
      natural: ["Chinta mat kar, tu kar lega! Kya baat ki tension hai?", "Aaram se, step by step sochte hain isko."],
      funny: ["Tension lene ka nahi, dene ka! Chill kar thoda 😂", "Darr ke aage jeet hai, aur Mountain Dew mere paas hai nahi."],
      flirty: ["Main hoon na, toh itni tension kis baat ki? 😉", "Gahri saans le, sab perfectly theek ho jayega."],
      confident: ["You are well prepared. Overthink karna band kar.", "Tujhse zyada aasan kisike liye nahi hoga ye. Go for it."]
    },
    love: {
      natural: ["Aww, so sweet! 💕", "I love you too ❤️"],
      funny: ["Makkhan kyu laga raha hai? Kuch chahiye kya? 😂", "Arey itna pyaar? Kahan se aa raha hai aaj?"],
      flirty: ["Thoda aur tareef kar do, bura nahi manungi 😉", "Mujhe pata hai main bohot awesome hoon. Tu bhi theek-thak hai."],
      confident: ["I know. Feeling is mutual.", "Thank you. You mean a lot to me too."]
    },
    grateful: {
      natural: ["Koyi baat nahi! 😊", "Welcome! Aur kuch chahiye toh bolna."],
      funny: ["Bhai free mein nahi kiya, treat chahiye mujhe 😂", "Credit pura mera hai, yaad rakhna!"],
      flirty: ["Bas thank you se kaam nahi chalega, milna padega 😉", "Tere liye kuch bhi. Anytime."],
      confident: ["Of course. I’ve always got your back.", "No problem. Dosti mein no sorry no thank you."]
    },
    apologetic: {
      natural: ["Koyi problem nahi! 😊", "Theek hai, tension mat le is baat ki."],
      funny: ["Chal is baar maaf kiya, par agli baar kharcha tera hoga 😂", "Sorry bolne ki zaroorat nahi hai, coffee pila de bas."],
      flirty: ["Maaf toh kar dunga, par tujhe mere saath date par chalna padega 😉", "Tujhe toh aise hi maaf kar deta main."],
      confident: ["All good. Bhool ja isko ab.", "It's fine. Let's move on."]
    },
    confused: {
      natural: ["Main theek se samjhata hoon. Kahan problem hai?", "Tension nahi, aaram se ek ek kar ke samjhte hain."],
      funny: ["Main khud confuse hoon bhai, mujhe kyu pooch raha hai 😂", "Dimag lagana mera kaam nahi hai."],
      flirty: ["Itna mat soch, mujh par dhyaan de 😉", "Dimaag kharab karne ke alawa koi aur plan hai aaj ka?"],
      confident: ["Matter simple hai. Main batata hoon kya karna hai.", "Overcomplicate mat kar. Point pe aate hain."]
    },
    neutral: {
      natural: ["Achha, samjha. Phir?", "Theek hai, aage batao."],
      funny: ["Aur bata? Sab badhiya naki sirf kat rahi hai? 😂", "Bhai isse zyada boring baat nahi ho sakti thi."],
      flirty: ["Aur bata, mere alawa aur kis kis ka dil tod rahi hai? 😉", "Teri baatein sunne mein maza aata hai."],
      confident: ["Got it. Next plan of action kya hai?", "Understood. Main sambhal lunga."]
    },
    greeting: {
      natural: ["Hey! Kya haal? 👋", "Hi! Kaisa chal raha hai sab?"],
      funny: ["Zinda hai tu? Acha laga sun ke! 😂", "Bhoot toh nahi text kar raha mujhe?"],
      flirty: ["Tere hi baare mein soch raha tha... kya chal raha hai? 😉", "Tumhara text dekh ke hi din ban gaya."],
      confident: ["Hey. Main free hoon abhi. Bol kya baat karni thi.", "Hi. Sab set?"]
    },
    farewell: {
      natural: ["Bye! Baad mein baat karte hain 👋", "Dhyaan rakhna! Catch you later."],
      funny: ["Jaa bhai, meri bhi thodi shanti milegi 😂", "Tata! Raste par deewar se mat takra jana!"],
      flirty: ["Sapne mein milunga, ready rehna 😉", "Miss karna mujhe. Kal baat hogi."],
      confident: ["Take care. Will catch up later.", "Good night. Kal milte hain."]
    },
    question: {
      natural: ["Sahi sawal! Thoda aur detail de?", "Main batata hoon, par pehle tu thoda clarify kar?"],
      funny: ["Bhai Google kar le na, mujhe kyu tang kar raha hai? 😂", "Main astrologer thodi na hoon!"],
      flirty: ["Itni curious kyu ho rahi hai mere baare mein? 😉", "Kuch raaz ki baat hai... milogi tab bataunga."],
      confident: ["Iska answer bohot simple hai. Sun.", "Mujhe pata hai exactly kya karna hai."]
    },
    request: {
      natural: ["Bilkul! Kya chahiye batao?", "Theek hai, kya karna hai?"],
      funny: ["Is kaam ke liye main 500 rupaye lunga! 😂", "Mera kya fayda isme?"],
      flirty: ["Tere liye toh kuch bhi 😉 Bata kya laau.", "Pyaar se bolegi toh sab laa dunga."],
      confident: ["Done. Tu detail bhej main kar deta hoon.", "No tension. Ho jayega."]
    }
  }
};

// ---------- 5. Smart Reply generation ----------
function pick(list, last, seed) {
  const pool = list.filter((r) => r !== last);
  const arr = pool.length ? pool : list;
  return arr[Math.floor((seed ?? Math.random()) * arr.length) % arr.length];
}

export function generateReply(text, opts = {}) {
  const msg = String(text || "").trim();
  if (!msg) {
    return {
      tone: "neutral", confidence: 0, intent: "statement", lang: "en",
      natural: "", funny: "", flirty: "", confident: "",
      candidates: [], scores: {}
    };
  }

  const { tone, confidence, scores } = detectTone(msg);
  const intent = detectIntent(msg);
  const lang = detectLang(msg);
  const n = opts.name ? `, ${opts.name}` : "";

  // Strong emotion beats intent; otherwise greeting/farewell/question/request drive the reply
  const useIntent = intent !== "statement" && (tone === "neutral" || intent === "greeting" || intent === "farewell");
  const bank = useIntent ? T[lang][intent] : T[lang][tone];

  const fill = (s) => s.replace("{n}", n);

  const lastText = opts.last ? opts.last.replace(n, "") : null;
  const seed = opts.seed ?? Math.random();

  const getVariant = (style) => {
    return fill(pick(bank[style] || bank["natural"], lastText, seed));
  };

  const natural = getVariant("natural");
  const funny = getVariant("funny");
  const flirty = getVariant("flirty");
  const confident = getVariant("confident");

  const candidates = [
    { id: '1', body: natural, style: 'Natural' },
    { id: '2', body: funny, style: 'Funny' },
    { id: '3', body: flirty, style: 'Flirty' },
    { id: '4', body: confident, style: 'Confident' }
  ];

  return { tone, confidence, intent, lang, natural, funny, flirty, confident, candidates, scores };
}

export default generateReply;
