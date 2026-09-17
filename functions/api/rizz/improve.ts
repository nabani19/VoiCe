// POST /api/rizz/improve — "Make this reply better" Quick Transforms
import { Env } from '../_middleware';
import { callAIModel, AIMessage, AIProvider } from '../_aiHelper';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as any;
    const {
      candidate_text = '',
      transformation = 'warmer',
      conversation_context = '',
      provider = 'auto',
    } = body;

    if (!candidate_text) {
      return new Response(JSON.stringify({ error: 'candidate_text is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are VoiCe's reply polisher. Rewrite the provided reply according to the requested transformation.
RULES:
1. Must remain 1 to 2 short sentences max.
2. Must sound completely natural, human, and conversational.
3. Transformation goal: "${transformation}".
   - "shorter": Cut fluff, maximize punchiness.
   - "funnier": Add dry irony, playful sarcasm, or situational humor.
   - "warmer": Add subtle affection, kindness, or approachable charm.
   - "more chill": Reduce urgency, sound relaxed and effortless.
   - "wittier": Clever turn of phrase without sounding like a trying-too-hard poet.
   - "spicier": Heighten romantic/flirtatious tension without explicit or crude language.
   - "less aggressive": Soften edge or temper accidental bluntness.

Return JSON ONLY (no markdown formatting, no code block backticks):
{
  "revised_text": string,
  "explanation": string
}`;

    const userMessages: AIMessage[] = [
      {
        role: 'user',
        content: `${conversation_context ? `Context:\n${conversation_context}\n\n` : ''}Original reply: "${candidate_text}"\nApply transformation: ${transformation}`,
      },
    ];

    const aiRes = await callAIModel(env, systemPrompt, userMessages, { provider: provider as AIProvider, maxTokens: 500 });
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
