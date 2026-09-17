// POST /api/rizz/generate — Smart Human Reply Generation
import { Env } from '../_middleware';
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
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Please provide conversation messages context.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const conversationTranscript = messages
      .map((m: any) => `${m.sender === 'me' ? 'User' : 'Other person'}: ${m.body}`)
      .join('\n');

    const systemPrompt = `You are VoiCe, a master of modern human texting. You write replies that sound like a real, charismatic, confident person—NEVER an AI brochure.

MANDATORY RULES:
1. BREVITY IS KING: Each reply must be 1 to 2 short sentences maximum. No paragraphs. No oversharing.
2. ZERO AI CLICHÉS: Never use phrases like "I would love to", "That sounds delightful", "I'm down for whatever", "Certainly!", or robotic pleasantries.
3. SOUND AUTHENTIC: Use natural conversational rhythms, situational wit, and appropriate punctuation (occasional lowercase, natural emoji usage if tone fits).
4. DIVERSITY: Provide 3 to 5 distinct options that approach the reply from different angles (e.g. playful challenge, direct response, subtle tease, relaxed acknowledgment).
5. TONE & DELIVERY:
   - Selected Tone: ${tone}
   - Delivery Nuance: ${delivery}
   - Intensity (1-10): ${intensity}/10 (higher intensity = bolder/sharper; lower = chill/understated)
   - User Intent: ${intent}
${custom_instruction ? `   - User Custom Directive: ${custom_instruction}` : ''}

You must return a valid JSON object ONLY (no markdown formatting, no code block backticks) matching this exact schema:
{
  "candidates": [
    { "id": "1", "body": string, "style": string }
  ]
}`;

    const userMessages: AIMessage[] = [
      {
        role: 'user',
        content: `Here is the conversation so far:\n${conversationTranscript}\n\nGenerate 4 short, human replies for me to send next.`,
      },
    ];

    const aiRes = await callAIModel(env, systemPrompt, userMessages, { provider: provider as AIProvider, maxTokens: 800 });
    const cleaned = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify({ success: true, data: parsed, modelUsed: aiRes.modelUsed }), {
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
