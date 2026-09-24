// POST /api/rizz/improve — "Make this reply better" Quick Transforms
import { Env, PagesFunction } from '../_middleware';
import { callAIModel, AIMessage, AIProvider } from '../_aiHelper';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as any;
    const {
      candidate_text = '',
      transformation = 'wittier',
      conversation_context = '',
      provider = 'auto',
    } = body;

    if (!candidate_text) {
      return new Response(JSON.stringify({ error: 'candidate_text is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const transformGuide: Record<string, string> = {
      shorter: 'Strip it down to the sharpest 3-6 words. Every word must earn its place. If removing a word makes it punchier, remove it.',
      funnier: 'Inject dry irony, absurdist logic, or a surprise flip in the last word. Make it sound like a roast, not a joke. The setup should pay off.',
      warmer: 'Add subtle human warmth WITHOUT being corny or desperate. Think: mildly amused friend, not Hallmark card.',
      'more chill': 'Kill any urgency or try-hard energy. Sound like you typed it without putting your beer down. Lower investment, higher mystery.',
      wittier: 'Find the unexpected angle. Subvert what they expect the reply to be. One sharp clever turn beats five attempts at funny.',
      spicier: 'Raise romantic tension with implication, not explicitness. The unsaid is sexier than the said. Push-pull harder.',
      'less aggressive': 'Keep the edge but sand down anything that reads as rude, defensive, or needy. Confident disinterest, not hostility.',
    };

    const guide = transformGuide[transformation] || `Apply "${transformation}" transformation thoughtfully.`;

    const systemPrompt = `You are PLUG AI's reply surgeon. One job: take a good reply and make it dangerous.

TRANSFORMATION: "${transformation}"
DIRECTIVE: ${guide}

ABSOLUTE LAWS:
- Stay 1-2 short sentences max. Shorter is almost always better.
- Sound 100% human. If it reads like AI wrote it, you failed.
- NEVER add: "haha yeah", "that's so true", "omg", "wow", "cool", filler, or padding.
- NEVER start with "I", "That", "So", "Oh", "Well", "Honestly", "Haha".
- Max 1 emoji — only 😏 💀 😂 👀 🚩 are permitted.
- The revised reply must be noticeably BETTER than the original or you have failed.

EXAMPLES OF GOOD TRANSFORMATIONS:
Original: "yeah sounds fun, count me in"
→ shorter: "sold, when"
→ funnier: "fine but I'm blaming you if this is terrible 😂"
→ wittier: "risky move trusting me to be fun"
→ more chill: "maybe. depends what we're walking into"
→ spicier: "only if you're as interesting as your texts suggest 😏"

Return ONLY valid JSON (no markdown, no backticks):
{
  "thought_process": "one sentence: what needed fixing and how you fixed it",
  "revised_text": "the improved reply",
  "explanation": "why this version is sharper"
}`;

    const userMessages: AIMessage[] = [
      {
        role: 'user',
        content: `${conversation_context ? `Conversation context:\n${conversation_context}\n\n` : ''}Original reply to improve: "${candidate_text}"\nTransformation: ${transformation}\n\nMake it better. Be ruthless.`,
      },
    ];

    const aiRes = await callAIModel(env, systemPrompt, userMessages, {
      provider: provider as AIProvider,
      maxTokens: 400,
      temperature: 0.9,
    });

    const cleaned = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify({ success: true, data: parsed, modelUsed: aiRes.modelUsed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Improve error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to improve reply.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
