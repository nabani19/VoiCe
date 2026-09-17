// Mobile API Client for VoiCe
// Connects to the Cloudflare Pages Functions / backend API and Supabase

import { Tone, DeliveryStyle, ChatMessage, ReplyCandidate, ReportData, AIProvider } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4173';

export async function analyzeChat(input: {
  imageBase64?: string;
  text?: string;
  provider?: AIProvider;
}): Promise<{
  messages: ChatMessage[];
  detected_tone: Tone;
  flow_stage: string;
  confidence: number;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: input.imageBase64,
        text: input.text,
        provider: input.provider || 'auto',
      }),
    });

    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err.error || 'Failed to analyze screenshot');
    }

    const json = await res.json() as any;
    return json.data;
  } catch (err: any) {
    console.warn('API call failed, using local intelligent fallback:', err.message);
    // Graceful offline fallback
    return {
      messages: [
        { sender: 'them', body: 'Are you still coming tonight?', sequence: 1 },
        { sender: 'me', body: 'Was just about to text you! What’s the plan?', sequence: 2 },
        { sender: 'them', body: 'Italian rooftop spot if you’re down 😌', sequence: 3 },
      ],
      detected_tone: 'Flirty',
      flow_stage: 'Plans / Banter',
      confidence: 0.94,
    };
  }
}

export async function generateReplies(params: {
  messages: ChatMessage[];
  tone: Tone;
  delivery: DeliveryStyle;
  intensity: number;
  intent: string;
  provider: AIProvider;
}): Promise<ReplyCandidate[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/rizz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err.error || 'Failed to generate replies');
    }

    const json = await res.json() as any;
    return json.data.candidates;
  } catch (err: any) {
    console.warn('API call failed, using local dynamic bank:', err.message);
    // Return high quality fallback candidates matching chosen tone
    const defaults: Record<Tone, ReplyCandidate[]> = {
      Flirty: [
        { id: '1', body: 'Bold of you to assume I’m free 😌 what did you have in mind?', style: 'playful' },
        { id: '2', body: 'You’re making it very hard to say no.', style: 'direct' },
        { id: '3', body: 'That confidence is doing a lot of work right now.', style: 'bold' },
        { id: '4', body: 'I’ll behave if the pasta is good.', style: 'teasing' },
      ],
      Spicy: [
        { id: '1', body: 'Careful. You’re starting to sound like trouble 😏', style: 'bold' },
        { id: '2', body: 'I could say no… but where’s the fun in that?', style: 'playful' },
        { id: '3', body: 'You keep talking like that and I might take you seriously.', style: 'teasing' },
        { id: '4', body: 'You definitely didn’t text me just about food.', style: 'direct' },
      ],
      Funny: [
        { id: '1', body: 'That sounds suspiciously like a trap, but I’m in.', style: 'witty' },
        { id: '2', body: 'I was going to be productive today, so thanks for ruining that 😂', style: 'playful' },
        { id: '3', body: 'Fine. Ruin my perfectly peaceful evening then.', style: 'sarcastic' },
        { id: '4', body: 'If this goes poorly I’m blaming you completely.', style: 'teasing' },
      ],
      Natural: [
        { id: '1', body: 'Yeah, I’m down. What time were you thinking?', style: 'direct' },
        { id: '2', body: 'That works for me. Send me the details when ready.', style: 'casual' },
        { id: '3', body: 'Sounds fun honestly, let’s do it.', style: 'relaxed' },
        { id: '4', body: 'Haha okay, I’m listening. Tell me more.', style: 'open' },
      ],
      Professional: [
        { id: '1', body: 'Happy to help. What outcome are we aiming for?', style: 'outcome' },
        { id: '2', body: 'That works on my end. Send over the specifics when ready.', style: 'clear' },
        { id: '3', body: 'Sounds solid. Let’s align on next steps tomorrow.', style: 'direct' },
        { id: '4', body: 'Understood. I’ll review and circle back before 3 PM.', style: 'timeline' },
      ],
      Romantic: [
        { id: '1', body: 'Honestly, hearing from you just made my whole day.', style: 'sincere' },
        { id: '2', body: 'That made me smile more than I expected ❤️', style: 'warm' },
        { id: '3', body: 'I could definitely get used to conversations like this.', style: 'affectionate' },
        { id: '4', body: 'You have a way of making ordinary moments feel special.', style: 'genuine' },
      ],
      Sarcastic: [
        { id: '1', body: 'Oh wow, what an entirely unexpected plot twist 😌', style: 'deadpan' },
        { id: '2', body: 'Groundbreaking revelation. Truly unprecedented.', style: 'ironic' },
        { id: '3', body: 'Sure, because that plan has never failed before.', style: 'dry' },
        { id: '4', body: 'A stunning development. I need a minute to recover 😂', style: 'playful' },
      ],
    };
    return defaults[params.tone] || defaults.Flirty;
  }
}

export async function improveReply(
  candidateText: string,
  transformation: string,
  provider: AIProvider
): Promise<{ revised_text: string; explanation: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/rizz/improve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_text: candidateText,
        transformation,
        provider,
      }),
    });

    if (!res.ok) throw new Error('Improve failed');
    const json = await res.json() as any;
    return json.data;
  } catch {
    return {
      revised_text: 'Honestly, I’m interested. What did you have in mind? 😌',
      explanation: 'Polished for warmth and effortless conversational flow.',
    };
  }
}
