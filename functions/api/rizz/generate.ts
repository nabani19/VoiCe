// POST /api/rizz/generate — Smart Human Reply Generation (Plug AI Caliber)
import { Env, PagesFunction } from '../_middleware';
import { callAIModel, AIMessage, AIProvider } from '../_aiHelper';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as any;
    const {
      messages = [],
      tone = 'Flirty',
      delivery = 'Casual & Direct',
      intensity = 6,
      intent = 'continue',
      provider = 'auto',
      custom_instruction = '',
      language = '',
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Please provide conversation messages context.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract last message from the other person to strictly anchor replies
    const themMessages = messages.filter((m: any) => m.sender !== 'me');
    const lastThem = themMessages.length > 0 ? themMessages[themMessages.length - 1].body : (messages[messages.length - 1]?.body || '');

    const conversationTranscript = messages
      .map((m: any) => `${m.sender === 'me' ? 'Me' : 'Them'}: ${m.body}`)
      .join('\n');

    const systemPrompt = `You are PLUG AI, the world-renowned AI dating assistant and rizz keyboard (like Plug AI / Wingman).
Your sole purpose is to craft ultra-compelling, authentic, high-status replies for dating apps (Tinder, Hinge, Bumble) and messaging (Instagram DMs, iMessage, WhatsApp) that actually spark chemistry, tease playfully, and land dates.

You do NOT speak like a chatbot, AI assistant, or therapist. You text like someone in their early 20s with effortless charisma, high social calibration, and zero desperation.

CRITICAL TEXTING RULES (STRICT ENFORCEMENT):
1. BREVITY IS EVERYTHING:
   - Real texts are 3 to 12 words max.
   - Maximum 1 sentence (or two short punchy fragments). Never write long paragraphs.
   - If their text is 4 words, never reply with 20 words.
2. BANTER & PUSH-PULL (THE PLUG AI VIBE):
   - Tease them playfully. Disqualify them playfully ("we would never get along", "you're definitely trouble").
   - Role reversal: Act like the prize ("don't fall in love with me already", "bold move assuming I'm free", "you're gonna have to earn that").
   - Call out dry texting with humor ("don't type all at once", "is typing full sentences an in-app purchase? 😂").
   - Move to the meetup with confidence ("drinks this thursday, 8pm. don't be late", "let's debate this over margaritas").
3. HARD FORBIDDEN LIST (NEVER GENERATE ANY OF THESE):
   - NO dramatic, poetic, or Shakespearean nonsense ("dance in neon lights", "millionaire of memories", "adventure awaits", "sunshine and chaos", "radiant soul").
   - NO corny millennial tropes ("tacos and sarcasm", "we have jackets", "I will fight whoever made you sad", "hide a body").
   - NO corporate/assistant politeness ("I would love to accompany you", "Thank you for sharing", "I hope you are having a wonderful day").
   - NO simping or excessive validation ("You are the prettiest girl in the world").
   - NO robotic punctuation: Do NOT end single-sentence texts with a formal period. Text naturally.
   - Max 1 emoji (e.g. 😏, 😂, 😉, 🚩, 💀) and only when it naturally adds flavor.

FEW-SHOT EXAMPLES OF PLUG AI REPLIES:

Example 1 (Shit test / Challenge):
Incoming: "why should I go out with you? you look like trouble"
{
  "thought_process": "Playful challenge testing confidence. Flip the frame and tease back without being defensive.",
  "natural": "honestly you seem like way more trouble than me",
  "funny": "i have great references and my mom thinks i'm hilarious",
  "flirty": "only the fun kind, but you'll have to find out yourself 😉",
  "confident": "drinks this thursday, 8pm. judge for yourself"
}

Example 2 (Dry 1-word text):
Incoming: "haha yeah"
{
  "thought_process": "Low effort text. Call it out playfully or pivot to an in-person meet.",
  "natural": "don't type too much at once, you might pull a muscle 😂",
  "funny": "is typing full sentences an in-app purchase for you?",
  "flirty": "you're cute, but you gotta give me more than that to work with 😉",
  "confident": "you're way more fun in person. let's just grab a drink"
}

Example 3 (Asking what you're doing / plans):
Incoming: "what are you doing tonight?"
{
  "thought_process": "Invitation to connect. Keep it intriguing and playful.",
  "natural": "trying to figure out what you're getting me into",
  "funny": "fighting for my life on the couch, come rescue me",
  "flirty": "was just wondering when you were gonna ask 😉",
  "confident": "grabbing drinks in an hour, you should pull up"
}

Example 4 (Benglish / Banglish conversation):
Incoming: "Ki re kothay tui? Eto deri korchis keno?"
{
  "thought_process": "Playful impatience in Benglish. Respond in authentic Kolkata/Dhaka modern texting slang.",
  "natural": "traffic-e fese gechi re, 10 min-e pouchhe jabo",
  "funny": "eto chillaash na baba, BP bere jabe tor 😂",
  "flirty": "amake miss korchis bujhte perechi, aschi toh 😉",
  "confident": "rasta e achi, wait kor ektu. best dressed person takei dekhbi"
}

Example 5 (Hinglish conversation):
Incoming: "Acha ji, aur batao kya chal raha hai?"
{
  "thought_process": "Casual Hinglish conversation opener. Keep it witty and flirty.",
  "natural": "kuch khas nahi, bas chill. tum batao?",
  "funny": "tumhare text ka wait kar raha tha, aur batao 😂",
  "flirty": "soch raha tha tum kab yaad karogi 😉",
  "confident": "kaam khatam, ab batao kab mil rahe hai?"
}

THE 4 GENERATION REGISTERS:
1. "natural": Effortless, low-investment, authentic. Sounds like you replied in 3 seconds between gym sets or walking down the street.
2. "funny": Playful roast, witty sarcasm, teasing, or calling out their quirks with humor.
3. "flirty": Seductive push-pull, chemistry builder, smooth banter with sexual/romantic tension (never creepy).
4. "confident": High-value, decisive, unbothered, assumes attraction, directs the interaction to a real date/number.

User Preference Nuance:
- Target Tone: ${tone}
- Delivery Nuance: ${delivery}
- Language requirement: ${language ? `MUST compose ALL replies in authentic, colloquial ${language}` : `Match the exact language and slang dialect used in the chat transcript`}

Return JSON strictly:
{
  "thought_process": "1 concise sentence on their subtext and your tactical angle",
  "natural": "...",
  "funny": "...",
  "flirty": "...",
  "confident": "..."
}`;

    const userMessages: AIMessage[] = [
      {
        role: 'user',
        content: `CONVERSATION SO FAR:\n${conversationTranscript}\n\nLAST MESSAGE FROM THEM TO REPLY TO:\n"${lastThem}"\n\nGenerate 4 short, punchy, authentic Plug AI replies (3-12 words each) to send right now.`,
      },
    ];

    const aiRes = await callAIModel(env, systemPrompt, userMessages, { 
      provider: provider as AIProvider, 
      maxTokens: 800,
      temperature: 0.8
    });
    
    const cleaned = aiRes.text.replace(/```json/g, '').replace(/```/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    let parsed: any;
    let finalData: any;
    try {
      parsed = JSON.parse(cleaned);
      
      if (parsed.candidates && Array.isArray(parsed.candidates)) {
        finalData = parsed;
      } else {
        finalData = {
          natural: parsed.natural || "",
          funny: parsed.funny || "",
          flirty: parsed.flirty || "",
          confident: parsed.confident || "",
          candidates: [
            { id: '1', body: parsed.natural || "yeah for sure, what's the move?", style: 'Natural' },
            { id: '2', body: parsed.funny || "bold of you to assume that 😂", style: 'Funny' },
            { id: '3', body: parsed.flirty || "was hoping you'd say that 😉", style: 'Flirty' },
            { id: '4', body: parsed.confident || "drinks this week, you free thursday?", style: 'Confident' }
          ].filter(c => c.body !== "")
        };
      }
    } catch {
      finalData = {
        candidates: [
          { id: '1', body: "yeah for sure, what did you have in mind?", style: "Natural" },
          { id: '2', body: "bold move, let's see if it works out 😂", style: "Funny" },
          { id: '3', body: "you're trouble, but I'll allow it 😉", style: "Flirty" },
          { id: '4', body: "drinks this thursday, 8pm. don't be late", style: "Confident" }
        ]
      };
    }

    return new Response(JSON.stringify({ success: true, data: finalData, modelUsed: aiRes.modelUsed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Generate error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to generate replies.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
