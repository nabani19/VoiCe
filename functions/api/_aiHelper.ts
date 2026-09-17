// Server-side Multi-Model AI Router for Cloudflare Pages Functions
// Supports Anthropic Claude 3.5 Sonnet, OpenAI ChatGPT-4o, and Google Gemini 1.5 with OpenRouter fallback.
// Strictly server-side execution — ZERO client-exposed keys.

import { Env } from './_middleware';

export type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'auto';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }>;
}

export async function callAIModel(
  env: Env,
  systemPrompt: string,
  messages: AIMessage[],
  options: {
    provider?: AIProvider;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<{ text: string; modelUsed: string }> {
  const provider = options.provider || 'auto';
  const maxTokens = options.maxTokens || 1000;
  const temperature = options.temperature || 0.7;

  const anthropicKey = env.ANTHROPIC_API_KEY || (typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY : '');
  const openAiKey = env.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : '');
  const geminiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  const openRouterKey = env.OPENROUTER_API_KEY || (typeof process !== 'undefined' ? process.env.OPENROUTER_API_KEY : '');

  // --------------------------------------------------------------------------
  // 1. Direct Google Gemini Route (if selected or auto)
  // --------------------------------------------------------------------------
  if ((provider === 'gemini') && geminiKey) {
    try {
      const contents = messages.map((m) => {
        if (typeof m.content === 'string') {
          return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
        }
        const textParts = m.content.filter((c: any) => c.type === 'text').map((c: any) => ({ text: c.text }));
        const imgPart = m.content.find((c: any) => c.type === 'image');
        const parts: any[] = [...textParts];
        if (imgPart?.source) {
          parts.push({
            inline_data: {
              mime_type: imgPart.source.media_type,
              data: imgPart.source.data,
            },
          });
        }
        return { role: 'user', parts };
      });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { maxOutputTokens: maxTokens, temperature },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json() as any;
        const outText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (outText) return { text: outText, modelUsed: 'gemini-1.5-flash' };
      }
    } catch (err) {
      console.error('Gemini direct failed, falling back:', err);
    }
  }

  // --------------------------------------------------------------------------
  // 2. Direct OpenAI ChatGPT Route (if selected or auto)
  // --------------------------------------------------------------------------
  if ((provider === 'chatgpt') && openAiKey && openAiKey.startsWith('sk-')) {
    try {
      const formatted = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => {
          if (typeof m.content === 'string') return { role: m.role, content: m.content };
          const textPart = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
          const imgPart = m.content.find((c: any) => c.type === 'image');
          if (imgPart?.source) {
            return {
              role: m.role,
              content: [
                { type: 'text', text: textPart || 'Analyze this screenshot.' },
                {
                  type: 'image_url',
                  image_url: { url: `data:${imgPart.source.media_type};base64,${imgPart.source.data}` },
                },
              ],
            };
          }
          return { role: m.role, content: textPart };
        }),
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: formatted,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (res.ok) {
        const data = await res.json() as any;
        const outText = data.choices?.[0]?.message?.content;
        if (outText) return { text: outText, modelUsed: 'gpt-4o' };
      }
    } catch (err) {
      console.error('OpenAI direct failed, falling back:', err);
    }
  }

  // --------------------------------------------------------------------------
  // 3. Direct Anthropic Claude Route (if selected or auto)
  // --------------------------------------------------------------------------
  if ((provider === 'claude' || provider === 'auto') && anthropicKey && anthropicKey.startsWith('sk-ant')) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages.filter((m) => m.role !== 'system'),
        }),
      });

      if (res.ok) {
        const data = await res.json() as any;
        const textBlock = data.content?.find((c: any) => c.type === 'text');
        if (textBlock?.text) return { text: textBlock.text, modelUsed: 'claude-3-5-sonnet' };
      }
    } catch (err) {
      console.error('Anthropic API failed, falling back to OpenRouter:', err);
    }
  }

  // --------------------------------------------------------------------------
  // 4. OpenRouter Multi-Model Router (Supports Claude, ChatGPT, and Gemini)
  // --------------------------------------------------------------------------
  if (openRouterKey) {
    let targetModel = 'anthropic/claude-3.5-sonnet';
    if (provider === 'chatgpt') targetModel = 'openai/gpt-4o';
    if (provider === 'gemini') targetModel = 'google/gemini-flash-1.5';

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => {
        if (typeof m.content === 'string') return { role: m.role, content: m.content };
        const textParts = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
        const imagePart = m.content.find((c: any) => c.type === 'image');
        if (imagePart?.source) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: textParts || 'Analyze this screenshot.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imagePart.source.media_type};base64,${imagePart.source.data}`,
                },
              },
            ],
          };
        }
        return { role: m.role, content: textParts };
      }),
    ];

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://voice-ai.pages.dev',
        'X-Title': 'VoiCe Chat Intelligence',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: targetModel,
        messages: formattedMessages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (res.ok) {
      const data = await res.json() as any;
      const text = data.choices?.[0]?.message?.content || '';
      return { text, modelUsed: targetModel };
    }

    // Fallback attempt with default Claude if custom model failed
    if (targetModel !== 'anthropic/claude-3.5-sonnet') {
      const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: formattedMessages,
          max_tokens: maxTokens,
        }),
      });
      if (fallbackRes.ok) {
        const data = await fallbackRes.json() as any;
        return { text: data.choices?.[0]?.message?.content || '', modelUsed: 'anthropic/claude-3.5-sonnet' };
      }
    }
  }

  throw new Error('All AI model routes failed. Please check server API key configurations.');
}
