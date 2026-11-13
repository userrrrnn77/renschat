// src/types.ts
export type Cell = string | number | boolean | null;

export interface TextBlock {
  type: "text";
  markdown: string;
}

export interface CodeBlock {
  type: "code";
  language: string;
  filename?: string;
  content: string;
}

export interface FileBlock {
  type: "file";
  fileId: string;
  name: string;
  mime: string;
  size: number;
  version: number;
  preview: "code" | "text" | "image" | "pdf" | "none";
  note?: string;
}

export interface ImageBlock {
  type: "image";
  fileId: string;
  alt?: string;
}

export interface TableBlock {
  type: "table";
  title?: string;
  columns: {
    key: string;
    label: string;
    align?: "left" | "right" | "center";
  }[];
  rows: Record<string, Cell>[];
}

export interface ChartBlock {
  type: "chart";
  kind: "bar" | "line" | "area" | "pie" | "scatter";
  title?: string;
  xKey: string;
  series: { key: string; label?: string }[];
  data: Record<string, Cell>[];
}

export interface CardBlock {
  type: "card";
  title: string;
  subtitle?: string;
  markdown?: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
  actions?: { label: string; prompt: string }[];
}

export interface ChoicesBlock {
  type: "choices";
  question: string;
  multi: boolean;
  options: { label: string; value?: string }[];
  questionId?: string;
  answer?: string[];
}

export type Block =
  | TextBlock
  | CodeBlock
  | FileBlock
  | ImageBlock
  | TableBlock
  | ChartBlock
  | CardBlock
  | ChoicesBlock;

export type StreamPhase = "clarifying" | "retrieving" | "generating" | null;

export interface PendingClarification {
  questionId: string;
  question: string;
  multi: boolean;
  options: { label: string; value?: string }[];
  timeoutMs: number;
  receivedAt: number;
}

export type IndexStatus =
  | "disabled"
  | "pending"
  | "indexing"
  | "ready"
  | "failed";

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
}

export interface SessionItem {
  id: string;
  title: string;
  titleAuto: boolean;
  pinned: boolean;
  archived: boolean;
  lastMessageAt: string | null;
  createdAt: string;
}

export type MessageStatus = "streaming" | "done" | "aborted" | "error";

export interface ServerMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  blocks: Block[];
  status: MessageStatus;
  createdAt: string;
  attachmentIds?: string[];
  sources?: SourceRef[];
}

export interface FileMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
  version: number;
  origin: "upload" | "generated";
  status: "pending" | "processing" | "ready" | "failed";
  indexStatus: IndexStatus | null;
  error: string | null;
  summaryLine: string | null;
  createdAt: string;
}

export interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface SourceRef {
  n: number;
  fileId: string;
  name: string;
  idx: number;
  snippet: string;
}

export type StreamEvent =
  | { event: "message.start"; data: { messageId: string; sessionId: string } }
  | {
      event: "status";
      data: { phase: "clarifying" | "retrieving" | "generating" };
    }
  | {
      event: "clarification.needed";
      data: {
        questionId: string;
        question: string;
        multi: boolean;
        options: { label: string; value?: string }[];
        timeoutMs: number;
      };
    }
  | {
      event: "clarification.resolved";
      data: { questionId: string; answer: string[] };
    }
  | { event: "sources"; data: { sources: SourceRef[] } }
  | { event: "thinking.delta"; data: { delta: string } }
  | { event: "thinking.end"; data: { durationMs: number } }
  | { event: "block.start"; data: { index: number; block: Block } }
  | { event: "block.delta"; data: { index: number; delta: string } }
  | { event: "block.end"; data: { index: number; block: Block } }
  | { event: "tool.start"; data: { callId: string; name: string } }
  | {
      event: "tool.end";
      data: { callId: string; ok: boolean; summary: string };
    }
  | { event: "title"; data: { sessionId: string; title: string } }
  | { event: "error"; data: { code: string; message: string } }
  | {
      event: "message.end";
      data: {
        messageId: string;
        status: "done" | "aborted" | "error";
        usage: Usage | null;
      };
    };

export interface ToolRun {
  callId: string;
  name: string;
  status: "running" | "ok" | "error";
  summary?: string;
  beforeIndex: number;
}

export interface AttachmentRef {
  id: string;
  name: string;
  mime: string;
  size: number;
  localUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  blocks: Block[];
  status: MessageStatus;
  createdAt: string;
  attachments?: AttachmentRef[];
  tools?: ToolRun[];
  error?: { code: string; message: string };
  usage?: Usage | null;
  sources?: SourceRef[];
  thinking?: { text: string; done: boolean; durationMs?: number };
}
