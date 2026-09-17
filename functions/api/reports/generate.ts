// POST /api/reports/generate — Conversation Diagnostic Report
import { Env } from '../_middleware';
import { callAIModel, AIMessage, AIProvider } from '../_aiHelper';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as any;
    const { messages = [], conversation_topic = '', provider = 'auto' } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Please provide conversation messages context.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const conversationTranscript = messages
      .map((m: any) => `${m.sender === 'me' ? 'User' : 'Other person'}: ${m.body}`)
      .join('\n');

    const systemPrompt = `You are VoiCe's senior conversational psychologist. Generate an insightful, evidence-oriented diagnostic report of the chat thread.

CRITICAL RULES:
1. DISTINGUISH FACTS FROM INFERENCES: Clearly separate observed message evidence from your psychological interpretation. Never claim certainty about another person's true inner feelings or intent.
2. CONSTRUCTIVE & ACTIONABLE: Provide practical, nuanced guidance on how the user can impress the other person and sustain mutual interest.
3. CONVERSATION REPORT SCHEMA:
Return JSON ONLY (no markdown formatting, no code block backticks):
{
  "score": number, // Composite momentum/vibe score from 1.0 to 10.0
  "flow_arc": string, // e.g. "Opener → Casual Banter → Mutual Teasing → Schedule Coordination"
  "observable_cues": string[], // Short tags like ["warm reciprocity", "unprompted questions"]
  "strong_signals": [
    {
      "signal": string,
      "evidence": string,
      "meaning": string
    }
  ],
  "red_flags": [
    {
      "flag": string,
      "evidence": string,
      "confidence": "High" | "Medium" | "Low",
      "risk": string
    }
  ],
  "how_to_impress": {
    "key_interest": string,
    "advice": string,
    "recommended_approach": string
  },
  "pro_tips": string[],
  "suggested_next_moves": string[]
}`;

    const userMessages: AIMessage[] = [
      {
        role: 'user',
        content: `Here is the conversation transcript:\n${conversationTranscript}\n\nGenerate the complete diagnostic report.`,
      },
    ];

    const aiRes = await callAIModel(env, systemPrompt, userMessages, { provider: provider as AIProvider, maxTokens: 1200 });
    const cleaned = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify({ success: true, data: parsed, modelUsed: aiRes.modelUsed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Report error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to generate report.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
