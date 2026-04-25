"use client";

import useWorkerAgent from "@/lib/hooks/use-worker-agent";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import type { InterruptState, QAFormInterruptState } from "@/lib/types";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL + "/api";

export interface WorkerChatContextValue {
  agentSlug: string;
  messages: BaseMessage[];
  isLoading: boolean;
  error: Error | null;
  sessionId: string | null;
  submit: (text: string, uploadIds?: string[]) => void;
  resume: (reply: string) => void;
  resumeQAForm: (data: Record<string, any>) => void;
  stop: () => void;
  clear: () => void;
  activeInterrupt: InterruptState | null;
  activeQAForm: QAFormInterruptState | null;
}

export const WorkerChatContext = createContext<WorkerChatContextValue | null>(null);

export function useWorkerChatContext(): WorkerChatContextValue {
  const ctx = useContext(WorkerChatContext);
  if (!ctx) {
    throw new Error(
      "useWorkerChatContext must be used inside <WorkerChatProvider>",
    );
  }
  return ctx;
}

// Per-(user, agentSlug) chat. There's exactly one session per pair, so this
// provider has no session list. On mount it fetches/creates the session and
// hydrates message history; it auto-saves messages back as they accumulate.

export default function WorkerChatProvider({
  agentSlug,
  children,
}: {
  agentSlug: string;
  children: React.ReactNode;
}) {
  const {
    messages,
    isLoading,
    error,
    activeInterrupt,
    activeQAForm,
    submit: submitToAgent,
    resume,
    resumeQAForm,
    stop,
    clear,
    loadMessages,
  } = useWorkerAgent(apiBase, agentSlug);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Initialize: fetch (or lazily create) the user's session for this slug.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAPI(
          `/api/agent/worker/${encodeURIComponent(agentSlug)}/sessions`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        sessionIdRef.current = data.id;
        setSessionId(data.id);
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const restored = data.messages
            .map(deserializeMessage)
            .filter(Boolean) as BaseMessage[];
          loadMessages(restored);
        }
      } catch (err) {
        console.warn("[worker-chat] failed to fetch session:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when agentSlug changes; loadMessages is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentSlug]);

  // Auto-save messages (debounced) whenever they change.
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!sessionIdRef.current || messages.length === 0) return;
    clearTimeout(saveTimeoutRef.current);
    const sid = sessionIdRef.current;
    const snapshot = messages.map(serializeMessage);
    saveTimeoutRef.current = setTimeout(() => {
      void persistMessages(sid, snapshot);
    }, 500);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [messages]);

  const submit = useCallback(
    (text: string, uploadIds?: string[]) => {
      submitToAgent(text, uploadIds, sessionIdRef.current ?? undefined);
    },
    [submitToAgent],
  );

  return (
    <WorkerChatContext.Provider
      value={{
        agentSlug,
        messages,
        isLoading,
        error,
        sessionId,
        submit,
        resume,
        resumeQAForm,
        stop,
        clear,
        activeInterrupt,
        activeQAForm,
      }}
    >
      {children}
    </WorkerChatContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Persistence — reuses the generic chat session-update endpoint so messages
// land in the same ChatSession/ChatMessage tables as manager chats. The
// session was already created with kind="worker" + agentSlug=<slug> by the
// sessions GET route.
// ---------------------------------------------------------------------------

interface SerializedMessage {
  role: "human" | "ai" | "system" | "tool";
  content: string;
  toolCallId?: string;
  additionalKwargs?: Record<string, any>;
  toolCalls?: any;
}

async function persistMessages(
  sessionId: string,
  messages: SerializedMessage[],
) {
  try {
    await fetchAPI(`/api/chat/sessions/${sessionId}/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch (err) {
    console.warn("[worker-chat] save failed:", err);
  }
}

function serializeMessage(msg: BaseMessage): SerializedMessage {
  const role = msg._getType() as SerializedMessage["role"];
  return {
    role,
    content:
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content),
    toolCallId: (msg as any).tool_call_id ?? undefined,
    additionalKwargs: (msg as any).additional_kwargs,
    toolCalls: (msg as any).tool_calls,
  };
}

function deserializeMessage(s: any): BaseMessage | null {
  // The session GET route returns ChatMessage rows whose `role` field is
  // already "human" | "ai" | "system" | "tool", so we accept either shape.
  const type = s.type ?? s.role;
  switch (type) {
    case "human":
      return new HumanMessage({ content: s.content, id: s.id });
    case "ai":
      return new AIMessage({
        content: s.content,
        id: s.id,
        additional_kwargs: s.additionalKwargs ?? s.additional_kwargs,
        tool_calls: (s.toolCalls ?? s.tool_calls) as any,
      });
    case "system":
      return new SystemMessage({ content: s.content, id: s.id });
    case "tool":
      return new ToolMessage({
        content: s.content,
        id: s.id,
        tool_call_id: s.toolCallId ?? s.tool_call_id ?? "",
      });
    default:
      return null;
  }
}
