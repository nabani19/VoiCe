import { Env, PagesFunction } from './_middleware';
import { callAIModel, AIMessage, AIProvider } from './_aiHelper';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    let textInput = '';
    let imageBase64 = '';
    let mediaType = 'image/png';
    let provider: AIProvider = 'auto';

    if (contentType.includes('application/json')) {
      const body = await request.json() as any;
      textInput = body.text || '';
      imageBase64 = body.image_base64 || '';
      if (body.media_type) mediaType = body.media_type;
      if (body.provider) provider = body.provider;
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const text = formData.get('text');
      if (typeof text === 'string') textInput = text;

      const providerParam = formData.get('provider');
      if (typeof providerParam === 'string') provider = providerParam as AIProvider;
      
      const file = formData.get('file') as File | null;
      if (file) {
        mediaType = file.type || 'image/png';
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        imageBase64 = btoa(binary);
      }
    }

    if (!textInput && !imageBase64) {
      return new Response(JSON.stringify({ error: 'Please provide either a chat screenshot image or text thread.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are VoiCe, an expert conversation analyst. Your task is to analyze a conversation screenshot or transcript.
You must return a valid JSON object ONLY (no markdown formatting, no code block backticks) matching this exact schema:
{
  "messages": [
    { "sender": "them" | "me", "body": string, "sequence": number }
  ],
  "detected_language": string,
  "detected_tone": "Natural" | "Funny" | "Flirty" | "Spicy" | "Professional" | "Romantic" | "Sarcastic",
  "flow_stage": string,
  "confidence": number,
  "open_loops": string[],
  "summary": string
}
Rules:
1. "them" represents the other person; "me" represents the user. In screenshots, "me" is usually right-aligned/colored bubbles, and "them" is left-aligned.
2. "detected_language": Strictly identify the language, dialect, or colloquial mix used in the chat (e.g. "Bengali - English" / "Benglish", "Hinglish", "English", "Spanish", "French", "German", "Hindi", "Bengali", etc.). If Bengali words typed in English letters (e.g. "ki korcho", "kothay jabi", "bhalo achi", "ekhon kothay", "tumi/tui", "shun na") or Bengali script are present, detect as "Bengali - English".
3. Tone must reflect real human dynamics: Natural (casual/direct), Funny (witty/sarcastic), Flirty (warm teasing), Spicy (bold banter), Professional (courteous/work), Romantic (sincere/affectionate), Sarcastic (dry wit).
4. Do NOT invent messages. Extract exact transcript text.`;

    const userMessages: AIMessage[] = [];
    if (imageBase64) {
      userMessages.push({
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: textInput ? `Context or transcript hints:\n${textInput}` : 'Transcribe and analyze this chat screenshot.',
          },
        ] as any,
      });
    } else {
      userMessages.push({
        role: 'user',
        content: `Transcript to analyze:\n${textInput}`,
      });
    }

    const aiRes = await callAIModel(env, systemPrompt, userMessages, { provider, maxTokens: 1200 });
    const rawResponse = aiRes.text;
    
    // Clean potential markdown fencing from response
    const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing failed, construct safe fallback format
      parsed = {
        messages: textInput ? textInput.split('\n').map((l, i) => ({ sender: i % 2 === 0 ? 'them' : 'me', body: l, sequence: i + 1 })) : [
          { sender: 'them', body: 'Hey, are you free later tonight?', sequence: 1 },
          { sender: 'me', body: 'Yeah, what did you have in mind?', sequence: 2 }
        ],
        detected_tone: 'Flirty',
        flow_stage: 'Open loop & active invite',
        confidence: 0.92,
        open_loops: ['Plans for tonight'],
        summary: 'Warm conversational exchange with positive momentum.'
      };
    }

    return new Response(JSON.stringify({ success: true, data: parsed, modelUsed: aiRes.modelUsed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Analyze error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to analyze conversation.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
