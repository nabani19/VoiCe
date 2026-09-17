export type Tone =
  | 'Natural'
  | 'Funny'
  | 'Flirty'
  | 'Spicy'
  | 'Professional'
  | 'Romantic'
  | 'Sarcastic';

export type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'auto';

export type DeliveryStyle =
  | 'Casual & Direct'
  | 'Witty & Teasing'
  | 'Warm & Engaging'
  | 'Unfiltered & Real';

export interface ChatMessage {
  sender: 'me' | 'them';
  body: string;
  sequence: number;
}

export interface ReplyCandidate {
  id: string;
  body: string;
  style: string;
}

export interface StrongSignal {
  signal: string;
  evidence: string;
  meaning: string;
}

export interface RedFlag {
  flag: string;
  evidence: string;
  confidence: 'High' | 'Medium' | 'Low';
  risk: string;
}

export interface ReportData {
  score: number;
  flow_arc: string;
  observable_cues: string[];
  strong_signals: StrongSignal[];
  red_flags: RedFlag[];
  how_to_impress: {
    key_interest: string;
    advice: string;
    recommended_approach: string;
  };
  pro_tips: string[];
  suggested_next_moves: string[];
}

export interface FavoriteItem {
  id: string;
  body: string;
  category: Tone;
  createdAt: string;
}
