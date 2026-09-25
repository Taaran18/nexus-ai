export interface Me {
  id: string;
  created_at: string;
  preferences: Preferences;
}

export interface Usage {
  messages_limit: number;
  messages_used: number;
  messages_left: number;
  uploads_limit: number;
  uploads_used: number;
  uploads_left: number;
  max_turns_per_chat: number;
  resets_at: string;
}

export interface Preferences {
  provider?: string;
  model?: string;
  think?: boolean;
  use_memory?: boolean;
  enter_to_send?: boolean;
  show_stats?: boolean;
}

export interface Source {
  type: "web" | "document";
  title: string;
  url: string | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  rating?: 1 | -1 | null;
  provider?: string;
  model?: string;
  model_label?: string;
  think?: boolean;
  think_engine?: string | null;
  thinking?: string | null;
  sources?: Source[];
  intent?: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  tokens_estimated?: boolean;
  time_ms?: number | null;
  stopped?: boolean;
  error?: string | null;
  error_code?: string | null;
  pending?: boolean;
  live?: LiveUsage;
}

export interface LiveUsage {
  started: number;
  confirmed: number;
  chars: number;
  estimated: boolean;
}

export interface ChatSummary {
  id: string;
  title: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  in_memory?: boolean;
}

export interface ChatDetail extends ChatSummary {
  messages: Message[];
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DocumentFile {
  id: string;
  source: string;
  chunks: number;
  size_bytes: number;
  created_at: string;
  preview: string;
}

export interface MemoryItem {
  session_id: string;
  title: string;
  saved_at: string;
  message_count: number;
  summary: string;
  summary_type: "ai" | "excerpt";
}

export interface GroqModel {
  id: string;
  name: string;
  developer: string;
  group: "fast" | "thorough" | "new";
  reasoning_effort?: string;
  context: number;
  speed: string;
  best_for: string;
  why: string;
  default?: boolean;
  preview?: boolean;
}

export interface ModelGroup {
  id: string;
  name: string;
  description: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  tagline: string;
  key_url: string;
  key_placeholder: string;
  connected?: boolean;
  key_hint?: string | null;
  updated_at?: string | null;
}

export interface Catalog {
  checked: string;
  groups: ModelGroup[];
  groq: GroqModel[];
  think: { engine: string; jev_enabled: boolean };
  providers: ProviderInfo[];
}

export interface ProviderModel {
  id: string;
  name: string;
  context: number | null;
  price_in: number | null;
  price_out: number | null;
  pricing_source: "live" | "catalog" | "unknown";
  tier: "fast" | "balanced" | "deep";
  reasoning: boolean;
  best_for: string;
  recommended: boolean;
}

export interface Overview {
  stats: {
    chats: number;
    messages: number;
    documents: number;
    chunks: number;
    folders: number;
    memories: number;
    providers: number;
  };
  usage: Usage;
  recent_documents: DocumentFile[];
}

export type StreamEvent =
  | {
      type: "meta";
      chat_id: string;
      model_label: string;
      think: boolean;
      think_engine: string | null;
    }
  | { type: "node_start"; node: string; label: string }
  | { type: "intent"; intent: string }
  | { type: "sources"; sources: Source[] }
  | { type: "thinking"; content: string }
  | { type: "token"; content: string }
  | { type: "title"; chat_id: string; title: string }
  | { type: "done"; chat_id: string; message: Message }
  | {
      type: "usage";
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      estimated: boolean;
    }
  | { type: "error"; code: string; message: string; chat_id?: string; refunded?: boolean };

export interface ModelChoice {
  provider: string;
  model: string;
  label: string;
}
