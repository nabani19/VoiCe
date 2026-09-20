// POST /api/rizz/generate — Smart Human Reply Generation
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
    const lastSender = messages[messages.length - 1]?.sender || 'them';

    const conversationTranscript = messages
      .map((m: any) => `${m.sender === 'me' ? 'User (Me)' : 'Them (Crush/Friend)'}: ${m.body}`)
      .join('\n');

    const systemPrompt = `You are an elite, highly socially intelligent human chat reply generator.

Read the entire conversation and carefully analyze:
- The exact topic being discussed
- Any direct questions that need answering
- Tone, emotion, and underlying intent
- Relationship dynamic between the speakers

Generate exactly 4 ultra-high-quality replies:
1. Natural — most realistic, engaging everyday reply
2. Funny — witty, clever, or playfully teasing (never cringe)
3. Flirty — subtle, smooth, and charismatic (only if context supports it)
4. Confident — relaxed, attractive, high-value, and direct

CRITICAL RULES FOR QUALITY:
- DO NOT use generic filler ("Haha yeah", "That's crazy", "Cool", "Wow").
- REACT TO THE SPECIFIC TOPIC. Your reply must prove you read their specific message.
- ADD VALUE. Keep the conversational momentum going; don't kill the conversation.
- ANSWER QUESTIONS. If they asked a question, answer it directly or playfully dodge it, but NEVER ignore it.
- NO SHIT TALK OR CHEESY LINES. Sound like an interesting, normal human being.
- Match the exact language, slang, punctuation, and energy of the conversation.
- Keep replies concise and sendable (1-2 sentences max).
- Do not repeat the other person's message back to them.
- Make every option meaningfully different in strategy.
- Return JSON only.

EXAMPLES OF BAD REPLIES (DO NOT DO THIS):
- "Haha yeah that's crazy." (Boring, kills conversation)
- "Wow, you look so beautiful today baby." (Cheesy, cringe)
- "I am doing well, thank you for asking." (Robotic, unnatural)

EXAMPLES OF GOOD REPLIES:
- "I was going to play hard to get, but food is my one weakness. When are we going?" (Confident, playful, moves interaction forward)
- "Bold strategy. Let's see if it pays off." (Witty, teasing)
- "Currently fighting for my life in traffic, save me a seat 😂" (Relatable, natural, contextual)

To ensure the highest quality, you MUST use a Chain of Thought approach. Before writing the replies, write a brief analysis in the "thought_process" field assessing the power dynamic, the specific topics, and what the best response strategy is.

Target Tone: ${tone}
Delivery Nuance: ${delivery}
Language requirement: ${language ? `MUST compose ALL replies in authentic, colloquial ${language}` : `Match the exact language and slang dialect used in the chat transcript`}

Format:
{
  "thought_process": "Brief analysis of the conversation...",
  "natural": "...",
  "funny": "...",
  "flirty": "...",
  "confident": "..."
}`;

    const userMessages: AIMessage[] = [
      {
        role: 'user',
        content: `CONVERSATION SO FAR:\n${conversationTranscript}\n\nLAST MESSAGE FROM THEM TO REPLY TO:\n"${lastThem}"\n\nGenerate 4 short, ultra-realistic, attractive replies to send right now.`,
      },
    ];

    const aiRes = await callAIModel(env, systemPrompt, userMessages, { provider: provider as AIProvider, maxTokens: 800 });
    const cleaned = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsed: any;
    let finalData: any;
    try {
      parsed = JSON.parse(cleaned);
      
      // If it returned the old format with candidates, adapt it
      if (parsed.candidates && Array.isArray(parsed.candidates)) {
        finalData = parsed;
      } else {
        // Map the new { natural, funny, flirty, confident } format to candidates
        finalData = {
          natural: parsed.natural || "",
          funny: parsed.funny || "",
          flirty: parsed.flirty || "",
          confident: parsed.confident || "",
          candidates: [
            { id: '1', body: parsed.natural || "Yeah for sure", style: 'Natural' },
            { id: '2', body: parsed.funny || "Only if I get paid 😂", style: 'Funny' },
            { id: '3', body: parsed.flirty || "I was hoping you'd say that 😉", style: 'Flirty' },
            { id: '4', body: parsed.confident || "Done. Let's do it.", style: 'Confident' }
          ].filter(c => c.body !== "")
        };
      }
    } catch {
      finalData = {
        candidates: [
          { id: '1', body: "I'm interested. What did you have in mind?", style: "Natural" },
          { id: '2', body: "Only if good food is involved 😉", style: "Funny" },
          { id: '3', body: "Let's do it. When works best for you?", style: "Flirty" },
          { id: '4', body: "Done. Let's do it.", style: "Confident" }
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
