import { create } from 'zustand';
import { Tone, DeliveryStyle, ChatMessage, ReplyCandidate, ReportData, AIProvider } from '../types';

interface VoiceState {
  messages: ChatMessage[];
  tone: Tone;
  delivery: DeliveryStyle;
  provider: AIProvider;
  intensity: number;
  intent: string;
  candidates: ReplyCandidate[];
  report: ReportData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  setTone: (tone: Tone) => void;
  setDelivery: (delivery: DeliveryStyle) => void;
  setProvider: (provider: AIProvider) => void;
  setIntensity: (intensity: number) => void;
  setIntent: (intent: string) => void;
  setCandidates: (candidates: ReplyCandidate[]) => void;
  setReport: (report: ReportData | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  improveCandidate: (index: number, revisedText: string, style?: string) => void;
  reset: () => void;
}

const defaultMessages: ChatMessage[] = [
  { sender: 'them', body: 'Are you still free to hang out this Friday?', sequence: 1 },
  { sender: 'me', body: 'Was just thinking about that. What did you have in mind?', sequence: 2 },
  { sender: 'them', body: 'Maybe that Italian place with the rooftop patio? If you behave 😉', sequence: 3 },
];

export const useVoiceStore = create<VoiceState>((set) => ({
  messages: defaultMessages,
  tone: 'Flirty',
  delivery: 'Casual & Direct',
  provider: 'claude',
  intensity: 6,
  intent: 'continue',
  candidates: [
    { id: '1', body: 'Bold of you to assume I’m free 😌 what did you have in mind?', style: 'playful' },
    { id: '2', body: 'You’re making it very hard to say no.', style: 'direct' },
    { id: '3', body: 'That confidence is doing a lot of work right now.', style: 'bold' },
    { id: '4', body: 'I’ll behave if the pasta is good.', style: 'teasing' },
  ],
  report: null,
  isLoading: false,
  error: null,

  setMessages: (messages) => set({ messages }),
  setTone: (tone) => set({ tone }),
  setDelivery: (delivery) => set({ delivery }),
  setProvider: (provider) => set({ provider }),
  setIntensity: (intensity) => set({ intensity }),
  setIntent: (intent) => set({ intent }),
  setCandidates: (candidates) => set({ candidates }),
  setReport: (report) => set({ report }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  improveCandidate: (index, revisedText, style) =>
    set((state) => {
      const updated = [...state.candidates];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          body: revisedText,
          style: style || 'refined',
        };
      }
      return { candidates: updated };
    }),
  reset: () =>
    set({
      messages: [],
      candidates: [],
      report: null,
      error: null,
    }),
}));
