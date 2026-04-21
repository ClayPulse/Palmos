"use client";

import useDeepAgent from "@/lib/hooks/use-deep-agent";
import type { InterruptState, QAFormInterruptState } from "@/lib/types";
import {
  useChatSessions,
  generateSessionId,
  type ChatSession,
  type SerializedMessage,
  type WorkflowBuild,
} from "@/lib/hooks/use-chat-sessions";
import type { BaseMessage } from "@langchain/core/messages";
import type { SubagentInfo, Todo, WorkflowInput } from "@/lib/types";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const agentUrl = process.env.NEXT_PUBLIC_BACKEND_URL + "/api/agent";

export interface ChatContextValue {
  // Deep agent state
  messages: BaseMessage[];
  isLoading: boolean;
  error: Error | null;
  todos: Todo[];
  submit: (text: string, workflows?: WorkflowInput[], uploadIds?: string[], projectId?: string) => void;
  resume: (reply: string) => void;
  stop: () => void;
  clear: () => void;
  activeInterrupt: InterruptState | null;
  activeQAForm: QAFormInterruptState | null;
  resumeQAForm: (data: Record<string, any>) => void;
  loadMessages: (msgs: BaseMessage[]) => void;
  getSubagentsByMessage: (messageId: string) => SubagentInfo[];
  // Session state
  sessions: ChatSession[];
  activeSessionId: string | null;
  currentSessionIdRef: React.RefObject<string>;
  handleNewChat: () => void;
  handleSwitchSession: (sessionId: string) => void;
  handleDeleteSession: (sessionId: string) => void;
  saveCurrentSession: () => void;
  isLoadingSession: boolean;
  // Workflow builder results persisted per session
  workflowBuilds: WorkflowBuild[];
  saveWorkflowBuild: (publishedWorkflowId: string) => void;
  // Serialization helpers exposed for external use
  serializeMessage: (msg: BaseMessage) => SerializedMessage;
  deserializeMessage: (msg: SerializedMessage) => BaseMessage | null;
  /** Import a shared chat by token into the user's history and display it. */
  importSharedChat: (token: string) => Promise<void>;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const {
    messages,
    isLoading,
    error,
    todos,
    activeInterrupt,
    activeQAForm,
    submit,
    resume,
    resumeQAForm,
    stop,
    clear,
    loadMessages,
    getSubagentsByMessage,
  } = useDeepAgent(agentUrl);

  const {
    sessions,
    activeSessionId,
    saveSession,
    switchSession,
    startNewSession,
    deleteSession,
    fetchSessionMessages,
    saveWorkflowBuild: saveWorkflowBuildAPI,
  } = useChatSessions();

  const editorContext = useContext(EditorContext);

  const [workflowBuilds, setWorkflowBuilds] = useState<WorkflowBuild[]>([]);

  const currentSessionIdRef = useRef<string>(activeSessionId ?? generateSessionId());
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  /** When true, the current view is a read-only shared chat — skip auto-save. */
  const isViewingSharedRef = useRef(false);

  // Initialize session on mount — restore the active session's messages
  useEffect(() => {
    if (activeSessionId) {
      currentSessionIdRef.current = activeSessionId;
      fetchSessionMessages(activeSessionId).then((data) => {
        if (data.messages.length > 0) {
          loadMessages(
            data.messages.map(deserializeMessage).filter(Boolean) as BaseMessage[],
          );
        }
        setWorkflowBuilds(data.workflowBuilds ?? []);
      });
    } else {
      const id = generateSessionId();
      currentSessionIdRef.current = id;
      switchSession(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save when messages change (debounced)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (messages.length === 0 || isViewingSharedRef.current) return;
    clearTimeout(saveTimeoutRef.current);
    // Capture the session id + project id NOW (enqueue time) so that if the
    // user switches sessions before the timer fires, the pending save still
    // writes to the session these messages actually belong to. Reading
    // currentSessionIdRef.current inside the timer would let a stale save
    // clobber a different session's history.
    const sessionIdAtEnqueue = currentSessionIdRef.current;
    const projectIdAtEnqueue = editorContext?.editorStates.projectsInfo?.find(
      (p) => p.name === editorContext?.editorStates.project,
    )?.id ?? null;
    const messagesAtEnqueue = messages.map(serializeMessage);
    saveTimeoutRef.current = setTimeout(() => {
      saveSession(
        sessionIdAtEnqueue,
        messagesAtEnqueue,
        projectIdAtEnqueue,
      ).then((resolvedId) => {
        // If backend assigned a new ID, update our ref — but only if the ref
        // is still pointing at the session we just saved. Otherwise the user
        // has already switched away and updating the ref would misroute
        // future saves.
        if (
          resolvedId &&
          resolvedId !== sessionIdAtEnqueue &&
          currentSessionIdRef.current === sessionIdAtEnqueue
        ) {
          currentSessionIdRef.current = resolvedId;
        }
      });
    }, 500);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [messages, saveSession]);

  const handleNewChat = useCallback(() => {
    isViewingSharedRef.current = false;
    clear();
    setWorkflowBuilds([]);
    const id = startNewSession();
    currentSessionIdRef.current = id;
  }, [clear, startNewSession]);

  const saveWorkflowBuild = useCallback(
    (publishedWorkflowId: string) => {
      setWorkflowBuilds((prev) => {
        if (prev.some((r) => r.workflowId === publishedWorkflowId)) return prev;
        return [...prev, { id: "", workflowId: publishedWorkflowId, status: "completed", completedAt: new Date().toISOString(), workflow: null }];
      });
      saveWorkflowBuildAPI(currentSessionIdRef.current, publishedWorkflowId);
    },
    [saveWorkflowBuildAPI],
  );

  const isSwitchingRef = useRef(false);
  const handleSwitchSession = useCallback(
    async (sessionId: string) => {
      // Guard against re-entrant switches (rapid clicks): only one switch
      // may be in flight at a time, otherwise concurrent invocations can
      // interleave their state updates and load messages under the wrong
      // session.
      if (isSwitchingRef.current) return;
      if (sessionId === currentSessionIdRef.current) return;
      isSwitchingRef.current = true;
      // Cancel any pending debounced auto-save before we mutate state — the
      // enqueued save would otherwise write stale messages under whatever
      // session id it captured, which is fine on its own but we'd rather
      // flush it explicitly below.
      clearTimeout(saveTimeoutRef.current);
      // Snapshot what we need from the outgoing session before clearing.
      const outgoingSessionId = currentSessionIdRef.current;
      const outgoingMessages = messages;
      const wasSharedView = isViewingSharedRef.current;
      // Abort any in-flight stream FIRST so late SSE chunks can't leak
      // messages into the next session's messageMapRef.
      clear();
      isViewingSharedRef.current = false;
      setIsLoadingSession(true);
      switchSession(sessionId);
      currentSessionIdRef.current = sessionId;

      // Flush the outgoing session's messages (skip if it was a read-only
      // shared chat view).
      if (outgoingMessages.length > 0 && !wasSharedView) {
        try {
          await saveSession(
            outgoingSessionId,
            outgoingMessages.map(serializeMessage),
          );
        } catch {
          // Best-effort; don't block the switch on a save failure.
        }
      }

      // Fetch messages from backend/localStorage
      try {
        const data = await fetchSessionMessages(sessionId);
        // Guard: if the user switched again while we were fetching, don't
        // load these results into the currently-active session.
        if (currentSessionIdRef.current !== sessionId) return;
        if (data.messages.length > 0) {
          loadMessages(
            data.messages.map(deserializeMessage).filter(Boolean) as BaseMessage[],
          );
        }
        setWorkflowBuilds(data.workflowBuilds ?? []);

        // Restore or clear the project context based on the session
        const sessionProjectId = data.projectId ?? null;
        if (sessionProjectId) {
          // Find the project name from the ID and restore it
          const proj = editorContext?.editorStates.projectsInfo?.find(
            (p) => p.id === sessionProjectId,
          );
          if (proj) {
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              project: proj.name,
            }));
          }
        } else {
          // Session had no project — clear active project
          editorContext?.setEditorStates((prev) => ({
            ...prev,
            project: undefined,
          }));
        }
      } finally {
        setIsLoadingSession(false);
        isSwitchingRef.current = false;
      }
    },
    [messages, clear, switchSession, saveSession, loadMessages, fetchSessionMessages, editorContext],
  );

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      deleteSession(sessionId);
      if (sessionId === currentSessionIdRef.current) {
        handleNewChat();
      }
    },
    [deleteSession, handleNewChat],
  );

  const saveCurrentSession = useCallback(() => {
    if (messages.length > 0) {
      saveSession(currentSessionIdRef.current, messages.map(serializeMessage));
    }
  }, [messages, saveSession]);

  const importSharedChat = useCallback(
    async (token: string) => {
      setIsLoadingSession(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/share/${token}`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error("Failed to load shared chat");
        const data = await res.json();
        if (data.error || data.expired || !data.session) {
          throw new Error(data.error ?? "This shared chat is no longer available.");
        }

        // Convert backend messages to SerializedMessage format
        const serializedMsgs: SerializedMessage[] = (data.session.messages ?? [])
          .filter((m: any) => ["human", "ai", "tool"].includes(m.role))
          .map((m: any) => ({
            type: m.role as SerializedMessage["type"],
            content: m.content,
            id: m.id,
            tool_call_id: m.toolCallId,
            additional_kwargs: m.additionalKwargs,
            tool_calls: m.toolCalls,
          }));

        // Save current session first
        if (messages.length > 0 && !isViewingSharedRef.current) {
          await saveSession(currentSessionIdRef.current, messages.map(serializeMessage));
        }

        // Load shared messages into the UI without saving to history
        clear();
        isViewingSharedRef.current = true;
        const deserialized = serializedMsgs
          .map(deserializeMessage)
          .filter(Boolean) as BaseMessage[];
        loadMessages(deserialized);
        setWorkflowBuilds(data.session.workflowBuilds ?? []);
      } finally {
        setIsLoadingSession(false);
      }
    },
    [messages, clear, saveSession, loadMessages],
  );

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        error,
        todos,
        submit,
        resume,
        stop,
        clear,
        activeInterrupt,
        activeQAForm,
        resumeQAForm,
        loadMessages,
        getSubagentsByMessage,
        sessions,
        activeSessionId,
        currentSessionIdRef,
        handleNewChat,
        handleSwitchSession,
        handleDeleteSession,
        saveCurrentSession,
        isLoadingSession,
        workflowBuilds,
        saveWorkflowBuild,
        serializeMessage,
        deserializeMessage,
        importSharedChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

function serializeMessage(msg: BaseMessage): SerializedMessage {
  const type = msg._getType() as SerializedMessage["type"];
  return {
    type,
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    id: msg.id ?? undefined,
    tool_call_id: (msg as any).tool_call_id ?? undefined,
    additional_kwargs: (msg as any).additional_kwargs,
    tool_calls: (msg as any).tool_calls,
  };
}

function deserializeMessage(s: SerializedMessage): BaseMessage | null {
  switch (s.type) {
    case "human":
      return new HumanMessage({ content: s.content, id: s.id });
    case "ai":
      return new AIMessage({
        content: s.content,
        id: s.id,
        additional_kwargs: s.additional_kwargs,
        tool_calls: s.tool_calls as any,
      });
    case "system":
      return new SystemMessage({ content: s.content, id: s.id });
    case "tool":
      return new ToolMessage({
        content: s.content,
        id: s.id,
        tool_call_id: s.tool_call_id ?? "",
      });
    default:
      return null;
  }
}
