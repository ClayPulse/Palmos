"use client";

import useDeepAgent, { type InterruptState } from "@/lib/hooks/use-deep-agent";
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
  submit: (text: string, workflows?: WorkflowInput[], uploadIds?: string[]) => void;
  resume: (reply: string) => void;
  stop: () => void;
  clear: () => void;
  activeInterrupt: InterruptState | null;
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
    submit,
    resume,
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
    if (messages.length === 0) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      // Capture the current project so the session is tagged
      const currentProjectId = editorContext?.editorStates.projectsInfo?.find(
        (p) => p.name === editorContext?.editorStates.project,
      )?.id ?? null;
      saveSession(
        currentSessionIdRef.current,
        messages.map(serializeMessage),
        currentProjectId,
      ).then((resolvedId) => {
        // If backend assigned a new ID, update our ref
        if (resolvedId && resolvedId !== currentSessionIdRef.current) {
          currentSessionIdRef.current = resolvedId;
        }
      });
    }, 500);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [messages, saveSession]);

  const handleNewChat = useCallback(() => {
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

  const handleSwitchSession = useCallback(
    async (sessionId: string) => {
      // Save current session first
      if (messages.length > 0) {
        await saveSession(currentSessionIdRef.current, messages.map(serializeMessage));
      }
      clear();
      setIsLoadingSession(true);
      switchSession(sessionId);
      currentSessionIdRef.current = sessionId;

      // Fetch messages from backend/localStorage
      try {
        const data = await fetchSessionMessages(sessionId);
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
