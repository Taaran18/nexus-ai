export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  rating?: number | null;   // 1 = thumbs up, -1 = thumbs down
  created_at: string;
  // Set locally from the SSE done event — not persisted to DB
  total_tokens?: number;
  time_ms?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  folder_id: string | null;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface NexusDocument {
  id: string;
  content: string;
  metadata: { source?: string; [key: string]: unknown };
  created_at?: string;
}

export interface StreamEvent {
  type: "token" | "done" | "error" | "node_start";
  content?: string;
  session_id?: string;
  node?: string;
  label?: string;
  // Included in the "done" event
  total_tokens?: number;
  time_ms?: number;
}

export interface NexusModel {
  id: string;
  name: string;
  desc: string;
  badge: string;   // short label shown in the input bar
  speed: "fast" | "medium" | "slow";
}

export interface NodeStatus {
  node: string;
  label: string;
}
