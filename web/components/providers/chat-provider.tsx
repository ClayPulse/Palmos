"use client";

import useDeepAgent from "@/lib/hooks/use-deep-agent";
import {
  useChatSessions,
  generateSessionId,
  type ChatSession,
  type SerializedMessage,
} from "@/lib/hooks/use-chat-sessions";
import type { BaseMessage } from "@langchain/core/messages";
import type { SubagentInfo, Todo, WorkflowInput } from "@/lib/types";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const agentUrl = process.env.NEXT_PUBLIC_BACKEND_URL + "/api/agent";

export interface ChatContextValue {
  // Deep agent state
  messages: BaseMessage[];
  isLoading: boolean;
  error: Error | null;
  todos: Todo[];
  submit: (text: string, workflows?: WorkflowInput[], uploadIds?: string[]) => void;
  stop: () => void;
  clear: () => void;
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
    submit,
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
  } = useChatSessions();

  const currentSessionIdRef = useRef<string>(activeSessionId ?? generateSessionId());
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Initialize session on mount — restore the active session's messages
  useEffect(() => {
    if (activeSessionId) {
      currentSessionIdRef.current = activeSessionId;
      fetchSessionMessages(activeSessionId).then((msgs) => {
        if (msgs.length > 0) {
          loadMessages(
            msgs.map(deserializeMessage).filter(Boolean) as BaseMessage[],
          );
        }
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
      saveSession(
        currentSessionIdRef.current,
        messages.map(serializeMessage),
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
    const id = startNewSession();
    currentSessionIdRef.current = id;
  }, [clear, startNewSession]);

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
        const msgs = await fetchSessionMessages(sessionId);
        if (msgs.length > 0) {
          loadMessages(
            msgs.map(deserializeMessage).filter(Boolean) as BaseMessage[],
          );
        }
      } finally {
        setIsLoadingSession(false);
      }
    },
    [messages, clear, switchSession, saveSession, loadMessages, fetchSessionMessages],
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
        stop,
        clear,
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
