import type ChatInputBar from "@/components/agent-chat/input/chat-input-bar";
import type { ChatMessageArea } from "@/components/agent-chat/messages/chat-message-area";
import type { ComponentProps, ReactNode } from "react";

// ── Agent chat layouts ──────────────────────────────────────────────────────

export interface AgentChatLayoutProps {
  messageAreaProps: ComponentProps<typeof ChatMessageArea>;
  inputBarProps: Omit<ComponentProps<typeof ChatInputBar>, "footerExtra">;
  quickPillButtons: ReactNode;
  shareModal: ReactNode;
  historyOverlay: ReactNode;
  tasksOverlay: ReactNode;
  sessionCount: number;
  canShare: boolean;
  onOpenHistory: () => void;
  onOpenTasks: () => void;
  onNewChat: () => void;
  onShare: () => void;
}

export interface AgentChatPanelLayoutProps extends AgentChatLayoutProps {
  isLoading: boolean;
  onStop: () => void;
  onClose?: () => void;
}

// ── Chat input bar ──────────────────────────────────────────────────────────

export interface ChatUpload {
  id: string;
  filename: string;
  sizeBytes: number;
  status: "uploading" | "processing" | "ready" | "error";
  error?: string;
  progress: number;
  tempKey: string;
  indexed?: boolean;
  indexing?: boolean;
}

// ── Embed panel ─────────────────────────────────────────────────────────────

export type EmbedPanelTab =
  | "a2ui"
  | "mcp-apps"
  | "pulse-app"
  | "workflow-canvas";

// ── History overlay ─────────────────────────────────────────────────────────

export type Session = { id: string; title: string; updatedAt: number };

// ── Inbox panel ─────────────────────────────────────────────────────────────

export interface InboxMessage {
  id: string;
  content: string;
  role: string;
  additionalKwargs?: Record<string, any>;
  createdAt: number;
}

// ── Knowledge files ─────────────────────────────────────────────────────────

export interface KnowledgeFile {
  id: string;
  filename: string;
  sizeBytes: number;
  chunkCount: number;
  createdAt: string;
  status?: "uploading" | "processing" | "ready" | "error";
  progress?: number;
  error?: string;
  tempKey?: string;
}

// ── Running tasks panel ─────────────────────────────────────────────────────

export interface TaskItem {
  taskId: string;
  workflowName: string;
  status: "pending" | "running" | "completed" | "failed";
  error: string | null;
  createdAt: number;
  completedAt: number | null;
  isManagedAgent: boolean;
  result?: any;
}

export type FilterKey = "all" | "running" | "completed" | "failed";
