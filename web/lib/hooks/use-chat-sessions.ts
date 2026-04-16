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

const STORAGE_KEY = "pulse-chat-sessions";
const ACTIVE_SESSION_KEY = "pulse-active-chat-session";
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

// ---------------------------------------------------------------------------
// localStorage helpers (used as fast cache / offline fallback)
// ---------------------------------------------------------------------------

interface LocalSession extends ChatSession {
  messages: SerializedMessage[];
}

function loadLocalSessions(): LocalSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: LocalSession[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sessions.slice(0, 50)),
  );
}

function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

function setActiveSessionId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
}

export function generateSessionId(): string {
  const randomSuffix = (() => {
    const cryptoObj = (typeof globalThis !== "undefined" && (globalThis as any).crypto) || null;
    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      const array = new Uint32Array(1);
      cryptoObj.getRandomValues(array);
      return array[0].toString(36).slice(0, 6);
    }
    // Fallback: not cryptographically secure, but keeps functionality in non‑crypto environments
    return Math.random().toString(36).slice(2, 8);
  })();
  return `session-${Date.now()}-${randomSuffix}`;
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
  const isBackendAvailable = useRef(true);

  // Load sessions on mount — try backend first, fallback to localStorage
  useEffect(() => {
    const storedActiveId = getActiveSessionId();
    setActiveSessionId(storedActiveId);

    apiFetch("/api/chat/sessions")
      .then(async (res) => {
        if (!res.ok) throw new Error("Backend unavailable");
        const data: Array<{
          id: string;
          title: string;
          projectId?: string | null;
          createdAt: string;
          updatedAt: string;
        }> = await res.json();
        isBackendAvailable.current = true;
        const mapped = data.map((s) => ({
          id: s.id,
          title: s.title,
          projectId: s.projectId ?? null,
          createdAt: new Date(s.createdAt).getTime(),
          updatedAt: new Date(s.updatedAt).getTime(),
        }));
        setSessions(mapped);
      })
      .catch(() => {
        // Fallback to localStorage
        isBackendAvailable.current = false;
        const local = loadLocalSessions();
        setSessions(
          local.map(({ messages: _, ...rest }) => rest),
        );
      });
  }, []);

  const saveSession = useCallback(
    async (sessionId: string, messages: SerializedMessage[], projectId?: string | null) => {
      const title = deriveTitle(messages);
      const now = Date.now();

      // Always update localStorage cache
      const local = loadLocalSessions();
      const existing = local.find((s) => s.id === sessionId);
      let updatedLocal: LocalSession[];
      if (existing) {
        updatedLocal = local.map((s) =>
          s.id === sessionId ? { ...s, title, messages, updatedAt: now, ...(projectId !== undefined ? { projectId } : {}) } : s,
        );
      } else {
        updatedLocal = [
          { id: sessionId, title, projectId: projectId ?? null, createdAt: now, updatedAt: now, messages },
          ...local,
        ];
      }
      updatedLocal.sort((a, b) => b.createdAt - a.createdAt);
      saveLocalSessions(updatedLocal);
      setSessions(updatedLocal.map(({ messages: _, ...rest }) => rest));

      // Sync to backend
      if (isBackendAvailable.current) {
        try {
          const backendMessages = messages.map(toBackendMessage);
          if (existing) {
            await apiFetch(`/api/chat/sessions/${sessionId}`, {
              method: "PUT",
              body: JSON.stringify({ title, projectId, messages: backendMessages }),
            });
          } else {
            const res = await apiFetch("/api/chat/sessions", {
              method: "POST",
              body: JSON.stringify({ title, projectId, messages: backendMessages }),
            });
            if (res.ok) {
              const created = await res.json();
              // Replace the local temp ID with the backend-assigned ID
              if (created.id !== sessionId) {
                const remap = loadLocalSessions().map((s) =>
                  s.id === sessionId
                    ? { ...s, id: created.id, updatedAt: new Date(created.updatedAt).getTime() }
                    : s,
                );
                saveLocalSessions(remap);
                setSessions(remap.map(({ messages: _, ...rest }) => rest));
                // Update active session ID if it was the temp one
                if (getActiveSessionId() === sessionId) {
                  setActiveSessionId(created.id);
                  setActiveSessionId(created.id);
                }
                return created.id as string;
              }
            }
          }
        } catch {
          // Backend save failed; localStorage is still the source of truth
        }
      }
      return sessionId;
    },
    [],
  );

  const fetchSessionMessages = useCallback(
    async (sessionId: string): Promise<{ messages: SerializedMessage[]; workflowBuilds?: WorkflowBuild[]; projectId?: string | null }> => {
      // Try backend first
      if (isBackendAvailable.current) {
        try {
          const res = await apiFetch(`/api/chat/sessions/${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            return {
              messages: Array.isArray(data.messages) ? data.messages.map(fromBackendMessage) : [],
              workflowBuilds: data.workflowBuilds ?? undefined,
              projectId: data.projectId ?? null,
            };
          }
        } catch {
          // fall through to localStorage
        }
      }

      // Fallback to localStorage
      const local = loadLocalSessions();
      const session = local.find((s) => s.id === sessionId);
      return { messages: session?.messages ?? [], projectId: (session as any)?.projectId ?? null };
    },
    [],
  );

  const saveWorkflowBuild = useCallback(
    async (sessionId: string, publishedWorkflowId: string) => {
      if (!isBackendAvailable.current) return;
      try {
        await apiFetch(`/api/chat/sessions/${sessionId}`, {
          method: "PATCH",
          body: JSON.stringify({ publishedWorkflowId }),
        });
      } catch {
        // silent
      }
    },
    [],
  );

  const switchSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      setActiveSessionId(sessionId);
    },
    [],
  );

  const startNewSession = useCallback(() => {
    const id = generateSessionId();
    setActiveSessionId(id);
    setActiveSessionId(id);
    return id;
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    // Remove from localStorage
    const local = loadLocalSessions().filter((s) => s.id !== sessionId);
    saveLocalSessions(local);
    setSessions(local.map(({ messages: _, ...rest }) => rest));

    // If deleting the active session, clear it
    setActiveSessionId((current) => {
      if (current === sessionId) {
        setActiveSessionId(null);
        return null;
      }
      return current;
    });

    // Delete from backend
    if (isBackendAvailable.current) {
      try {
        await apiFetch(`/api/chat/sessions/${sessionId}`, {
          method: "DELETE",
        });
      } catch {
        // Ignore backend errors
      }
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
