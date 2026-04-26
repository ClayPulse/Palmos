"use client";

import Icon from "@/components/misc/icon";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { addToast, Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import {
  FALLBACK_INBOX_AGENTS,
  FALLBACK_TEAMS,
  type Delivery,
  type InboxAgent,
  type Team,
  type Thread,
} from "@/components/views/home/fallback-inbox";
import { FALLBACK_AGENTS, type Agent } from "@/components/views/home/fallback-agents";
import { TEAM_TEMPLATES, type TeamTemplate } from "@/components/views/home/team-templates";
import { parseSuggestions } from "@/lib/utils/parse-suggestions";
import { TeamTemplateRow } from "@/components/views/home/home-view";

// ── Hooks to fetch from API with fallback ───────────────────────────────────

function useInboxAgents() {
  const [agents, setAgents] = useState<InboxAgent[]>(FALLBACK_INBOX_AGENTS);

  useEffect(() => {
    fetchAPI("/api/agent/listings")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAgents(data.map((a: any) => ({
            id: a.slug,
            name: a.name,
            role: a.role,
            hue: a.hue,
            avatar: a.avatar,
          })));
        }
      })
      .catch(() => {});
  }, []);

  return agents;
}

function useInboxTeams(): { teams: Team[]; isLoading: boolean; hasLoaded: boolean; refetch: () => Promise<void> } {
  const [teams, setTeams] = useState<Team[]>(FALLBACK_TEAMS);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI("/api/agent/teams");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setTeams(
          data.map((t: any) => ({
            id: t.id,
            name: t.name,
            icon: t.icon,
            hue: t.hue,
            goal: t.goal ?? "",
            lead:
              t.leadAgent ??
              t.members?.find((m: any) => m.role === "lead")?.agentSlug ??
              "",
            agents: t.members?.map((m: any) => m.agentSlug) ?? [],
            created: new Date(t.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            runs: t.totalRuns ?? 0,
            success: t.successRate ?? 0,
          })),
        );
      }
    } catch {
      // ignore — leaves the previous teams (or fallback) intact
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { teams, isLoading, hasLoaded, refetch };
}

function useInboxThreads(): { threads: Thread[]; isLoading: boolean; hasLoaded: boolean; refetch: () => Promise<void> } {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI("/api/agent/inbox/threads");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setThreads(
          data.map((t: any) => ({
            id: t.id,
            kind: t.kind,
            teamId: t.teamId ?? undefined,
            agentId: t.agentSlug ?? undefined,
            sessionId: t.sessionId ?? undefined,
            title: t.title,
            preview: t.preview ?? "",
            unread: t.unread ?? 0,
            pinned: t.pinned ?? false,
            updated: new Date(t.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            status: t.status ?? "active",
          })),
        );
      }
    } catch {
      // ignore — leave previous threads intact
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { threads, isLoading, hasLoaded, refetch };
}

// ── Inbox context — provides agents/teams lookup to all subcomponents ───────

const InboxDataCtx = createContext<{
  agents: InboxAgent[];
  teams: Team[];
  threads: Thread[];
  threadsLoading: boolean;
  threadsLoaded: boolean;
  teamsLoading: boolean;
  teamsLoaded: boolean;
  agentById: (id: string) => InboxAgent | undefined;
  refetchTeams: () => Promise<void>;
  refetchThreads: () => Promise<void>;
}>({
  agents: FALLBACK_INBOX_AGENTS,
  teams: FALLBACK_TEAMS,
  threads: [],
  threadsLoading: false,
  threadsLoaded: false,
  teamsLoading: false,
  teamsLoaded: false,
  agentById: (id: string) => FALLBACK_INBOX_AGENTS.find((a) => a.id === id),
  refetchTeams: async () => {},
  refetchThreads: async () => {},
});

function useInboxData() {
  return useContext(InboxDataCtx);
}

// ── Avatar components ───────────────────────────────────────────────────────

function InAvatar({ agent, size = 36, online = true }: { agent: InboxAgent; size?: number; online?: boolean }) {
  const h = agent.hue;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm"
      style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${h} 80% 60%), hsl(${(h + 30) % 360} 70% 45%))`, padding: size >= 28 ? 1.5 : 1 }}
    >
      <img src={agent.avatar} alt={agent.name} className="h-full w-full rounded-full object-cover" loading="lazy" />
      {online && size >= 28 && <span className="absolute right-0 bottom-0 h-[28%] w-[28%] rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-900" />}
    </span>
  );
}

function InAvStack({ agents, size = 28, max = 4 }: { agents: InboxAgent[]; size?: number; max?: number }) {
  const shown = agents.slice(0, max);
  const extra = agents.length - shown.length;
  return (
    <span className="inline-flex" style={{ gap: 0 }}>
      {shown.map((a, i) => (
        <span key={a.id} style={{ marginLeft: i > 0 ? -(size * 0.3) : 0, zIndex: shown.length - i }}>
          <InAvatar agent={a} size={size} online={false} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-default-200 font-semibold text-default-500 shadow-sm dark:bg-white/15 dark:text-white/60"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.38), marginLeft: -(size * 0.3), zIndex: 0 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

// ── Thread list item ────────────────────────────────────────────────────────

function ThreadListItem({ thread, active, onPick }: { thread: Thread; active: boolean; onPick: (t: Thread) => void }) {
  const { teams, agentById: lookupAgent } = useInboxData();
  const kindIcon = { dm: "person", team: "groups", notif: "notifications" }[thread.kind];
  let av: React.ReactNode;
  let kindLabel: string;

  if (thread.kind === "dm") {
    const a = lookupAgent(thread.agentId!);
    av = a ? <InAvatar agent={a} size={38} /> : null;
    kindLabel = "DM";
  } else if (thread.kind === "team") {
    const team = teams.find((t) => t.id === thread.teamId);
    const agents = (team?.agents ?? []).map(lookupAgent).filter(Boolean) as InboxAgent[];
    av = <InAvStack agents={agents} size={22} max={3} />;
    kindLabel = `TEAM · ${team?.name}`;
  } else {
    av = (
      <span className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <Icon name="bolt" variant="round" className="text-lg" />
      </span>
    );
    kindLabel = "SYSTEM";
  }

  const statusColor = {
    active: "bg-emerald-500",
    "needs-approval": "bg-amber-500 shadow-[0_0_0_3px_rgba(249,115,22,0.18)]",
    review: "bg-blue-500",
    done: "bg-default-300 dark:bg-white/25",
  }[thread.status];

  return (
    <div
      onClick={() => onPick(thread)}
      className={`grid cursor-pointer grid-cols-[auto_1fr_auto] gap-2.5 rounded-xl border px-3.5 py-3 transition-colors ${
        active
          ? "border-amber-300 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/8"
          : "border-transparent hover:bg-default-50 dark:hover:bg-white/[0.03]"
      } ${thread.unread ? "[&_.tli-title]:font-bold [&_.tli-title]:text-default-900 dark:[&_.tli-title]:text-white" : ""}`}
    >
      <div className="self-start pt-0.5">{av}</div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center justify-between gap-1.5">
          <span className="tli-title truncate text-[13.5px] font-semibold text-default-600 dark:text-white/70">{thread.kind === "dm" ? lookupAgent(thread.agentId!)?.name : thread.title}</span>
          <span className="shrink-0 text-[11px] font-medium text-default-400 dark:text-white/35">{thread.updated}</span>
        </div>
        <div className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-default-400 dark:text-white/35">
          <Icon name={kindIcon} variant="round" className="text-xs" />{kindLabel}
        </div>
        <div className="line-clamp-2 text-xs leading-snug text-default-400 dark:text-white/45">{thread.preview}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {thread.pinned && <Icon name="push_pin" variant="round" className="text-sm text-amber-500" />}
        {thread.unread > 0 && (
          <span className="min-w-[16px] rounded-full bg-amber-500 px-1.5 py-0.5 text-center text-[10.5px] font-bold text-white">{thread.unread}</span>
        )}
        <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
      </div>
    </div>
  );
}

// ── Inbox chat hook ─────────────────────────────────────────────────────────

type ChatMsg = { id: string; role: "human" | "ai" | "system"; content: string; ts: string };

// Stored AI messages may have content serialized as a JSON array of LangChain
// content blocks (tool_use, text, etc.) when Claude makes tool calls. Extract
// just the human-visible text — empty result means "no text, drop the bubble".
function extractTextContent(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((b: any) => {
            if (typeof b === "string") return b;
            if (b && typeof b === "object" && b.type === "text") return b.text ?? "";
            return "";
          })
          .join("")
          .trim();
      }
    } catch {
      // Not JSON — treat as literal text below.
    }
  }
  return trimmed;
}

function useInboxChat(thread: Thread) {
  const { teams } = useInboxData();
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const chatMsgsRef = useRef<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [text, setText] = useState("");
  const sessionIdRef = useRef<string | null>(thread.sessionId ?? null);
  const abortRef = useRef<AbortController | null>(null);
  const aiIdRef = useRef<string | null>(null);

  // Always updates the ref synchronously before queueing the React state
  // update — otherwise reads of chatMsgsRef.current right after a setMsgs
  // call (e.g., inside the same async function) would see stale data.
  const setMsgs = useCallback((updater: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) => {
    const next =
      typeof updater === "function" ? updater(chatMsgsRef.current) : updater;
    chatMsgsRef.current = next;
    setChatMsgs(next);
  }, []);

  useEffect(() => {
    setMsgs([]);
    setText("");
    sessionIdRef.current = thread.sessionId ?? null;
    aiIdRef.current = null;
    abortRef.current?.abort();

    if (!thread.id || thread.id.startsWith("pending-")) {
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    let cancelled = false;
    fetchAPI(`/api/agent/inbox/threads/${thread.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (cancelled || !data) return;
        if (data.sessionId) sessionIdRef.current = data.sessionId;
        const msgs: any[] = data.session?.messages ?? [];
        const mapped = msgs
          .filter((m: any) => m.role === "human" || m.role === "ai")
          .map((m: any) => ({
            id: m.id,
            role: m.role as "human" | "ai",
            content: extractTextContent(m.content),
            ts: new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          }))
          .filter((m) => m.content !== "");
        if (mapped.length > 0) setMsgs(mapped);
      })
      .catch((err) => {
        if (!cancelled) console.warn("[inbox-chat] failed to load history:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [thread.id, setMsgs]);

  const agentSlug =
    thread.kind === "dm"
      ? thread.agentId
      : teams.find((t) => t.id === thread.teamId)?.lead;

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !agentSlug || isLoading) return;
    const sid = sessionIdRef.current;
    if (!sid) {
      console.warn("[inbox-chat] cannot send — thread has no sessionId");
      return;
    }

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "human", content: trimmed, ts: "now" };
    setMsgs((prev) => [...prev, userMsg]);
    setText("");
    setIsLoading(true);
    aiIdRef.current = null;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const snapshot = [...chatMsgsRef.current];
      const res = await fetchAPI(`/api/agent/worker/${encodeURIComponent(agentSlug)}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: snapshot
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role === "human" ? "user" : "assistant", content: m.content })),
          sessionId: sid,
          persistToSession: true,
        }),
      });

      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      outer: while (!controller.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
          let eventType = "";
          let dataStr = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr += line.slice(6);
          }
          if (!eventType || !dataStr) continue;
          if (eventType === "end") break outer;
          if (eventType !== "messages") continue;

          let parsed: unknown;
          try { parsed = JSON.parse(dataStr); } catch { continue; }
          if (!Array.isArray(parsed) || parsed.length === 0) continue;

          // LangGraph messages format: [chunk] or ["lc", 1, [chunk]]
          const chunk: any =
            parsed.length >= 3 && typeof parsed[0] === "string" && Array.isArray(parsed[2])
              ? parsed[2][0]
              : parsed[0];
          if (!chunk) continue;

          const kwargs = chunk.kwargs ?? chunk;
          // Skip non-AI message chunks (tool calls/results, system) — only the
          // assistant's text should land in the visible chat bubble.
          const lcId = Array.isArray(chunk.id) ? chunk.id : [];
          const typeName = lcId[lcId.length - 1] ?? "";
          const kind = kwargs.type ?? kwargs.role ?? typeName ?? "";
          if (kind && !/^ai/i.test(kind) && !/AIMessage/.test(kind)) continue;

          const rawContent = kwargs.content ?? "";
          const chunkText =
            Array.isArray(rawContent)
              ? rawContent.map((b: any) => (typeof b === "string" ? b : (b.type === "text" ? (b.text ?? "") : ""))).join("")
              : typeof rawContent === "string" ? rawContent : "";
          if (!chunkText) continue;

          const msgId: string = kwargs.id ?? chunk.id ?? `ai-${Date.now()}`;
          if (!aiIdRef.current) {
            aiIdRef.current = msgId;
            setMsgs((prev) => [...prev, { id: msgId, role: "ai", content: chunkText, ts: "now" }]);
          } else if (msgId === aiIdRef.current) {
            setMsgs((prev) =>
              prev.map((m) => (m.id === aiIdRef.current ? { ...m, content: m.content + chunkText } : m)),
            );
          }
        }
      }
      reader.cancel();
    } catch (err: any) {
      if (err?.name !== "AbortError") console.warn("[inbox-chat] stream error:", err);
    } finally {
      setIsLoading(false);
      // Persistence happens server-side (via persistToSession in the request).
    }
  }, [text, agentSlug, isLoading, setMsgs]);

  return { chatMsgs, isLoading, isLoadingHistory, text, setText, submit };
}

// ── Simple chat message renderer (real API messages) ─────────────────────────

function SimpleChatMessage({ m, thread, isStreaming, onSuggestionClick }: { m: ChatMsg; thread: Thread; isStreaming?: boolean; onSuggestionClick?: (s: string) => void }) {
  const { teams, agentById: lookupAgent } = useInboxData();
  if (m.role === "system") {
    return (
      <div className="self-center rounded-full bg-default-100 px-3.5 py-1.5 text-center text-[11.5px] font-medium text-default-400 dark:bg-white/8 dark:text-white/40">
        {m.content}
      </div>
    );
  }
  if (m.role === "human") {
    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[78%]">
          <div className="rounded-[14px] rounded-tr-sm bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">
            {m.content}
          </div>
          <div className="mt-1 text-right text-[11px] text-default-400 dark:text-white/35">{m.ts}</div>
        </div>
      </div>
    );
  }
  // AI message
  const agentSlug =
    thread.kind === "dm"
      ? thread.agentId
      : teams.find((t) => t.id === thread.teamId)?.lead;
  const a = agentSlug ? lookupAgent(agentSlug) : undefined;
  const isLead = thread.kind === "team";
  const { text: displayContent, suggestions } = parseSuggestions(m.content);
  // If there's nothing to show and we're not still streaming, skip the bubble
  // entirely — better than rendering a perpetual "Thinking…" placeholder.
  if (!displayContent && suggestions.length === 0 && !isStreaming) {
    return null;
  }
  return (
    <div className="flex gap-2.5">
      {a && <InAvatar agent={a} size={32} />}
      <div className="max-w-[78%] min-w-0">
        {a && (
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-default-800 dark:text-white/90">
              {a.name}
              {isLead && (
                <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  Lead
                </span>
              )}
            </span>
            <span className="text-[11px] text-default-400 dark:text-white/35">· {m.ts}</span>
          </div>
        )}
        {(displayContent || isStreaming) && (
          <div className="rounded-[14px] rounded-tl-sm border border-default-200 bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed text-default-600 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/65 whitespace-pre-wrap">
            {displayContent || <span className="text-default-300 dark:text-white/20 italic text-sm">Thinking…</span>}
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestionClick?.(s)}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Thread view ─────────────────────────────────────────────────────────────

function ThreadView({ thread }: { thread: Thread }) {
  const { teams, agentById: lookupAgent } = useInboxData();
  const { chatMsgs, isLoading, isLoadingHistory, text, setText, submit } = useInboxChat(thread);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread.id, chatMsgs.length]);

  // Header
  let header: React.ReactNode;
  let placeholder = "Message…";

  if (thread.kind === "dm") {
    const a = lookupAgent(thread.agentId!);
    placeholder = `Message ${a?.name}…`;
    header = (
      <div className="flex shrink-0 items-center gap-3 border-b border-default-200 bg-white px-6 py-3.5 dark:border-white/8 dark:bg-white/[0.03]">
        {a && <InAvatar agent={a} size={36} />}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-default-800 dark:text-white/90">{a?.name}</div>
          <div className="mt-0.5 text-xs text-default-400 dark:text-white/45">
            {a?.role} · <span className="text-emerald-600 dark:text-emerald-400">● Online</span>
          </div>
        </div>
        <Button isIconOnly size="sm" variant="light"><Icon name="push_pin" variant="round" /></Button>
        <Button isIconOnly size="sm" variant="light"><Icon name="more_horiz" variant="round" /></Button>
      </div>
    );
  } else if (thread.kind === "team") {
    const team = teams.find((t) => t.id === thread.teamId);
    const agents = (team?.agents ?? []).map((id) => lookupAgent(id)).filter(Boolean) as InboxAgent[];
    const lead = lookupAgent(team?.lead ?? "");
    placeholder = "Message the team… use @ to address someone";
    header = (
      <div className="flex shrink-0 items-center gap-3 border-b border-default-200 bg-white px-6 py-3.5 dark:border-white/8 dark:bg-white/[0.03]">
        <InAvStack agents={agents} size={30} max={4} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-default-800 dark:text-white/90">
            <span style={{ color: `hsl(${team?.hue ?? 0} 70% 45%)` }}><Icon name={team?.icon ?? "groups"} variant="round" className="text-lg" /></span>
            {thread.title}
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <span className="h-1 w-1 rounded-full bg-emerald-500" /> Active
            </span>
          </div>
          <div className="mt-0.5 text-xs text-default-400 dark:text-white/45">
            Team: <strong className="text-default-600 dark:text-white/65">{team?.name}</strong> · {team?.agents.length} agents · Lead: <strong className="text-default-600 dark:text-white/65">{lead?.name}</strong>
          </div>
        </div>
        <Button isIconOnly size="sm" variant="light"><Icon name="person_add" variant="round" /></Button>
        <Button isIconOnly size="sm" variant="light"><Icon name="more_horiz" variant="round" /></Button>
      </div>
    );
  } else {
    header = (
      <div className="flex shrink-0 items-center gap-3 border-b border-default-200 bg-white px-6 py-3.5 dark:border-white/8 dark:bg-white/[0.03]">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <Icon name="bolt" variant="round" />
        </span>
        <div>
          <div className="text-[15px] font-semibold text-default-800 dark:text-white/90">{thread.title}</div>
          <div className="mt-0.5 text-xs text-default-400 dark:text-white/45">Palmos · system notification</div>
        </div>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <>
      {header}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[900px] flex-col gap-4 px-8 py-6">
          {isLoadingHistory && chatMsgs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
              <span className="text-[12.5px] text-default-400 dark:text-white/40">Loading conversation…</span>
            </div>
          )}
          {!isLoadingHistory && chatMsgs.length === 0 && !isLoading && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-[13px] text-default-400 dark:text-white/40">
              <Icon name="chat" variant="round" className="text-3xl" />
              <span>No messages yet — say hi to get started.</span>
            </div>
          )}
          {chatMsgs.map((m, i) => {
            const isLast = i === chatMsgs.length - 1;
            return (
              <SimpleChatMessage
                key={m.id}
                m={m}
                thread={thread}
                isStreaming={isLoading && isLast && m.role === "ai"}
                onSuggestionClick={
                  !isLoading && isLast && m.role === "ai"
                    ? (s) => { setText(s); void submit(); }
                    : undefined
                }
              />
            );
          })}
          {isLoading && chatMsgs[chatMsgs.length - 1]?.role !== "ai" && (
            <div className="flex gap-2.5">
              <div className="flex items-center gap-1 rounded-2xl border border-default-200 bg-white px-3.5 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-default-300 dark:bg-white/30"
                    style={{ animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {thread.kind !== "notif" && (
        <div className="shrink-0 border-t border-default-200 bg-white px-6 py-3.5 dark:border-white/8 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-[900px]">
            <div className="flex items-end gap-2 rounded-2xl border border-default-200 bg-default-50 px-3 py-2.5 focus-within:border-amber-300 focus-within:bg-white focus-within:shadow-sm dark:border-white/10 dark:bg-white/5 dark:focus-within:border-amber-500/30">
              <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-default-400 hover:bg-default-100 dark:text-white/40 dark:hover:bg-white/10">
                <Icon name="attach_file" variant="round" className="text-lg" />
              </button>
              <textarea
                placeholder={placeholder}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="max-h-[120px] min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm text-default-800 outline-none placeholder:text-default-400 dark:text-white/85 dark:placeholder:text-white/35"
              />
              <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-default-400 hover:bg-default-100 dark:text-white/40 dark:hover:bg-white/10">
                <Icon name="alternate_email" variant="round" className="text-lg" />
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={isLoading || !text.trim()}
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm disabled:opacity-50"
              >
                <Icon name="arrow_upward" variant="round" className="text-lg" />
              </button>
            </div>
            <div className="mt-2 flex justify-between px-1 text-[11.5px] text-default-400 dark:text-white/35">
              <span>Enter to send · Shift+Enter for newline</span>
              {isLoading && <span className="text-amber-500">Thinking…</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Context pane ────────────────────────────────────────────────────────────

function TeamContextPane({ team }: { team: Team }) {
  const { agentById: lookupAgent } = useInboxData();
  const agents = team.agents.map((id) => lookupAgent(id)).filter(Boolean) as InboxAgent[];
  const [showDeliveries, setShowDeliveries] = useState(false);

  if (showDeliveries) {
    return (
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-default-200 bg-default-50 dark:border-white/8 dark:bg-white/[0.02]">
        <DeliveriesPanel onBack={() => setShowDeliveries(false)} />
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-y-auto border-l border-default-200 bg-default-50 dark:border-white/8 dark:bg-white/[0.02]">
      <div className="border-b border-default-200 p-3 dark:border-white/8">
        <Button
          size="sm"
          variant="flat"
          className="w-full justify-start"
          startContent={<Icon name="inventory_2" variant="round" className="text-sm" />}
          onPress={() => setShowDeliveries(true)}
        >
          Deliveries
        </Button>
      </div>
      <div className="border-b border-default-200 p-4 dark:border-white/8">
        <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-default-400 dark:text-white/40">Goal</div>
        <p className="text-[13px] leading-relaxed text-default-600 dark:text-white/65">{team.goal}</p>
      </div>
      <div className="border-b border-default-200 p-4 dark:border-white/8">
        <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-default-400 dark:text-white/40">Performance</div>
        <div className="flex flex-col gap-1.5">
          {[["Runs", team.runs.toLocaleString()], ["Success rate", `${Math.round(team.success * 100)}%`], ["Created", team.created]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-default-400 dark:text-white/40">{k}</span>
              <span className="font-semibold text-default-800 dark:text-white/90">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-b border-default-200 p-4 dark:border-white/8">
        <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-default-400 dark:text-white/40">Roster</div>
        <div className="flex flex-col gap-2.5">
          {agents.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5">
              <InAvatar agent={a} size={34} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-default-800 dark:text-white/90">
                  {a.name}
                  {a.id === team.lead && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">Lead</span>
                  )}
                </div>
                <div className="text-xs text-default-400 dark:text-white/40">{a.role}</div>
              </div>
              <Button isIconOnly size="sm" variant="light"><Icon name="chat" variant="round" className="text-sm" /></Button>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-default-400 dark:text-white/40">Linked tools</div>
        <div className="flex flex-wrap gap-1.5">
          {["Apollo", "Gmail", "HubSpot", "Crunchbase", "Slack"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-default-100 px-2 py-0.5 text-[11px] font-medium text-default-500 dark:bg-white/8 dark:text-white/50">
              <Icon name="extension" variant="round" className="text-[13px]" />{t}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ── DM Context pane ─────────────────────────────────────────────────────────

function DMContextPane({ thread }: { thread: Thread }) {
  const { agentById: lookupAgent } = useInboxData();
  const a = lookupAgent(thread.agentId!);
  const [showDeliveries, setShowDeliveries] = useState(false);
  if (!a) return null;

  if (showDeliveries) {
    return (
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-default-200 bg-default-50 dark:border-white/8 dark:bg-white/[0.02]">
        <DeliveriesPanel agentId={a.id} onBack={() => setShowDeliveries(false)} />
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-y-auto border-l border-default-200 bg-default-50 dark:border-white/8 dark:bg-white/[0.02]">
      <div className="border-b border-default-200 p-3 dark:border-white/8">
        <Button
          size="sm"
          variant="flat"
          className="w-full justify-start"
          startContent={<Icon name="inventory_2" variant="round" className="text-sm" />}
          onPress={() => setShowDeliveries(true)}
        >
          Deliveries
        </Button>
      </div>
      <div className="p-4">
        <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-default-400 dark:text-white/40">About this thread</div>
        <div className="flex items-center gap-3">
          <InAvatar agent={a} size={44} />
          <div>
            <div className="text-sm font-semibold text-default-800 dark:text-white/90">{a.name}</div>
            <div className="mt-0.5 text-xs text-default-400 dark:text-white/45">{a.role}</div>
          </div>
        </div>
        <Button size="sm" variant="flat" className="mt-3 w-full" startContent={<Icon name="person_add" variant="round" className="text-sm" />}>
          Add to a team
        </Button>
      </div>
    </aside>
  );
}

// ── Deliveries panel ────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
  awaiting:     { label: "Awaiting review",  cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",   icon: "schedule" },
  "changes-req":{ label: "Changes requested",cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",       icon: "edit_note" },
  approved:     { label: "Approved",         cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", icon: "check_circle" },
  sent:         { label: "Sent",             cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", icon: "send" },
  archived:     { label: "Archived",         cls: "bg-default-100 text-default-500 dark:bg-white/8 dark:text-white/40",   icon: "archive" },
};

function DeliveriesPanel({ agentId, onBack }: { agentId?: string; onBack: () => void }) {
  const { agentById: lookupAgent } = useInboxData();
  const deliveries: Delivery[] = [];
  void agentId;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-default-200 p-3 dark:border-white/8">
        <Button isIconOnly size="sm" variant="light" onPress={onBack}>
          <Icon name="arrow_back" variant="round" className="text-sm" />
        </Button>
        <span className="text-[13px] font-semibold text-default-800 dark:text-white/90">Deliveries</span>
        {deliveries.length > 0 && (
          <span className="ml-auto inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {deliveries.filter((d) => d.status === "awaiting").length} awaiting
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {deliveries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-[13px] text-default-400 dark:text-white/40">
            <Icon name="inbox" variant="round" className="text-3xl" />
            <span>No deliveries yet</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {deliveries.map((d) => {
              const meta = STATUS_META[d.status] ?? STATUS_META.archived;
              const agent = lookupAgent(d.agentId);
              return (
                <div key={d.id} className="rounded-xl border border-default-200 bg-white p-3 dark:border-white/8 dark:bg-white/[0.03]">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <span className="text-[13px] font-semibold text-default-800 dark:text-white/90 leading-snug">{d.task}</span>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta.cls}`}>
                      <Icon name={meta.icon} variant="round" className="text-[12px]" />
                      {d.itemCount}
                    </span>
                  </div>
                  <p className="mb-2 line-clamp-2 text-[12px] leading-relaxed text-default-500 dark:text-white/50">{d.summary}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {agent && <InAvatar agent={agent} size={16} online={false} />}
                      <span className="text-[11px] text-default-400 dark:text-white/35">{d.when}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                      <Icon name={meta.icon} variant="round" className="text-[11px]" />
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Teams grid ──────────────────────────────────────────────────────────────

export function TeamsGrid({
  onNew,
  onOpen,
  busyTemplateSlug,
  onCreateFromTemplate,
}: {
  onNew: () => void;
  onOpen: (team: Team) => void;
  busyTemplateSlug: string | null;
  onCreateFromTemplate: (template: TeamTemplate) => void;
}) {
  const { teams: allTeams, agents: inboxAgents, teamsLoading, teamsLoaded, agentById: lookupAgent, refetchTeams } = useInboxData();
  const [pendingDelete, setPendingDelete] = useState<Team | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestDelete = useCallback((team: Team, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setPendingDelete(team);
  }, []);
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const team = pendingDelete;
    setDeletingId(team.id);
    try {
      const res = await fetchAPI(`/api/agent/teams/${team.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        addToast({ title: "Couldn't delete team", description: `Status ${res.status}`, color: "danger" });
        return;
      }
      addToast({ title: `Deleted "${team.name}"` });
      await refetchTeams();
      setPendingDelete(null);
    } catch (err) {
      addToast({ title: "Couldn't delete team", description: err instanceof Error ? err.message : "Unknown error", color: "danger" });
    } finally {
      setDeletingId(null);
    }
  }, [pendingDelete, refetchTeams]);
  // Map any agent slug → minimal avatar fields. We try the inbox agent set
  // first (these are the user's hired agents, so they have real avatars)
  // and fall back to the marketplace fallback for slugs the user hasn't
  // hired yet — that way templates always render even before any hires.
  const inboxBySlug = useMemo(() => {
    const m = new Map<string, InboxAgent>();
    for (const a of inboxAgents) m.set(a.id, a);
    return m;
  }, [inboxAgents]);
  const fallbackBySlug = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of FALLBACK_AGENTS) m.set(a.id, a);
    return m;
  }, []);
  const agentBySlug = useCallback(
    (slug: string) => inboxBySlug.get(slug) ?? fallbackBySlug.get(slug),
    [inboxBySlug, fallbackBySlug],
  );
  return (
    // min-h-0 is required so this flex-1 child can actually shrink and let
    // overflow-y-auto take effect — otherwise the flex column treats it as
    // min-content height and the page scrolls the whole layout instead.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-7 py-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-default-900 dark:text-white">Your agent teams</h1>
            <p className="mt-1 text-[13.5px] text-default-400 dark:text-white/45">Groups of agents assembled around a goal. A lead coordinates the rest.</p>
          </div>
          <Button className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white" onPress={onNew} startContent={<Icon name="add" variant="round" />}>
            New team
          </Button>
        </div>

        {/* Premade teams reminder — always visible above the user's teams.
            Functions as the empty-state when allTeams is empty, and as a
            "spin up another quickly" prompt otherwise. */}
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-orange-50/30 p-4 dark:border-amber-500/20 dark:from-amber-500/5 dark:to-orange-500/3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[15px] font-bold text-default-800 dark:text-white/90">
                {allTeams.length === 0 ? "Start with a premade team" : "Need another team?"}
              </div>
              <p className="mt-0.5 text-[12.5px] text-default-500 dark:text-white/55">
                Curated rosters that ship with a goal, lead, and starting agents.
              </p>
            </div>
          </div>
          <TeamTemplateRow
            templates={TEAM_TEMPLATES}
            agentBySlug={agentBySlug}
            busySlug={busyTemplateSlug}
            onCreate={onCreateFromTemplate}
            variant="row"
          />
        </div>
        {teamsLoading && !teamsLoaded ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
            <span className="text-[13px] text-default-400 dark:text-white/40">Loading your teams…</span>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {allTeams.map((team) => {
            const agents = team.agents.map((id) => lookupAgent(id)).filter(Boolean) as InboxAgent[];
            const lead = lookupAgent(team.lead);
            return (
              <button key={team.id} type="button" onClick={() => onOpen(team)} className="group relative flex flex-col gap-3.5 rounded-2xl border border-default-200 bg-white p-4.5 text-left transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-500/30">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Delete team ${team.name}`}
                  onClick={(e) => requestDelete(team, e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      requestDelete(team, e);
                    }
                  }}
                  className={`absolute right-2.5 top-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-lg text-default-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:text-white/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${deletingId === team.id ? "pointer-events-none opacity-100" : ""}`}
                >
                  <Icon name={deletingId === team.id ? "hourglass_empty" : "delete_outline"} variant="round" className="text-base" />
                </span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white text-[22px]" style={{ background: `linear-gradient(135deg, hsl(${team.hue} 80% 62%), hsl(${(team.hue + 30) % 360} 70% 45%))` }}>
                    <Icon name={team.icon} variant="round" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-default-800 dark:text-white/90">{team.name}</div>
                    <div className="mt-0.5 text-xs leading-snug text-default-400 dark:text-white/45">{team.goal}</div>
                  </div>
                  <div className="flex gap-4.5 shrink-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-default-800 dark:text-white/90">{team.runs.toLocaleString()}</span>
                      <span className="text-[10.5px] font-medium uppercase tracking-wide text-default-400 dark:text-white/40">Runs</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-default-800 dark:text-white/90">{Math.round(team.success * 100)}%</span>
                      <span className="text-[10.5px] font-medium uppercase tracking-wide text-default-400 dark:text-white/40">Success</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 border-t border-default-200 pt-3 dark:border-white/8">
                  <InAvStack agents={agents} size={28} max={5} />
                  <span className="flex-1 text-xs font-medium text-default-400 dark:text-white/45">Led by <strong className="text-default-800 dark:text-white/90">{lead?.name}</strong> · {agents.length} agents</span>
                </div>
              </button>
            );
          })}
          <button type="button" onClick={onNew} className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-default-200 text-default-400 transition-colors hover:border-amber-300 hover:bg-amber-50/30 hover:text-amber-600 dark:border-white/10 dark:hover:border-amber-500/25 dark:hover:text-amber-400">
            <Icon name="add_circle" variant="round" className="text-3xl" />
            <div className="text-sm font-medium">Create a new team</div>
            <div className="max-w-[200px] text-center text-xs text-default-400 dark:text-white/40">Pick agents, assign a lead, set a goal. Ready in 2 minutes.</div>
          </button>
        </div>
        )}
      </div>
      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => { if (deletingId === null) setPendingDelete(null); }}
        size="sm"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                  <Icon name="delete_outline" variant="round" className="text-lg" />
                </span>
                Delete team?
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600 dark:text-white/70">
                  This will permanently delete{" "}
                  <strong className="text-default-900 dark:text-white">{pendingDelete?.name}</strong>
                  {" "}and remove all of its threads. This cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={deletingId !== null}>
                  Cancel
                </Button>
                <Button color="danger" onPress={confirmDelete} isLoading={deletingId !== null}>
                  Delete team
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

// ── Create team wizard ──────────────────────────────────────────────────────

const ICON_OPTIONS = ["trending_up", "receipt_long", "support_agent", "palette", "campaign", "query_stats", "bolt", "rocket_launch", "design_services", "science", "handshake", "inventory_2"];
const HUE_OPTIONS = [30, 0, 310, 260, 210, 190, 160, 130];

export function CreateTeamWizard({ onDone }: { onDone: () => void }) {
  const { agents: allAgents, agentById: lookupAgent, refetchTeams } = useInboxData();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [icon, setIcon] = useState("trending_up");
  const [hue, setHue] = useState(30);
  const [selected, setSelected] = useState<string[]>([]);
  const [lead, setLead] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const agents = selected.map((id) => lookupAgent(id)).filter(Boolean) as InboxAgent[];
  const steps = ["Basics", "Roster", "Lead", "Review"];

  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetchAPI("/api/agent/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim() || undefined,
          icon,
          hue,
          agents: selected,
          lead: lead || selected[0],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Create team failed: ${res.status}`);
      }
      addToast({ title: `Created team "${name.trim()}"`, color: "success" });
      await refetchTeams();
      onDone();
    } catch (err) {
      addToast({
        title: "Couldn't create team",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, name, goal, icon, hue, selected, lead, refetchTeams, onDone]);

  return (
    // min-h-0 lets this flex-1 child shrink so overflow-y-auto activates.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[720px] flex-col gap-5 px-8 py-7">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="contents">
              <div className={`flex items-center gap-2 text-[13px] font-medium ${i === step ? "text-default-800 dark:text-white/90" : i < step ? "text-emerald-600 dark:text-emerald-400" : "text-default-400 dark:text-white/40"}`}>
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  i === step ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm" : i < step ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-default-100 text-default-400 dark:bg-white/8 dark:text-white/40"
                }`}>
                  {i < step ? <Icon name="check" variant="round" className="text-sm" /> : i + 1}
                </span>
                {label}
              </div>
              {i < 3 && <div className={`h-0.5 flex-1 rounded-full ${i < step ? "bg-emerald-500" : "bg-default-200 dark:bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Basics */}
        {step === 0 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-default-900 dark:text-white">Name your team</h1>
              <p className="mt-1.5 text-sm text-default-400 dark:text-white/45">Give it a clear goal — your agents plan themselves around it.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-default-500 dark:text-white/50">Team name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Growth Ops" autoFocus className="rounded-xl border border-default-200 bg-white px-3.5 py-2.5 text-sm text-default-800 outline-none focus:border-amber-300 focus:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/85 dark:focus:border-amber-500/30" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-default-500 dark:text-white/50">Goal / mission</label>
              <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} placeholder="What is this team responsible for? The more specific, the better they coordinate." className="rounded-xl border border-default-200 bg-white px-3.5 py-2.5 text-sm text-default-800 outline-none focus:border-amber-300 focus:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/85 dark:focus:border-amber-500/30" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-default-500 dark:text-white/50">Icon</label>
              <div className="grid grid-cols-8 gap-1.5">
                {ICON_OPTIONS.map((ic) => (
                  <button key={ic} type="button" onClick={() => setIcon(ic)} className={`flex aspect-square items-center justify-center rounded-xl border-[1.5px] transition-colors ${icon === ic ? "border-amber-400 bg-amber-50 text-amber-600 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400" : "border-default-200 bg-white text-default-500 hover:border-amber-200 dark:border-white/10 dark:bg-white/5 dark:text-white/50"}`}>
                    <Icon name={ic} variant="round" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-default-500 dark:text-white/50">Color</label>
              <div className="grid grid-cols-8 gap-1.5">
                {HUE_OPTIONS.map((h) => (
                  <button key={h} type="button" onClick={() => setHue(h)} className={`aspect-square rounded-xl ${hue === h ? "scale-105 border-[2.5px] border-default-800 shadow-md dark:border-white" : "border-[2.5px] border-transparent"}`} style={{ background: `linear-gradient(135deg, hsl(${h} 80% 62%), hsl(${(h + 30) % 360} 70% 45%))` }} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 1: Roster */}
        {step === 1 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-default-900 dark:text-white">Pick your roster</h1>
              <p className="mt-1.5 text-sm text-default-400 dark:text-white/45">Add 2–6 agents. Mix specialties so they can hand off to each other.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {allAgents.map((a) => {
                const on = selected.includes(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => toggle(a.id)} className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-xl border-[1.5px] bg-white px-3 py-2.5 text-left transition-colors ${on ? "border-amber-400 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/8" : "border-default-200 hover:border-amber-200 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-500/15"}`}>
                    <InAvatar agent={a} size={36} online={false} />
                    <div>
                      <div className="text-[13.5px] font-semibold text-default-800 dark:text-white/90">{a.name}</div>
                      <div className="mt-0.5 text-xs text-default-400 dark:text-white/45">{a.role}</div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-default-100 px-2 py-0.5 text-[11px] font-medium text-default-500 dark:bg-white/8 dark:text-white/50">
                      <Icon name="star" variant="round" className="text-xs text-amber-400" /> 4.{7 + (a.hue % 3)}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${on ? "border-amber-300 text-amber-600 dark:border-amber-500/25 dark:text-amber-400" : "border-default-200 text-default-400 dark:border-white/10 dark:text-white/40"}`}>
                      <Icon name={on ? "check_circle" : "add"} variant="round" className="text-sm" />
                      {on ? "Added" : "Add"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-xs font-medium text-default-400 dark:text-white/45">{selected.length} agent{selected.length === 1 ? "" : "s"} selected</div>
          </>
        )}

        {/* Step 2: Lead */}
        {step === 2 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-default-900 dark:text-white">Choose a lead</h1>
              <p className="mt-1.5 text-sm text-default-400 dark:text-white/45">The lead coordinates handoffs, proposes plans, and reports back to you.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {agents.map((a) => (
                <button key={a.id} type="button" onClick={() => setLead(a.id)} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border-[1.5px] bg-white px-3 py-2.5 text-left transition-colors ${lead === a.id ? "border-amber-400 bg-amber-50 shadow-sm dark:border-amber-500/25 dark:bg-amber-500/8" : "border-default-200 hover:border-amber-200 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-500/15"}`}>
                  <InAvatar agent={a} size={36} online={false} />
                  <div>
                    <div className="text-[13.5px] font-semibold text-default-800 dark:text-white/90">{a.name}</div>
                    <div className="mt-0.5 text-xs text-default-400 dark:text-white/45">{a.role}</div>
                  </div>
                  {lead === a.id ? (
                    <span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Lead</span>
                  ) : (
                    <span className="rounded-full border border-default-200 px-2.5 py-1 text-[11.5px] font-medium text-default-400 dark:border-white/10 dark:text-white/40">Make lead</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-default-900 dark:text-white">Ready to ship</h1>
              <p className="mt-1.5 text-sm text-default-400 dark:text-white/45">Here&apos;s your new team. You can invite more agents or adjust the lead any time.</p>
            </div>
            <div className="flex flex-col gap-2.5 rounded-[14px] border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-4.5 dark:border-amber-500/15 dark:from-amber-500/5 dark:to-orange-500/3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white text-[22px]" style={{ background: `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 30) % 360} 70% 45%))` }}>
                  <Icon name={icon} variant="round" />
                </span>
                <div>
                  <div className="text-base font-bold text-default-800 dark:text-white/90">{name || "Untitled team"}</div>
                  <div className="mt-0.5 text-[13px] text-default-600 dark:text-white/65">{goal || "No goal set."}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <InAvStack agents={agents} size={30} max={6} />
                <span className="text-[13px] font-medium text-default-500 dark:text-white/55">
                  Led by <strong className="text-default-800 dark:text-white/90">{lookupAgent(lead)?.name}</strong> · {agents.length} agents
                </span>
              </div>
            </div>
          </>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-default-200 pt-3.5 dark:border-white/8">
          <Button variant="light" onPress={() => step === 0 ? onDone() : setStep((s) => s - 1)} startContent={<Icon name="arrow_back" variant="round" className="text-sm" />}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < 3 ? (
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white"
              // Block Continue when the current step is incomplete:
              //   step 0: name required
              //   step 1: at least one agent selected
              //   step 2: lead chosen
              isDisabled={
                (step === 0 && !name.trim()) ||
                (step === 1 && selected.length === 0) ||
                (step === 2 && !lead)
              }
              onPress={() => setStep((s) => s + 1)}
              endContent={<Icon name="arrow_forward" variant="round" className="text-sm" />}
            >
              Continue
            </Button>
          ) : (
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white"
              isDisabled={submitting || !name.trim() || selected.length === 0}
              isLoading={submitting}
              onPress={submit}
              startContent={
                submitting ? null : (
                  <Icon name="rocket_launch" variant="round" className="text-sm" />
                )
              }
            >
              {submitting ? "Hiring…" : "Hire team"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main inbox view (Linear-style 3-pane) ───────────────────────────────────

export default function InboxView() {
  const inboxAgents = useInboxAgents();
  const { teams: inboxTeams, isLoading: teamsLoading, hasLoaded: teamsLoaded, refetch: refetchTeams } = useInboxTeams();
  const { threads: inboxThreads, isLoading: threadsLoading, hasLoaded: threadsLoaded, refetch: refetchThreads } = useInboxThreads();

  const ctxValue = useMemo(() => ({
    agents: inboxAgents,
    teams: inboxTeams,
    threads: inboxThreads,
    threadsLoading,
    threadsLoaded,
    teamsLoading,
    teamsLoaded,
    agentById: (id: string) => inboxAgents.find((a) => a.id === id),
    refetchTeams,
    refetchThreads,
  }), [inboxAgents, inboxTeams, inboxThreads, threadsLoading, threadsLoaded, teamsLoading, teamsLoaded, refetchTeams, refetchThreads]);

  return (
    <InboxDataCtx.Provider value={ctxValue}>
      <InboxViewInner />
    </InboxDataCtx.Provider>
  );
}

async function ensureRealThread(thread: Thread): Promise<Thread | null> {
  if (thread.sessionId) return thread;
  const res = await fetchAPI("/api/agent/inbox/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: thread.kind,
      title: thread.title,
      agentSlug: thread.agentId,
      teamId: thread.teamId,
    }),
  });
  if (!res.ok) return null;
  const created = await res.json();
  return {
    ...thread,
    id: created.id,
    sessionId: created.sessionId ?? undefined,
  };
}

function InboxViewInner() {
  const { teams: TEAMS, threads: THREADS, threadsLoading, threadsLoaded, teamsLoading, teamsLoaded, refetchTeams, refetchThreads } = useInboxData();
  const [tab, setTab] = useState<"inbox" | "teams" | "create">("inbox");
  const [active, setActive] = useState<Thread | null>(null);
  const [filter, setFilter] = useState("all");
  const [busyTemplateSlug, setBusyTemplateSlug] = useState<string | null>(null);

  // Ensures the thread has a real DB sessionId (lazy-creating one if it's a
  // fallback thread), then activates it. Without this, fallback threads fail
  // to persist chat history.
  const openThread = useCallback(async (thread: Thread) => {
    if (thread.sessionId) {
      setActive(thread);
      return;
    }
    const real = await ensureRealThread(thread);
    if (real?.sessionId) {
      setActive(real);
      void refetchThreads();
    } else {
      // Could not create a real thread — open the placeholder anyway so the
      // user sees the UI; persistence will be skipped with a console warning.
      setActive(thread);
    }
  }, [refetchThreads]);

  const createTeamFromTemplate = useCallback(
    async (template: TeamTemplate) => {
      if (busyTemplateSlug) return;
      setBusyTemplateSlug(template.slug);
      try {
        const res = await fetchAPI("/api/agent/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: template.name,
            goal: template.goal,
            icon: template.icon,
            hue: template.hue,
            agents: template.agents,
            lead: template.lead,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `Create failed: ${res.status}`);
        }
        addToast({ title: `Created team "${template.name}"`, color: "success" });
        await refetchTeams();
      } catch (err) {
        addToast({
          title: "Couldn't create team",
          description: err instanceof Error ? err.message : "Unknown error",
          color: "danger",
        });
      } finally {
        setBusyTemplateSlug(null);
      }
    },
    [busyTemplateSlug, refetchTeams],
  );

  // Set initial active thread once threads load — but only auto-pick threads
  // that already have a real DB sessionId, so we don't spam-create empty
  // threads on every mount.
  useEffect(() => {
    if (active) return;
    const realThread = THREADS.find((t) => t.sessionId);
    if (realThread) setActive(realThread);
  }, [THREADS, active]);

  const unread = THREADS.reduce((n, t) => n + (t.unread || 0), 0);
  const filtered = THREADS.filter((t) =>
    filter === "all" ? true : filter === "unread" ? t.unread > 0 : filter === t.kind,
  );
  const team = active?.kind === "team" ? TEAMS.find((t) => t.id === active.teamId) : null;

  return (
    // We are a flex child of HomeView (a flex-col h-full container). Using
    // `h-full` here misbehaves once siblings (the page nav) take their own
    // space — the column distributes by flex grow + min-h-0, not by 100%
    // height. Hence flex-1 + min-h-0 instead of h-full.
    <div className="flex min-h-0 w-full flex-1 flex-col bg-white dark:bg-[#0d0d14]">
      {/* Nav */}
      <div className="flex shrink-0 items-center gap-5 border-b border-default-200 bg-white px-6 py-3 dark:border-white/8 dark:bg-[#0d0d14]">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setTab("inbox")} className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors ${tab === "inbox" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "text-default-400 hover:bg-default-50 hover:text-default-800 dark:text-white/45 dark:hover:bg-white/[0.03] dark:hover:text-white/80"}`}>
            <Icon name="inbox" variant="round" className="text-[17px]" />
            Inbox
            {unread > 0 && <span className="min-w-[18px] rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0.5 text-center text-[10.5px] font-bold text-white">{unread}</span>}
          </button>
          <button type="button" onClick={() => setTab("teams")} className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors ${tab === "teams" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "text-default-400 hover:bg-default-50 hover:text-default-800 dark:text-white/45 dark:hover:bg-white/[0.03] dark:hover:text-white/80"}`}>
            <Icon name="groups" variant="round" className="text-[17px]" />
            Teams
          </button>
          <button type="button" onClick={() => setTab("create")} className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors ${tab === "create" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "text-default-400 hover:bg-default-50 hover:text-default-800 dark:text-white/45 dark:hover:bg-white/[0.03] dark:hover:text-white/80"}`}>
            <Icon name="add_circle" variant="round" className="text-[17px]" />
            New team
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button isIconOnly size="sm" variant="light"><Icon name="search" variant="round" /></Button>
          <Button isIconOnly size="sm" variant="light"><Icon name="settings" variant="round" /></Button>
        </div>
      </div>

      {/* Content */}
      {tab === "inbox" && (
        <div className="grid min-h-0 flex-1 grid-cols-[360px_1fr_320px]">
          {/* Thread list — min-h-0 + min-w-0 are required because grid items
              otherwise default to min-content size and the inner flex-1
              overflow-y-auto can never shrink to clip. */}
          <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-default-200 dark:border-white/8">
            <div className="flex shrink-0 items-center justify-between border-b border-default-200 px-4 py-3 dark:border-white/8">
              <h2 className="text-base font-bold text-default-800 dark:text-white/90">Inbox</h2>
              <Button isIconOnly size="sm" variant="light"><Icon name="filter_list" variant="round" /></Button>
            </div>
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-default-200 px-4 py-2.5 dark:border-white/8 [&::-webkit-scrollbar]:hidden">
              {[["all", "All"], ["unread", "Unread"], ["dm", "DMs"], ["team", "Teams"], ["notif", "System"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${filter === k ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300" : "border-default-200 bg-white text-default-500 hover:border-amber-200 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50"}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {threadsLoading && THREADS.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
                  <span className="text-[12.5px] text-default-400 dark:text-white/40">Loading inbox…</span>
                </div>
              ) : threadsLoaded && filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-[12.5px] text-default-400 dark:text-white/40">
                  <Icon name="inbox" variant="round" className="text-2xl" />
                  <span>No conversations yet</span>
                </div>
              ) : (
                filtered.map((t) => (
                  <ThreadListItem key={t.id} thread={t} active={active?.id === t.id} onPick={openThread} />
                ))
              )}
            </div>
          </aside>

          {/* Thread view — min-h-0 lets the inner messages list scroll and
              the composer stays anchored to the bottom. */}
          <main className="flex min-h-0 min-w-0 flex-col">
            {active && <ThreadView thread={active} />}
          </main>

          {/* Context pane */}
          {team ? (
            <TeamContextPane team={team} />
          ) : active?.kind === "dm" ? (
            <DMContextPane thread={active} />
          ) : (
            <aside className="flex min-h-0 min-w-0 flex-col border-l border-default-200 bg-default-50 p-4 dark:border-white/8 dark:bg-white/[0.02]">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-default-400 dark:text-white/40">About this thread</div>
              <p className="mt-2 text-[13px] text-default-400 dark:text-white/45">System-generated digest. Delivered every Monday at 9 AM.</p>
            </aside>
          )}
        </div>
      )}

      {tab === "teams" && (
        <TeamsGrid
          onNew={() => setTab("create")}
          onOpen={async (t) => {
            // Prefer an existing real thread for this team; otherwise build a
            // placeholder and let openThread lazy-create the DB row.
            const placeholder: Thread = THREADS.find((x) => x.teamId === t.id && x.sessionId) ?? {
              id: `pending-${t.id}`,
              kind: "team",
              teamId: t.id,
              title: t.name,
              preview: "",
              unread: 0,
              pinned: false,
              updated: "now",
              status: "active",
            };
            setFilter("all");
            setTab("inbox");
            await openThread(placeholder);
          }}
          busyTemplateSlug={busyTemplateSlug}
          onCreateFromTemplate={createTeamFromTemplate}
        />
      )}

      {tab === "create" && <CreateTeamWizard onDone={() => setTab("teams")} />}
    </div>
  );
}
