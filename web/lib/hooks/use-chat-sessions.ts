import { useCallback, useEffect, useRef, useState } from "react";

export interface WorkflowBuild {
  id: string;
  /** The task ID originally reported by the build_workflow tool. Used on
   * session reload to correlate the build back to its originating AI message
   * so the built card can render inline. Optional for locally-constructed
   * builds that haven't been hydrated from the backend. */
  taskId?: string | null;
  workflowId: string | null;
  status: string;
  completedAt: string | null;
  workflow: { name: string } | null;
}

export interface ChatSession {
  id: string;
  title: string;
  projectId?: string | null;
  createdAt: number;
  updatedAt: number;
  workflowBuilds?: WorkflowBuild[];
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: SerializedMessage[];
}

export interface SerializedMessage {
  type: "human" | "ai" | "system" | "tool";
  content: string;
  id?: string;
  tool_call_id?: string;
  additional_kwargs?: Record<string, unknown>;
  tool_calls?: unknown[];
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export function generateSessionId(): string {
  return `session-${crypto.randomUUID()}`;
}

function deriveTitle(messages: SerializedMessage[]): string {
  const first = messages.find((m) => m.type === "human");
  if (!first || !first.content) return "New Chat";
  const text = typeof first.content === "string" ? first.content : "";
  return text.length > 60 ? text.slice(0, 57) + "..." : text || "New Chat";
}

// ---------------------------------------------------------------------------
// Backend API helpers
// ---------------------------------------------------------------------------

function toBackendMessage(m: SerializedMessage) {
  return {
    role: m.type,
    content: m.content,
    toolCallId: m.tool_call_id,
    additionalKwargs: m.additional_kwargs,
    toolCalls: m.tool_calls,
  };
}

function fromBackendMessage(m: any): SerializedMessage {
  return {
    type: m.role as SerializedMessage["type"],
    content: m.content,
    id: m.id,
    tool_call_id: m.toolCallId,
    additional_kwargs: m.additionalKwargs,
    tool_calls: m.toolCalls,
  };
}

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${backendUrl}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  return res;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  /** IDs the backend has acknowledged — used to decide PUT vs POST on save
   *  without needing any client-side persistence. Populated from the initial
   *  list fetch and whenever a POST assigns a new id. */
  const knownSessionIdsRef = useRef<Set<string>>(new Set());

  // Load sessions on mount from backend. No client-side persistence — if the
  // backend is unavailable the list is simply empty.
  useEffect(() => {
    apiFetch("/api/chat/sessions/list")
      .then(async (res) => {
        if (!res.ok) throw new Error("Backend unavailable");
        const data: Array<{
          id: string;
          title: string;
          projectId?: string | null;
          createdAt: string;
          updatedAt: string;
        }> = await res.json();
        const mapped = data.map((s) => ({
          id: s.id,
          title: s.title,
          projectId: s.projectId ?? null,
          createdAt: new Date(s.createdAt).getTime(),
          updatedAt: new Date(s.updatedAt).getTime(),
        }));
        knownSessionIdsRef.current = new Set(mapped.map((s) => s.id));
        setSessions(mapped);
      })
      .catch(() => {
        // Backend unreachable — start with an empty list.
        setSessions([]);
      });
  }, []);

  const saveSession = useCallback(
    async (
      sessionId: string,
      messages: SerializedMessage[],
      projectId?: string | null,
    ) => {
      const title = deriveTitle(messages);
      const now = Date.now();
      const backendMessages = messages.map(toBackendMessage);
      const existsOnBackend = knownSessionIdsRef.current.has(sessionId);

      try {
        if (existsOnBackend) {
          await apiFetch(`/api/chat/sessions/${sessionId}/update`, {
            method: "PUT",
            body: JSON.stringify({ title, projectId, messages: backendMessages }),
          });
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    title,
                    updatedAt: now,
                    ...(projectId !== undefined ? { projectId } : {}),
                  }
                : s,
            ),
          );
          return sessionId;
        }

        // New session — POST and let the backend assign the canonical id.
        const res = await apiFetch("/api/chat/sessions/create", {
          method: "POST",
          body: JSON.stringify({ title, projectId, messages: backendMessages }),
        });
        if (!res.ok) return sessionId;
        const created = await res.json();
        const createdId = created.id as string;
        const createdAt = new Date(created.createdAt ?? now).getTime();
        const updatedAt = new Date(created.updatedAt ?? now).getTime();
        knownSessionIdsRef.current.add(createdId);
        setSessions((prev) => {
          const withoutTemp = prev.filter((s) => s.id !== sessionId);
          const next = [
            {
              id: createdId,
              title,
              projectId: projectId ?? null,
              createdAt,
              updatedAt,
            },
            ...withoutTemp,
          ];
          next.sort((a, b) => b.updatedAt - a.updatedAt);
          return next;
        });
        // If the caller's temp id was the active session, swap it over.
        setActiveSessionId((current) =>
          current === sessionId ? createdId : current,
        );
        return createdId;
      } catch {
        // Backend save failed — nothing to fall back to.
        return sessionId;
      }
    },
    [],
  );

  const fetchSessionMessages = useCallback(
    async (
      sessionId: string,
    ): Promise<{
      messages: SerializedMessage[];
      workflowBuilds?: WorkflowBuild[];
      projectId?: string | null;
    }> => {
      try {
        const res = await apiFetch(`/api/chat/sessions/${sessionId}/get`);
        if (res.ok) {
          const data = await res.json();
          return {
            messages: Array.isArray(data.messages)
              ? data.messages.map(fromBackendMessage)
              : [],
            workflowBuilds: data.workflowBuilds ?? undefined,
            projectId: data.projectId ?? null,
          };
        }
      } catch {
        // fall through
      }
      return { messages: [], projectId: null };
    },
    [],
  );

  const saveWorkflowBuild = useCallback(
    async (sessionId: string, publishedWorkflowId: string) => {
      try {
        await apiFetch(`/api/chat/sessions/${sessionId}/link-workflow`, {
          method: "PATCH",
          body: JSON.stringify({ publishedWorkflowId }),
        });
      } catch {
        // silent
      }
    },
    [],
  );

  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const startNewSession = useCallback(() => {
    const id = generateSessionId();
    setActiveSessionId(id);
    return id;
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    knownSessionIdsRef.current.delete(sessionId);
    setActiveSessionId((current) => (current === sessionId ? null : current));
    try {
      await apiFetch(`/api/chat/sessions/${sessionId}/delete`, { method: "DELETE" });
    } catch {
      // Ignore backend errors
    }
  }, []);

  return {
    sessions,
    activeSessionId,
    saveSession,
    switchSession,
    startNewSession,
    deleteSession,
    fetchSessionMessages,
    saveWorkflowBuild,
  };
}
