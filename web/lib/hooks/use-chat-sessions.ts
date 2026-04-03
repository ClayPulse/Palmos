import { useCallback, useEffect, useState } from "react";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
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
const MAX_SESSIONS = 50;

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
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
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Derive a title from the first user message, truncated. */
function deriveTitle(messages: SerializedMessage[]): string {
  const first = messages.find((m) => m.type === "human");
  if (!first || !first.content) return "New Chat";
  const text = typeof first.content === "string" ? first.content : "";
  return text.length > 60 ? text.slice(0, 57) + "..." : text || "New Chat";
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveId] = useState<string | null>(null);

  // Load on mount
  useEffect(() => {
    setSessions(loadSessions());
    setActiveId(getActiveSessionId());
  }, []);

  const saveSession = useCallback(
    (sessionId: string, messages: SerializedMessage[]) => {
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === sessionId);
        const title = deriveTitle(messages);
        let updated: ChatSession[];
        if (existing) {
          updated = prev.map((s) =>
            s.id === sessionId
              ? { ...s, title, messages, updatedAt: Date.now() }
              : s,
          );
        } else {
          updated = [
            {
              id: sessionId,
              title,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages,
            },
            ...prev,
          ];
        }
        // Sort by most recent
        updated.sort((a, b) => b.updatedAt - a.updatedAt);
        saveSessions(updated);
        return updated;
      });
    },
    [],
  );

  const switchSession = useCallback(
    (sessionId: string) => {
      setActiveId(sessionId);
      setActiveSessionId(sessionId);
    },
    [],
  );

  const startNewSession = useCallback(() => {
    const id = generateSessionId();
    setActiveId(id);
    setActiveSessionId(id);
    return id;
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
    // If deleting the active session, clear it
    setActiveId((current) => {
      if (current === sessionId) {
        setActiveSessionId(null);
        return null;
      }
      return current;
    });
  }, []);

  const getSession = useCallback(
    (sessionId: string): ChatSession | undefined => {
      return sessions.find((s) => s.id === sessionId);
    },
    [sessions],
  );

  return {
    sessions,
    activeSessionId,
    saveSession,
    switchSession,
    startNewSession,
    deleteSession,
    getSession,
  };
}
