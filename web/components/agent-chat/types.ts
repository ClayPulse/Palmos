import type ChatMessageArea from "@/components/agent-chat/chat-blocks/text/text-block";
import type ChatInputBar from "@/components/agent-chat/input/chat-input-bar";
import type {
  Automation,
  ChatBlockData,
  InterruptState,
  ProjectInfo,
  SubagentInfo,
  Todo,
  Workflow,
  WorkflowTaskState,
} from "@/lib/types";
import type React from "react";
import type { ComponentProps, ReactNode, RefObject } from "react";

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

// ── Chat message area ───────────────────────────────────────────────────────

export interface ChatMessageAreaProps {
  variant: "panel" | "page";
  isLoadingSession: boolean;
  isEmptyConversation: boolean;
  emptyState: React.ReactNode;
  messageList: React.ReactNode;
  workflowTasks: WorkflowTaskState[];
  onTerminateTask?: (taskId: string) => void;
  terminatingTaskIds?: Set<string>;
  activeInterrupt: any;
  resume: (value: string) => void;
  isLoading: boolean;
  error: unknown;
  todos: any[];
  latestWorkflow: ChatBlockData | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
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

export interface ChatInputBarProps {
  variant: "panel" | "page";
  inputText: string;
  setInputText: (v: string) => void;
  isLoading: boolean;
  uploads: ChatUpload[];
  uploadsInProgress: boolean;
  pendingSend: boolean;
  onSend: () => void;
  onStop: () => void;
  onUploadFiles: (files: File[]) => void;
  onRemoveUpload: (upload: ChatUpload) => void;
  onIndexUpload: (upload: ChatUpload) => void;
  footerExtra?: React.ReactNode;
}

// ── Carousels ───────────────────────────────────────────────────────────────

export interface MyWorkflowsCarouselProps {
  workflows: Workflow[];
  onMutate?: () => void;
  projectId?: string;
  showAllToggle?: ReactNode;
  showProjectName?: boolean;
}

export interface MyAutomationsCarouselProps {
  automations: Automation[];
  onOpenEditor: (automation: Automation) => void;
  onCreateNew: () => void;
}

// ── Embed panel ─────────────────────────────────────────────────────────────

export type EmbedPanelTab =
  | "a2ui"
  | "mcp-apps"
  | "pulse-app"
  | "workflow-canvas";

export interface ChatEmbedPanelProps {
  activeTab: EmbedPanelTab;
  onTabChange: (tab: EmbedPanelTab) => void;
  onClose: () => void;
}

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

export interface InboxPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface InboxMessageCardProps {
  message: InboxMessage;
  onDismiss?: (id: string) => void;
}

// ── Inline widget ───────────────────────────────────────────────────────────

export interface A2UIStreamRendererProps {
  messages: unknown[];
}

// ── Interrupt card ──────────────────────────────────────────────────────────

export interface InterruptBlockProps {
  interrupt: InterruptState;
  onReply: (reply: string) => void;
  isLoading?: boolean;
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

export interface KnowledgeFilesProps {
  /** "popover" opens upward as a popup (for chat input). "panel" renders inline dropdown (for side panel). */
  variant?: "popover" | "panel" | "inline";
}

// ── Message bubbles ─────────────────────────────────────────────────────────

export interface CopyButtonProps {
  text: string;
}

export interface UserBubbleProps {
  text: string;
  attachmentCount?: number;
  uploadIds?: string[];
}

export interface ToolCallBadgesProps {
  names: string[];
}

export interface AIResponseCardProps {
  content: string;
  isStreaming: boolean;
  widgets?: ChatBlockData[];
  toolCallNames?: string[];
}

export interface ResponseCardProps {
  content: string;
  isStreaming: boolean;
  widgets?: ChatBlockData[];
  toolCallNames?: string[];
}

export type StatusKind = "pending" | "running" | "complete" | "error";

export interface StatusBadgeProps {
  status: StatusKind;
}

export interface StatusIconProps {
  status: StatusKind;
}

// ── Quick pill buttons ──────────────────────────────────────────────────────

export interface QuickPillButtonsProps {
  onSend: (text: string) => void;
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

export interface RunningTasksPanelProps {
  onClose?: () => void;
}

// ── Share chat modal ────────────────────────────────────────────────────────

export interface ShareChatModalProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// ── Subagent card ───────────────────────────────────────────────────────────

export interface SubagentBlockProps {
  subagent: SubagentInfo;
}

// ── Tasks overlay ───────────────────────────────────────────────────────────

export interface TasksOverlayProps {
  isPage: boolean;
  onClose: () => void;
}

// ── Todo list ───────────────────────────────────────────────────────────────

export interface TodoListProps {
  todos: Todo[];
}

// ── Workflow task card ──────────────────────────────────────────────────────

export interface WorkflowTaskBlockProps {
  task: WorkflowTaskState;
  onTerminate?: (taskId: string) => void;
  isTerminating?: boolean;
}

export interface WorkflowResultBodyProps {
  result: unknown;
  workflowName: string;
}

export interface BlobResult {
  __blobUrl: string;
  mime: string;
}

export interface BlobResultBodyProps {
  blobResult: BlobResult;
  workflowName: string;
}

export interface WorkflowBuiltBlockProps {
  publishedId: string;
  workflowName: string;
}

export interface AgentProgressLogEntry {
  type: string;
  text?: string;
  tool?: string;
  output?: string;
}

export interface AgentProgressLogProps {
  log: AgentProgressLogEntry[];
}

export interface LogEntryProps {
  entry: AgentProgressLogEntry;
  toolOutput?: string;
}

// ── Initial chat screens ────────────────────────────────────────────────────

export interface HomeScreenProps {
  onSend: (text: string) => void;
  projects: ProjectInfo[];
}

export interface ProjectExplorerProps {
  projects: ProjectInfo[];
  onOpen: (name: string) => void;
}

export interface ProjectScreenProps {
  onSend: (text: string) => void;
  project: ProjectInfo;
}

export interface StatusLineProps {
  activeAutomations: number;
  workflowCount: number;
}
