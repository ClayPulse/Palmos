"use client";

import Icon from "@/components/misc/icon";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Button } from "@heroui/react";
import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import {
  FALLBACK_INBOX_AGENTS,
  FALLBACK_TEAMS,
  FALLBACK_THREADS,
  type InboxAgent,
  type Team,
  type Thread,
} from "@/components/views/home/fallback-inbox";

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

function useInboxTeams() {
  const [teams, setTeams] = useState<Team[]>(FALLBACK_TEAMS);

  useEffect(() => {
    fetchAPI("/api/agent/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data.map((t: any) => ({
            id: t.id,
            name: t.name,
            icon: t.icon,
            hue: t.hue,
            goal: t.goal ?? "",
            lead: t.leadAgent ?? t.members?.find((m: any) => m.role === "lead")?.agentSlug ?? "",
            agents: t.members?.map((m: any) => m.agentSlug) ?? [],
            created: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            runs: t.totalRuns ?? 0,
            success: t.successRate ?? 0,
          })));
        }
      })
      .catch(() => {});
  }, []);

  return teams;
}

function useInboxThreads() {
  const [threads, setThreads] = useState<Thread[]>(FALLBACK_THREADS);

  useEffect(() => {
    fetchAPI("/api/agent/inbox/threads")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setThreads(data.map((t: any) => ({
            id: t.id,
            kind: t.kind,
            teamId: t.teamId ?? undefined,
            agentId: t.agentSlug ?? undefined,
            title: t.title,
            preview: t.preview ?? "",
            unread: t.unread ?? 0,
            pinned: t.pinned ?? false,
            updated: new Date(t.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            status: t.status ?? "active",
          })));
        }
      })
      .catch(() => {});
  }, []);

  return threads;
}

// ── Inbox context — provides agents/teams lookup to all subcomponents ───────

const InboxDataCtx = createContext<{
  agents: InboxAgent[];
  teams: Team[];
  threads: Thread[];
  agentById: (id: string) => InboxAgent | undefined;
}>({
  agents: FALLBACK_INBOX_AGENTS,
  teams: FALLBACK_TEAMS,
  threads: FALLBACK_THREADS,
  agentById: (id: string) => FALLBACK_INBOX_AGENTS.find((a) => a.id === id),
});

function useInboxData() {
  return useContext(InboxDataCtx);
}

function agentById(id: string): InboxAgent | undefined {
  return FALLBACK_INBOX_AGENTS.find((a) => a.id === id);
}

// ── Messages ────────────────────────────────────────────────────────────────

type PlanItem = { who: string; task: string; eta: string };
type ToolRef = { name: string; icon: string };
type Approval = { from: string; subject: string; draft: string; confidence: number };
type Preview = { subject: string; snippet: string };
type DigestStat = { k: string; v: string; delta: string };
type DigestHighlight = { agent: string; text: string };

type Msg = {
  id: string;
  role: "system" | "you" | "agent" | "handoff" | "digest";
  agentId?: string;
  at: string;
  text?: string;
  lead?: boolean;
  plan?: PlanItem[];
  footer?: string;
  tools?: ToolRef[];
  approval?: Approval;
  preview?: Preview;
  from?: string;
  to?: string;
  note?: string;
  stats?: DigestStat[];
  highlights?: DigestHighlight[];
};

const MSG_GROWTH: Msg[] = [
  { id: "m1", role: "system", at: "Yesterday", text: 'Team "Growth Ops" started a new goal: Q2 outbound push.' },
  { id: "m2", role: "you", at: "Yesterday 4:12 PM", text: "We want to hit 50 warm demos from outbound this quarter. Can you take it from here?" },
  { id: "m3", role: "agent", agentId: "vale", at: "Yesterday 4:13 PM", lead: true, text: "On it. I'll coordinate. Here's how I'm splitting the work:", plan: [
    { who: "vale", task: "Pull 500 ICP-matched leads from Apollo, score and rank.", eta: "1 hr" },
    { who: "atlas", task: "Research top 50 accounts — pain points, recent news.", eta: "2 hr" },
    { who: "lyra", task: "Draft 3 sequence templates tuned to each persona.", eta: "45 min" },
    { who: "ember", task: "Spin up LinkedIn retargeting ads for anyone who clicks.", eta: "on trigger" },
  ], footer: "I'll hold until you approve the plan." },
  { id: "m4", role: "you", at: "Yesterday 4:20 PM", text: "Approved. One constraint — no more than 40 sends/day per mailbox." },
  { id: "m5", role: "agent", agentId: "vale", at: "Yesterday 4:21 PM", lead: true, text: "Noted. Baking a 40/day throttle into the sequence. Kicking off now." },
  { id: "m6", role: "handoff", from: "vale", to: "atlas", at: "Yesterday 4:22 PM", note: "Ranked list of 50 accounts with scores attached." },
  { id: "m7", role: "agent", agentId: "atlas", at: "Yesterday 6:48 PM", text: "Research done for 50/50 accounts. Found 14 with recent funding events — flagging as hot.", tools: [{ name: "Web", icon: "language" }, { name: "Crunchbase", icon: "business" }] },
  { id: "m8", role: "handoff", from: "atlas", to: "lyra", at: "Yesterday 6:49 PM", note: "Briefs + angles delivered. Lyra's turn." },
  { id: "m9", role: "agent", agentId: "lyra", at: "Today 8:02 AM", text: 'Three sequence templates ready — "funding playbook", "competitive switch", "bottoms-up signal". Preview the first touch below.', preview: { subject: "Saw the Series B, Dana — quick thought", snippet: "Congrats on the raise. Teams at your stage usually hit a choke point around sales ops right after…" } },
  { id: "m10", role: "you", at: "Today 12:38 PM", text: "Love the funding one. Send it." },
  { id: "m11", role: "agent", agentId: "vale", at: "Today 12:39 PM", lead: true, text: "Sending now. First batch of 14 goes out over the next 3 hours. I'll hand warm replies to you directly; cold ones → Ember for retargeting.", tools: [{ name: "Apollo", icon: "cable" }, { name: "Gmail", icon: "mail" }] },
  { id: "m12", role: "agent", agentId: "vale", at: "Today 12:41 PM", lead: true, text: "Quick heads up: 2 leads bounced (role changed at Acme + Lincoln). Re-routing budget to the next 2 on the list — fine?" },
];

const MSG_IRIS: Msg[] = [
  { id: "i1", role: "system", at: "Today 7:00 AM", text: "Iris handled 47 emails overnight." },
  { id: "i2", role: "agent", agentId: "iris", at: "7:00 AM", text: "Good morning. Your inbox is clean except for 2 messages I want you to see before I reply.", tools: [{ name: "Gmail", icon: "mail" }] },
  { id: "i3", role: "agent", agentId: "iris", at: "7:00 AM", approval: { from: "Priya Shah, Hillview Roasters", subject: "Pricing for wholesale — urgent before Monday", draft: "Hi Priya — thanks for reaching out! Our wholesale tiers start at 20 lb/mo. I've attached our current rack…", confidence: 0.82 }, text: "Drafted a reply — needs your approval:" },
  { id: "i4", role: "you", at: "12:16 PM", text: "Approve. Also add our new Ethiopia lot to the attachment." },
  { id: "i5", role: "agent", agentId: "iris", at: "12:17 PM", text: "Done — updated the PDF and sent. I'll hold on the second one (Mercato partnership) until you've had coffee ☕", tools: [{ name: "Gmail", icon: "mail" }, { name: "Drive", icon: "folder" }] },
  { id: "i6", role: "agent", agentId: "iris", at: "12:18 PM", text: "One more thing — 3 threads have been quiet for 5+ days. Want me to draft follow-ups?" },
];

const MSG_DIGEST: Msg[] = [
  { id: "d1", role: "system", at: "Today 9:00 AM", text: "Weekly digest from Palmos." },
  { id: "d2", role: "digest", at: "9:00 AM", stats: [
    { k: "Tasks completed", v: "284", delta: "+12%" },
    { k: "Hours saved", v: "47", delta: "+6%" },
    { k: "Approvals queued", v: "3", delta: "same" },
  ], highlights: [
    { agent: "iris", text: "Triaged 412 emails; drafted 88 replies." },
    { agent: "vale", text: "Booked 11 demos from the funding playbook." },
    { agent: "nova", text: "Delivered 24 brand assets across 3 campaigns." },
  ] },
];

const MESSAGES_BY_THREAD: Record<string, Msg[]> = { t1: MSG_GROWTH, t2: MSG_IRIS, t5: MSG_DIGEST };

function genMessages(thread: Thread, teams: Team[]): Msg[] {
  if (MESSAGES_BY_THREAD[thread.id]) return MESSAGES_BY_THREAD[thread.id];
  if (thread.kind === "dm") {
    const a = agentById(thread.agentId!);
    return [
      { id: "g1", role: "system", at: thread.updated, text: `Conversation with ${a?.name}.` },
      { id: "g2", role: "agent", agentId: a?.id, at: thread.updated, text: thread.preview },
    ];
  }
  if (thread.kind === "team") {
    const team = teams.find((t) => t.id === thread.teamId);
    const lead = agentById(team?.lead ?? "");
    return [
      { id: "g1", role: "system", at: thread.updated, text: `Team thread — ${team?.name}.` },
      { id: "g2", role: "agent", agentId: lead?.id, at: thread.updated, lead: true, text: thread.preview },
    ];
  }
  return [{ id: "g1", role: "system", at: thread.updated, text: thread.preview }];
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

// ── Message renderer ────────────────────────────────────────────────────────

function Message({ m }: { m: Msg }) {
  const { agentById } = useInboxData();
  if (m.role === "system") {
    return (
      <div className="self-center rounded-full bg-default-100 px-3.5 py-1.5 text-center text-[11.5px] font-medium text-default-400 dark:bg-white/8 dark:text-white/40">
        {m.text}
      </div>
    );
  }

  if (m.role === "handoff") {
    const from = agentById(m.from!);
    const to = agentById(m.to!);
    if (!from || !to) return null;
    return (
      <div className="self-center inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11.5px] font-medium text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/10 dark:text-amber-300">
        <InAvatar agent={from} size={18} online={false} />
        <strong className="text-default-800 dark:text-white/90">{from.name}</strong>
        <Icon name="arrow_forward" variant="round" className="text-sm" />
        <InAvatar agent={to} size={18} online={false} />
        <strong className="text-default-800 dark:text-white/90">{to.name}</strong>
        <span>· {m.note}</span>
      </div>
    );
  }

  if (m.role === "digest") {
    return (
      <div className="w-full rounded-[14px] border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 dark:border-amber-500/15 dark:from-amber-500/5 dark:to-orange-500/3">
        <div className="mb-3 grid grid-cols-3 gap-3">
          {m.stats?.map((s) => (
            <div key={s.k} className="rounded-xl border border-default-200 bg-white p-2.5 dark:border-white/8 dark:bg-white/[0.03]">
              <div className="text-xl font-bold tracking-tight text-default-800 dark:text-white/90">{s.v}</div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-default-400 dark:text-white/40">{s.k}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{s.delta}</div>
            </div>
          ))}
        </div>
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-default-400 dark:text-white/40">Highlights</div>
        <div className="flex flex-col gap-2">
          {m.highlights?.map((h, i) => {
            const a = agentById(h.agent);
            if (!a) return null;
            return (
              <div key={i} className="flex items-center gap-2.5 rounded-lg bg-white p-2 text-[13px] text-default-600 dark:bg-white/[0.03] dark:text-white/65">
                <InAvatar agent={a} size={22} online={false} />
                <span><strong className="font-bold text-default-800 dark:text-white/90">{a.name}</strong> {h.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (m.role === "you") {
    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[78%]">
          <div className="rounded-[14px] rounded-tr-sm bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">
            {m.text}
          </div>
          <div className="mt-1 text-right text-[11px] text-default-400 dark:text-white/35">{m.at}</div>
        </div>
      </div>
    );
  }

  // agent
  const a = agentById(m.agentId!);
  if (!a) return null;
  return (
    <div className="flex gap-2.5">
      <InAvatar agent={a} size={32} />
      <div className="max-w-[78%] min-w-0">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-default-800 dark:text-white/90">
            {a.name}
            {m.lead && (
              <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                Lead
              </span>
            )}
          </span>
          <span className="text-[11px] text-default-400 dark:text-white/35">· {m.at}</span>
        </div>
        <div className="rounded-[14px] rounded-tl-sm border border-default-200 bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed text-default-600 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/65">
          {m.text}
          {m.plan && (
            <div className="mt-2.5 rounded-xl border border-default-200 bg-default-50 p-3 dark:border-white/8 dark:bg-white/[0.02]">
              <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-default-400 dark:text-white/40">Proposed plan</div>
              {m.plan.map((p, i) => {
                const pa = agentById(p.who);
                if (!pa) return null;
                return (
                  <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border-b border-dashed border-default-200 py-1.5 last:border-b-0 dark:border-white/8">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-default-800 dark:text-white/90">
                      <InAvatar agent={pa} size={18} online={false} /> {pa.name}
                    </span>
                    <span className="text-[13px] text-default-600 dark:text-white/65">{p.task}</span>
                    <span className="text-[11.5px] text-default-400 dark:text-white/40">{p.eta}</span>
                  </div>
                );
              })}
              {m.footer && <div className="mt-2 text-xs font-medium text-default-400 dark:text-white/45">{m.footer}</div>}
            </div>
          )}
          {m.approval && (
            <div className="mt-2.5 overflow-hidden rounded-xl border border-default-200 dark:border-white/8">
              <div className="flex items-center justify-between border-b border-default-200 bg-default-50 px-3.5 py-2 text-[11.5px] font-medium text-default-400 dark:border-white/8 dark:bg-white/[0.02] dark:text-white/40">
                <span>To: <strong className="text-default-800 dark:text-white/90">{m.approval.from}</strong></span>
                <span>Draft</span>
              </div>
              <div className="px-3.5 py-3 text-[13px] leading-relaxed text-default-600 dark:text-white/65">
                <em className="mb-1 block font-semibold not-italic text-default-800 dark:text-white/90">{m.approval.subject}</em>
                {m.approval.draft}…
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-default-200 bg-default-50 px-3.5 py-2 dark:border-white/8 dark:bg-white/[0.02]">
                <span className="mr-auto inline-flex items-center gap-1.5 text-[11.5px] font-medium text-default-400 dark:text-white/40">
                  Confidence {Math.round(m.approval.confidence * 100)}%
                  <span className="inline-block h-1 w-[60px] overflow-hidden rounded-full bg-default-200 dark:bg-white/15">
                    <span className="block h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${m.approval.confidence * 100}%` }} />
                  </span>
                </span>
                <Button size="sm" variant="flat">Edit</Button>
                <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white" startContent={<Icon name="check" variant="round" className="text-sm" />}>
                  Approve &amp; send
                </Button>
              </div>
            </div>
          )}
          {m.preview && (
            <div className="mt-2.5 rounded-r-xl border border-l-[3px] border-default-200 border-l-amber-500 bg-white p-3 dark:border-white/8 dark:border-l-amber-500 dark:bg-white/[0.02]">
              <div className="text-[13px] font-semibold text-default-800 dark:text-white/90">Re: {m.preview.subject}</div>
              <div className="mt-1 text-xs leading-relaxed text-default-500 dark:text-white/50">{m.preview.snippet}</div>
            </div>
          )}
          {m.tools && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {m.tools.map((t) => (
                <span key={t.name} className="inline-flex items-center gap-1 rounded-full bg-default-100 px-2 py-0.5 text-[11px] font-medium text-default-500 dark:bg-white/8 dark:text-white/50">
                  <Icon name={t.icon} variant="round" className="text-[13px]" />{t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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
    const agents = (team?.agents ?? []).map(agentById).filter(Boolean) as InboxAgent[];
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

// ── Thread view ─────────────────────────────────────────────────────────────

function ThreadView({ thread }: { thread: Thread }) {
  const { teams, agentById: lookupAgent } = useInboxData();
  const messages = genMessages(thread, teams);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread.id]);

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

  return (
    <>
      {header}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[900px] flex-col gap-4 px-8 py-6">
          {messages.map((m) => <Message key={m.id} m={m} />)}
        </div>
      </div>
      {thread.kind !== "notif" && (
        <div className="shrink-0 border-t border-default-200 bg-white px-6 py-3.5 dark:border-white/8 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-[900px]">
            <div className="flex items-end gap-2 rounded-2xl border border-default-200 bg-default-50 px-3 py-2.5 focus-within:border-amber-300 focus-within:bg-white focus-within:shadow-sm dark:border-white/10 dark:bg-white/5 dark:focus-within:border-amber-500/30">
              <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-default-400 hover:bg-default-100 dark:text-white/40 dark:hover:bg-white/10">
                <Icon name="attach_file" variant="round" className="text-lg" />
              </button>
              <textarea placeholder={placeholder} rows={1} className="max-h-[120px] min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm text-default-800 outline-none placeholder:text-default-400 dark:text-white/85 dark:placeholder:text-white/35" />
              <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-default-400 hover:bg-default-100 dark:text-white/40 dark:hover:bg-white/10">
                <Icon name="alternate_email" variant="round" className="text-lg" />
              </button>
              <button type="button" className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                <Icon name="arrow_upward" variant="round" className="text-lg" />
              </button>
            </div>
            <div className="mt-2 flex justify-between px-1 text-[11.5px] text-default-400 dark:text-white/35">
              <span>Enter to send · Shift+Enter for newline</span>
              <span>Draft saved</span>
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
  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-y-auto border-l border-default-200 bg-default-50 dark:border-white/8 dark:bg-white/[0.02]">
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
  if (!a) return null;
  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-y-auto border-l border-default-200 bg-default-50 dark:border-white/8 dark:bg-white/[0.02]">
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

// ── Teams grid ──────────────────────────────────────────────────────────────

export function TeamsGrid({ onNew, onOpen }: { onNew: () => void; onOpen: (team: Team) => void }) {
  const { teams: allTeams, agentById: lookupAgent } = useInboxData();
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
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {allTeams.map((team) => {
            const agents = team.agents.map((id) => lookupAgent(id)).filter(Boolean) as InboxAgent[];
            const lead = lookupAgent(team.lead);
            return (
              <button key={team.id} type="button" onClick={() => onOpen(team)} className="flex flex-col gap-3.5 rounded-2xl border border-default-200 bg-white p-4.5 text-left transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-500/30">
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
      </div>
    </div>
  );
}

// ── Create team wizard ──────────────────────────────────────────────────────

const ICON_OPTIONS = ["trending_up", "receipt_long", "support_agent", "palette", "campaign", "query_stats", "bolt", "rocket_launch", "design_services", "science", "handshake", "inventory_2"];
const HUE_OPTIONS = [30, 0, 310, 260, 210, 190, 160, 130];

export function CreateTeamWizard({ onDone }: { onDone: () => void }) {
  const { agents: allAgents, agentById: lookupAgent } = useInboxData();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [icon, setIcon] = useState("trending_up");
  const [hue, setHue] = useState(30);
  const [selected, setSelected] = useState<string[]>([]);
  const [lead, setLead] = useState("");

  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const agents = selected.map((id) => lookupAgent(id)).filter(Boolean) as InboxAgent[];
  const steps = ["Basics", "Roster", "Lead", "Review"];

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
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white" isDisabled={step === 0 && !name.trim()} onPress={() => setStep((s) => s + 1)} endContent={<Icon name="arrow_forward" variant="round" className="text-sm" />}>
              Continue
            </Button>
          ) : (
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white" onPress={onDone} startContent={<Icon name="rocket_launch" variant="round" className="text-sm" />}>
              Create team
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
  const inboxTeams = useInboxTeams();
  const inboxThreads = useInboxThreads();

  const ctxValue = useMemo(() => ({
    agents: inboxAgents,
    teams: inboxTeams,
    threads: inboxThreads,
    agentById: (id: string) => inboxAgents.find((a) => a.id === id),
  }), [inboxAgents, inboxTeams, inboxThreads]);

  return (
    <InboxDataCtx.Provider value={ctxValue}>
      <InboxViewInner />
    </InboxDataCtx.Provider>
  );
}

function InboxViewInner() {
  const { teams: TEAMS, threads: THREADS } = useInboxData();
  const [tab, setTab] = useState<"inbox" | "teams" | "create">("inbox");
  const [active, setActive] = useState<Thread | null>(null);
  const [filter, setFilter] = useState("all");

  // Set initial active thread once threads load
  useEffect(() => {
    if (!active && THREADS.length > 0) setActive(THREADS[0]);
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
              {filtered.map((t) => (
                <ThreadListItem key={t.id} thread={t} active={active?.id === t.id} onPick={setActive} />
              ))}
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
          onOpen={(t) => {
            const thread = THREADS.find((x) => x.teamId === t.id);
            if (thread) { setActive(thread); setTab("inbox"); }
          }}
        />
      )}

      {tab === "create" && <CreateTeamWizard onDone={() => setTab("teams")} />}
    </div>
  );
}
