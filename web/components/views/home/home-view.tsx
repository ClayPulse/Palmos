"use client";

import { useInbox } from "@/components/agent-chat/panels/inbox-panel";
import { formatRelativeTime } from "@/components/agent-chat/helpers";
import Icon from "@/components/misc/icon";
import MarkdownRender from "@/components/misc/markdown-render";
import { LottieAvatar } from "@/components/views/home/lottie-avatar";
import { PreviewBackdrop } from "@/components/views/home/preview-backdrop";
import WorkerChatProvider, {
  useWorkerChatContext,
} from "@/components/providers/worker-chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import { addToast, Spinner } from "@heroui/react";
import { useAuth } from "@/lib/hooks/use-auth";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heroui/react";
import Image from "next/image";
import { useState, useMemo, useCallback, useContext, useEffect, useRef, lazy, Suspense } from "react";

const InboxView = lazy(() => import("@/components/views/home/inbox-view"));

import { FALLBACK_AGENTS, type Agent } from "@/components/views/home/fallback-agents";
import { TEAM_TEMPLATES, type TeamTemplate } from "@/components/views/home/team-templates";
import { PreviousWork } from "@/components/views/home/previous-work";
import { BuildCustomModal } from "@/components/views/home/build-custom-modal";

// ── Data ────────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { slug: "automation", name: "Automation", icon: "bolt", count: 1248 },
  { slug: "aigc", name: "AIGC", icon: "auto_awesome", count: 892, sub: "Image · Video · Audio" },
  { slug: "content", name: "Content writing", icon: "edit_note", count: 2103 },
  { slug: "marketing", name: "Marketing", icon: "campaign", count: 744 },
  { slug: "research", name: "Research", icon: "travel_explore", count: 512 },
  { slug: "data", name: "Data & analytics", icon: "query_stats", count: 671 },
  { slug: "support", name: "Customer support", icon: "support_agent", count: 389 },
  { slug: "sales", name: "Sales ops", icon: "trending_up", count: 287 },
  { slug: "coding", name: "Coding", icon: "code", count: 1534 },
  { slug: "design", name: "Design", icon: "palette", count: 421 },
] as const;

function mapListingToAgent(listing: any): Agent {
  return {
    id: listing.slug,
    name: listing.name,
    role: listing.role,
    cat: listing.category,
    rating: listing.rating,
    reviews: listing.reviews,
    price: listing.price,
    turnaround: listing.turnaround,
    used: listing.used,
    tools: listing.tools,
    tagline: listing.tagline,
    hue: listing.hue,
    // Trust the URL the listings API supplies (it's resolved from the
    // agent's `avatarPath`). If the API didn't include one, leave it
    // unset and LottieAvatar will keep showing its placeholder.
    lottie: listing.lottie ?? undefined,
    previewLottie: listing.previewLottie ?? undefined,
  };
}

function useAgentListings() {
  const [agents, setAgents] = useState<Agent[]>(FALLBACK_AGENTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAPI("/api/agent/listings")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAgents(data.map(mapListingToAgent));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { agents, isLoading };
}

const TRENDING = [
  "Cyber-week ad rotation",
  "Black-Friday copy refresh",
  "Q2 OKR digest",
  "Shopify → Slack restock",
  "Podcast transcript cleanup",
];

const TOOL_COUNTS: [string, number][] = [
  ["Gmail", 812],
  ["Slack", 643],
  ["HubSpot", 421],
  ["Stripe", 388],
  ["Figma", 312],
];

// ── Subcomponents ───────────────────────────────────────────────────────────

function AgentAvatar({ agent, size = 56, lottieOverride }: { agent: Agent; size?: number; lottieOverride?: string }) {
  const h = agent.hue;
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center rounded-full shadow-sm"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${h} 80% 60%), hsl(${(h + 30) % 360} 70% 45%))`,
        padding: 2,
      }}
    >
      <LottieAvatar
        src={lottieOverride ?? agent.lottie}
        alt={agent.name}
        size={size - 4}
        hue={agent.hue}
        initial={agent.name}
      />
      <span className="absolute right-0 bottom-0 h-[28%] w-[28%] rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-900" />
    </div>
  );
}

// ── Avatar picker (pre-hire) ────────────────────────────────────────────────

interface AvatarCatalogEntry {
  path: string; // "<category>/<name>"
  name: string;
  category: "emoji" | "character" | "cartoon";
  lottie: string;
}
type AvatarCatalog = Record<"emoji" | "character" | "cartoon", AvatarCatalogEntry[]>;

const AVATAR_TABS: { key: "emoji" | "character" | "cartoon"; label: string }[] = [
  { key: "emoji",     label: "Emoji" },
  { key: "character", label: "Character" },
  { key: "cartoon",   label: "Cartoon" },
];

// Renders a cheap static skeleton (no network fetch) until scrolled into
// view, then mounts the real Lottie. Once visible, stays mounted so
// scrolling back up doesn't refetch.
function LazyAvatarTile({
  entry,
  active,
  scrollRoot,
  onClick,
}: {
  entry: AvatarCatalogEntry;
  active: boolean;
  scrollRoot: HTMLElement | null;
  onClick: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (visible || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { root: scrollRoot, rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, scrollRoot]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      title={entry.name}
      className={`flex h-14 w-14 items-center justify-center rounded-lg border p-1 transition-colors ${
        active
          ? "border-amber-400 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
          : "border-default-200 bg-white hover:border-default-300 dark:border-white/10 dark:bg-white/5"
      }`}
    >
      {visible ? (
        <LottieAvatar
          src={entry.lottie}
          alt={entry.name}
          size={44}
          hue={210}
          initial={entry.name.slice(0, 1).toUpperCase()}
        />
      ) : (
        <div className="h-11 w-11 animate-pulse rounded-full bg-default-200 dark:bg-white/10" />
      )}
    </button>
  );
}

function AvatarPicker({
  selectedPath,
  onSelect,
}: {
  selectedPath: string | null;
  onSelect: (path: string | null, lottie: string | null) => void;
}) {
  const [catalog, setCatalog] = useState<AvatarCatalog | null>(null);
  const [tab, setTab] = useState<"emoji" | "character" | "cartoon">("emoji");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || catalog) return;
    let cancelled = false;
    fetchAPI("/api/agent/avatar/catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setCatalog(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, catalog]);

  const items = catalog?.[tab] ?? [];
  const totalCounts = catalog
    ? { emoji: catalog.emoji.length, character: catalog.character.length, cartoon: catalog.cartoon.length }
    : null;
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  return (
    <Popover placement="bottom" isOpen={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-default-200 bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-default-600 backdrop-blur-sm transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
        >
          <Icon name="palette" variant="round" className="text-sm" />
          {selectedPath ? "Change avatar" : "Choose avatar"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-2">
        <div className="flex w-[360px] flex-col gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-default-100 p-1 dark:bg-white/5">
            {AVATAR_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  tab === t.key
                    ? "bg-white text-default-800 shadow-sm dark:bg-white/15 dark:text-white"
                    : "text-default-500 hover:text-default-700 dark:text-white/55 dark:hover:text-white/85"
                }`}
              >
                {t.label}
                {totalCounts && (
                  <span className="text-[10px] font-normal text-default-400 dark:text-white/40">
                    {totalCounts[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div
            ref={setScrollRoot}
            // Re-mount the scroll container on tab change so the IntersectionObserver
            // re-evaluates which tiles are visible from the top of the new list.
            key={tab}
            className="grid max-h-[280px] grid-cols-5 gap-1.5 overflow-y-auto p-1"
          >
            <button
              type="button"
              onClick={() => {
                onSelect(null, null);
                setIsOpen(false);
              }}
              title="Use default"
              className={`flex h-14 w-14 items-center justify-center rounded-lg border text-[10px] font-medium transition-colors ${
                selectedPath === null
                  ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-default-200 bg-white text-default-500 hover:border-default-300 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
              }`}
            >
              Default
            </button>
            {!catalog && (
              <div className="col-span-4 flex h-14 items-center justify-center text-xs text-default-400">
                <Spinner size="sm" />
              </div>
            )}
            {items.map((entry) => (
              <LazyAvatarTile
                key={entry.path}
                entry={entry}
                active={selectedPath === entry.path}
                scrollRoot={scrollRoot}
                onClick={() => {
                  onSelect(entry.path, entry.lottie);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Team templates row ──────────────────────────────────────────────────────
//
// Curated one-click teams. Same component is used on the Explore home page
// and the My hires Teams tab, so it's controlled — the parent passes an
// `onCreate(template)` handler that does the API call and any refresh.

// Minimal agent shape needed to render an avatar inside a template card.
// Both Agent (marketplace) and InboxAgent (home inbox) satisfy this, so
// the row is reusable without adapting the data on the caller's side.
export type TemplateAgent = {
  id: string;
  name: string;
  hue: number;
  lottie?: string;
};

export function TeamTemplateRow({
  templates,
  agentBySlug,
  busySlug,
  onCreate,
  variant = "row",
}: {
  templates: TeamTemplate[];
  // For rendering avatars on each card. Returns undefined if the slug isn't
  // in the user's loaded agent set.
  agentBySlug: (slug: string) => TemplateAgent | undefined;
  /** Slug of the template currently being created (shows a spinner). */
  busySlug: string | null;
  onCreate: (template: TeamTemplate) => void;
  /** "row" (horizontal scroll) for Explore; "grid" for the Teams tab reminder. */
  variant?: "row" | "grid";
}) {
  const containerCls =
    variant === "row"
      ? "flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
      : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
  const cardCls =
    variant === "row"
      ? "flex w-[300px] shrink-0 flex-col gap-3 rounded-2xl border border-default-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-500/30"
      : "flex flex-col gap-3 rounded-2xl border border-default-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-500/30";

  return (
    <div className={containerCls}>
      {templates.map((t) => {
        const agents = t.agents
          .map((s) => agentBySlug(s))
          .filter(Boolean) as TemplateAgent[];
        const busy = busySlug === t.slug;
        const previewSrc = t.previewPath
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/api/agent/avatar/${t.previewPath
              .split("/")
              .map(encodeURIComponent)
              .join("/")}.lottie?v=7`
          : null;
        return (
          <div key={t.slug} className={`${cardCls} relative overflow-hidden`}>
            {previewSrc && <PreviewBackdrop src={previewSrc} alt="" opacity={0.18} />}
            <div className="relative z-10 flex items-start gap-2.5">
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-[20px]"
                style={{
                  background: `linear-gradient(135deg, hsl(${t.hue} 80% 62%), hsl(${(t.hue + 30) % 360} 70% 45%))`,
                }}
              >
                <Icon name={t.icon} variant="round" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-bold text-default-800 dark:text-white/90">
                  {t.name}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-default-500 dark:text-white/55">
                  {t.goal}
                </div>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-1">
              {/* Stack of agent avatars; cap at 5 visible. */}
              {agents.slice(0, 5).map((a, i) => (
                <div
                  key={a.id}
                  className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-sm dark:border-[#0d0d14]"
                  style={{
                    marginLeft: i === 0 ? 0 : -8,
                    background: `linear-gradient(135deg, hsl(${a.hue} 80% 62%), hsl(${(a.hue + 30) % 360} 70% 45%))`,
                  }}
                  title={a.name}
                >
                  <LottieAvatar
                    src={a.lottie}
                    alt={a.name}
                    size={28}
                    hue={a.hue}
                    initial={a.name}
                  />
                </div>
              ))}
              {t.agents.length > 5 && (
                <span className="ml-1 text-[11px] font-medium text-default-400 dark:text-white/40">
                  +{t.agents.length - 5}
                </span>
              )}
              <span className="ml-auto text-[11px] font-medium text-default-400 dark:text-white/40">
                {t.agents.length} agents
              </span>
            </div>
            <Button
              size="sm"
              className="relative z-10 bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white"
              onPress={() => onCreate(t)}
              isDisabled={busy}
              isLoading={busy}
              startContent={
                busy ? null : (
                  <Icon name="rocket_launch" variant="round" className="text-base" />
                )
              }
            >
              {busy ? "Hiring…" : "Hire team"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function Stars({ value, reviews }: { value: number; reviews: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-default-700 whitespace-nowrap dark:text-white/80">
      <Icon name="star" variant="round" className="text-sm text-amber-400" />
      <strong>{value.toFixed(1)}</strong>
      <span className="font-normal text-default-400 dark:text-white/40">
        ({reviews.toLocaleString()})
      </span>
    </span>
  );
}

function AgentCard({
  agent,
  onHire,
  featured,
}: {
  agent: Agent;
  onHire: (agent: Agent) => void;
  featured?: boolean;
}) {
  const h = agent.hue;
  const category = CATEGORIES.find((c) => c.slug === agent.cat);

  return (
    <button
      type="button"
      onClick={() => onHire(agent)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-default-200 bg-white text-left transition-all hover:-translate-y-0.5 hover:border-amber-300/80 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-500/30 dark:hover:shadow-amber-500/5"
    >
      {/* Thumb */}
      <div
        className={`relative ${featured ? "aspect-[5/3]" : "aspect-[16/10]"}`}
        style={{
          background: `linear-gradient(135deg, hsl(${h} 60% 94%), hsl(${(h + 40) % 360} 60% 88%))`,
        }}
      >
        {agent.previewLottie && (
          <PreviewBackdrop src={agent.previewLottie} alt="" />
        )}
        <div className="absolute top-2.5 right-2.5 z-10">
          <AgentAvatar agent={agent} size={featured ? 56 : 48} />
        </div>
        {category && (
          <span className="absolute top-2.5 left-2.5 z-10 rounded-full border border-default-200/60 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-default-600 backdrop-blur-sm dark:border-white/10 dark:bg-black/40 dark:text-white/70">
            {category.name}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-default-800 dark:text-white/90">
              {agent.name}
            </div>
            <div className="mt-0.5 text-xs text-default-400 dark:text-white/45">
              {agent.role}
            </div>
          </div>
          <Stars value={agent.rating} reviews={agent.reviews} />
        </div>
        <p className="text-[13px] leading-[1.45] text-default-500 dark:text-white/55">
          {agent.tagline}
        </p>
        <div className="flex flex-wrap gap-1">
          {agent.tools.map((t) => (
            <span
              key={t}
              className="rounded-md bg-default-100 px-1.5 py-0.5 text-[11px] font-medium text-default-500 dark:bg-white/8 dark:text-white/50"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-default-100 pt-2.5 text-xs font-medium text-default-400 dark:border-white/8 dark:text-white/40">
          <span className="inline-flex items-center gap-1">
            <Icon name="schedule" variant="round" className="text-[13px]" />
            {agent.turnaround}
          </span>
          <span className="text-default-600 dark:text-white/70">
            From <strong className="text-sm text-default-800 dark:text-white/90">${agent.price}</strong>/run
          </span>
        </div>
      </div>
    </button>
  );
}

function CategoryTile({
  cat,
  active,
  onClick,
}: {
  cat: { slug: string; name: string; icon: string; count: number };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
        active
          ? "border-amber-300 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/8"
          : "border-default-200 bg-white hover:border-amber-200 hover:bg-amber-50/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-500/15 dark:hover:bg-amber-500/5"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "border border-amber-200 bg-white text-amber-600 dark:border-amber-500/20 dark:bg-white/10 dark:text-amber-400"
            : "bg-default-100 text-default-500 dark:bg-white/8 dark:text-white/50"
        }`}
      >
        <Icon name={cat.icon} variant="round" className="text-base" />
      </span>
      <span
        className={`flex-1 text-[13px] font-semibold ${
          active
            ? "text-amber-700 dark:text-amber-300"
            : "text-default-800 dark:text-white/85"
        }`}
      >
        {cat.name}
      </span>
      <span className="text-[11.5px] font-medium tabular-nums text-default-400 dark:text-white/35">
        {cat.count.toLocaleString()}
      </span>
    </button>
  );
}

// ── Section header (matching design system .vc__section-h) ──────────────────

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-lg font-semibold text-default-800 dark:text-white/90">
        {title}
        {subtitle && (
          <span className="ml-2 text-[13px] font-normal text-default-400 dark:text-white/40">
            {subtitle}
          </span>
        )}
      </h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="text-[13px] font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        >
          {action}
        </button>
      )}
    </div>
  );
}

// ── Main HomeView ───────────────────────────────────────────────────────────

export default function HomeView({
  onSelectTemplate,
}: {
  onSelectTemplate: (prompt: string) => void;
}) {
  const { agents: allAgents, isLoading: isLoadingAgents } = useAgentListings();
  const [homeView, setHomeView] = useState<"explore" | "inbox">("explore");
  const [cat, setCat] = useState<string>("all");
  const [creatingTemplateSlug, setCreatingTemplateSlug] = useState<string | null>(null);

  // One-click team creation from a curated template. Posts to the same
  // /api/agent/teams endpoint the wizard uses; on success we toast and
  // bounce the user to the My hires Teams tab so they can see it.
  const agentsBySlug = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const a of allAgents) map.set(a.id, a);
    return map;
  }, [allAgents]);

  const createTeamFromTemplate = useCallback(
    async (template: TeamTemplate) => {
      if (creatingTemplateSlug) return;
      setCreatingTemplateSlug(template.slug);
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
        addToast({
          title: `Created team "${template.name}"`,
          description: "See it in My agents.",
          color: "success",
        });
        setHomeView("inbox");
      } catch (err) {
        addToast({
          title: "Couldn't create team",
          description: err instanceof Error ? err.message : "Unknown error",
          color: "danger",
        });
      } finally {
        setCreatingTemplateSlug(null);
      }
    },
    [creatingTemplateSlug],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(50);
  const [turnaround, setTurnaround] = useState("any");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const visible = useMemo(() => {
    let list = cat === "all" ? allAgents : allAgents.filter((a) => a.cat === cat);
    if (maxPrice < 50) list = list.filter((a) => a.price <= maxPrice);
    if (turnaround !== "any") {
      const mins = turnaround === "5" ? 5 : turnaround === "15" ? 15 : 60;
      list = list.filter((a) => {
        const m = a.turnaround.match(/\d+/);
        return m ? parseInt(m[0]) <= mins : false;
      });
    }
    if (selectedTools.length > 0) {
      list = list.filter((a) =>
        selectedTools.some((t) => a.tools.includes(t)),
      );
    }
    return list;
  }, [cat, maxPrice, turnaround, selectedTools, allAgents]);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [buildCustom, setBuildCustom] = useState<{ seedTagline?: string } | null>(null);

  const toggleTool = useCallback((tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  }, []);

  const handleHire = useCallback(
    async (
      agent: Agent,
      teamId: string | null,
      snapshot?: {
        skills: { source: "anthropic" | "clawhub"; externalId: string }[];
        workflowIds: string[];
        pendingUploads?: { externalId: string; file: File }[];
        customAvatarPath?: string | null;
      },
    ): Promise<boolean> => {
      const pendingUploads = snapshot?.pendingUploads ?? [];
      const dataPayload = {
        agentSlug: agent.id,
        teamId: teamId ?? undefined,
        skills: snapshot?.skills,
        workflowIds: snapshot?.workflowIds,
        customAvatarPath: snapshot?.customAvatarPath,
        // Echo the externalIds of pending uploads so the server can pair
        // each multipart File with the right WorkerAgentSkill row.
        uploadIds: pendingUploads.map((u) => u.externalId),
      };
      try {
        const fd = new FormData();
        fd.append("data", JSON.stringify(dataPayload));
        for (const u of pendingUploads) {
          fd.append(`upload:${u.externalId}`, u.file, u.file.name);
        }
        const res = await fetchAPI(`/api/agent/hire`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data?.message ??
              (data?.error === "upload_parse_failed"
                ? `Couldn't parse upload "${data?.fileName ?? ""}". Modify and try again.`
                : `Hire failed: ${res.status}`),
          );
        }
        addToast({
          title: `Hired ${agent.name}`,
          description: teamId
            ? `${agent.name} joined your team.`
            : `${agent.name} is in your roster — add to a team from the Teams page.`,
          color: "success",
        });
        return true;
      } catch (err) {
        addToast({
          title: `Couldn't hire ${agent.name}`,
          description: err instanceof Error ? err.message : "Unknown error",
          color: "danger",
        });
        return false;
      }
    },
    [],
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      setBuildCustom({ seedTagline: q });
      setSearchQuery("");
    },
    [searchQuery],
  );

  const editorContext = useContext(EditorContext);
  const { session, signOut, subscription, usage } = useAuth();
  const { getTranslations: t } = useTranslations();
  const { messages: inboxMessages, unreadCount, markAllRead, dismiss: dismissInbox } = useInbox();

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#0d0d14]">
      {/* ── Nav bar ── */}
      <div className="shrink-0 flex items-center gap-5 border-b border-default-200 bg-white px-7 py-3 dark:border-white/8 dark:bg-[#0d0d14]">
        {/* Left — logo. Acts as a "go to Explore home" shortcut, no
            navigation: clears category filter, dismisses any open modal,
            and switches the home view back to Explore. */}
        <button
          type="button"
          onClick={() => {
            setHomeView("explore");
            setCat("all");
            setSelectedAgent(null);
            setBuildCustom(null);
          }}
          className="flex shrink-0 items-center gap-2 no-underline"
        >
          <Image src="/assets/pulse-logo.svg" alt="Palmos" width={24} height={24} />
          <span className="hidden text-base font-bold tracking-wide bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 bg-clip-text text-transparent sm:inline dark:from-amber-500 dark:via-amber-200 dark:to-amber-500">
            PALMOS AI
          </span>
        </button>
        {/* Center — search */}
        <div className="hidden flex-1 max-w-[640px] sm:block">
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 rounded-full border border-default-200 bg-default-50 px-3.5 py-2 transition-colors focus-within:border-amber-300 focus-within:bg-white focus-within:shadow-sm dark:border-white/10 dark:bg-white/5 dark:focus-within:border-amber-500/30 dark:focus-within:bg-white/8"
          >
            <Icon name="search" variant="round" className="text-lg text-default-400 dark:text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for an AI agent or task…"
              className="min-w-0 flex-1 bg-transparent text-sm text-default-800 outline-none placeholder:text-default-400 dark:text-white/85 dark:placeholder:text-white/35"
            />
            <span className="hidden rounded-md border border-default-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-default-400 md:inline dark:border-white/10 dark:bg-white/5 dark:text-white/35">
              ⌘K
            </span>
          </form>
        </div>
        {/* Right — actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHomeView("inbox")}
            className={`hidden rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors sm:block ${homeView === "inbox" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "text-default-600 hover:bg-default-100 dark:text-white/60 dark:hover:bg-white/8"}`}
          >
            My agents
          </button>
          {homeView === "inbox" && (
            <button
              type="button"
              onClick={() => setHomeView("explore")}
              className="hidden rounded-lg px-3 py-1.5 text-[13px] font-medium text-default-600 transition-colors hover:bg-default-100 sm:block dark:text-white/60 dark:hover:bg-white/8"
            >
              Explore
            </button>
          )}
          <Button
            size="sm"
            className="hidden bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white sm:flex"
            onPress={() => setBuildCustom({})}
          >
            Build custom
          </Button>

          {/* Inbox */}
          {session && (
            <Popover placement="bottom-end" onOpenChange={(open) => { if (open) markAllRead(); }}>
              <PopoverTrigger>
                <button
                  type="button"
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg text-default-500 transition-colors hover:bg-default-100 dark:text-white/60 dark:hover:bg-white/10"
                >
                  <Icon name="chat_bubble" variant="round" className="text-xl" />
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 animate-ping rounded-full bg-red-400 opacity-75" />
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0">
                <div className="flex items-center gap-2 border-b border-default-200 px-3 py-2.5 dark:border-white/8">
                  <Icon name="chat_bubble" variant="round" className="text-base text-amber-500 dark:text-amber-400" />
                  <span className="text-sm font-semibold text-default-700 dark:text-white/80">Inbox</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {inboxMessages.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Icon name="chat_bubble_outline" variant="round" className="mb-1.5 text-2xl text-default-300 dark:text-white/20" />
                      <p className="text-xs text-default-500 dark:text-white/40">No messages yet</p>
                    </div>
                  ) : (
                    [...inboxMessages].reverse().map((msg) => {
                      const kwargs = msg.additionalKwargs;
                      const isWorkflowBuild = kwargs?.type === "workflow_build_complete";
                      return (
                        <div key={msg.id} className="group border-b border-default-100 px-3 py-2.5 last:border-b-0 dark:border-white/5">
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isWorkflowBuild ? "bg-green-100 dark:bg-green-500/15" : "bg-amber-100 dark:bg-amber-500/15"}`}>
                              <Icon
                                name={isWorkflowBuild ? "rocket_launch" : "chat_bubble"}
                                variant="round"
                                className={`text-xs ${isWorkflowBuild ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-default-700 dark:text-white/75">{msg.content}</p>
                              <p className="mt-0.5 text-[10px] text-default-400 dark:text-white/30">
                                {formatRelativeTime(msg.createdAt, t)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => dismissInbox(msg.id)}
                              className="shrink-0 text-default-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-default-500 dark:text-white/20 dark:hover:text-white/50"
                            >
                              <Icon name="close" variant="round" className="text-sm" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Login / Profile */}
          {!session ? (
            <Button
              size="sm"
              variant="bordered"
              onPress={() =>
                editorContext?.setEditorStates((prev) => ({
                  ...prev,
                  isSigningIn: true,
                }))
              }
            >
              {t("common.signIn")}
            </Button>
          ) : (
            <Dropdown>
              <DropdownTrigger>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white transition-shadow hover:shadow-md"
                >
                  {session.user.image ? (
                    <img src={session.user.image} alt={session.user.name} className="h-full w-full object-cover" />
                  ) : (
                    session.user.name?.[0]?.toUpperCase() ?? "U"
                  )}
                </button>
              </DropdownTrigger>
              <DropdownMenu
                topContent={
                  <div className="px-3 py-2 text-center">
                    <p className="text-sm font-semibold text-default-800 dark:text-white/90">
                      {session.user.name}
                    </p>
                    {session.user.email && (
                      <p className="text-xs text-default-400 dark:text-white/40">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                }
              >
                <DropdownSection showDivider title={t("subscription.title")}>
                  <DropdownItem key="plan" isReadOnly variant="faded">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-default-500 dark:text-white/50">{t("subscription.plan")}</span>
                      <span className="text-xs font-semibold">{subscription?.name}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-default-500 dark:text-white/50">{t("subscription.creditsRemaining")}</span>
                      <span className="text-xs font-semibold">{usage?.remainingCredit}</span>
                    </div>
                  </DropdownItem>
                </DropdownSection>
                <DropdownSection>
                  <DropdownItem
                    key="sign-out"
                    onPress={() => signOut()}
                    className="text-danger"
                    startContent={<Icon name="logout" variant="round" className="text-sm" />}
                  >
                    {t("common.signOut")}
                  </DropdownItem>
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Inbox view */}
      {homeView === "inbox" && (
        <Suspense fallback={<div className="flex flex-1 items-center justify-center"><span className="text-sm text-default-400">Loading…</span></div>}>
          <InboxView />
        </Suspense>
      )}

      {/* ── Explore content ── */}
      {homeView === "explore" && <>
      {/* ── Tab bar ── */}
      <div className="shrink-0 border-b border-default-200 bg-white dark:border-white/8 dark:bg-[#0d0d14]">
        <div className="flex items-center gap-1.5 overflow-x-auto px-7 py-2.5 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCat("all")}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[13px] font-medium whitespace-nowrap transition-all ${
              cat === "all"
                ? "border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
                : "border border-transparent text-default-500 hover:bg-default-100 hover:text-default-800 dark:text-white/50 dark:hover:bg-white/8 dark:hover:text-white/80"
            }`}
          >
            <Icon name="apps" variant="round" className="text-base" />
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCat(cat === c.slug ? "all" : c.slug)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[13px] font-medium whitespace-nowrap transition-all ${
                cat === c.slug
                  ? "border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border border-transparent text-default-500 hover:bg-default-100 hover:text-default-800 dark:text-white/50 dark:hover:bg-white/8 dark:hover:text-white/80"
              }`}
            >
              <Icon name={c.icon} variant="round" className="text-base" />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Trending row ── */}
      <div className="shrink-0 flex items-center gap-2.5 overflow-x-auto border-b border-default-200 px-7 py-2.5 dark:border-white/8 [&::-webkit-scrollbar]:hidden">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-default-400 dark:text-white/35">
          Trending
        </span>
        <div className="flex gap-2">
          {TRENDING.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onSelectTemplate(t)}
              className="shrink-0 rounded-full border border-default-200 bg-white px-3 py-1.5 text-xs font-medium text-default-600 transition-colors hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/60 dark:hover:border-amber-500/25 dark:hover:text-amber-300"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-7 px-7 pt-7 pb-24 sm:px-10">
          {/* ── Hero ── */}
          <div className="grid gap-8 rounded-[22px] border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white p-7 sm:grid-cols-[1.3fr_1fr] sm:p-8 dark:border-amber-500/15 dark:from-amber-500/5 dark:via-orange-500/3 dark:to-transparent">
            <div className="flex flex-col gap-2.5">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {allAgents.length} agents online now
              </span>
              <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.015em] text-default-900 sm:text-[32px] dark:text-white">
                Your <em className="not-italic text-amber-600 dark:text-amber-400">AI team</em>, ready to hire.
              </h1>
              <p className="max-w-[460px] text-[14.5px] leading-relaxed text-default-500 dark:text-white/55">
                Specialists for every corner of your business. Pay per run, cancel anytime, no coffee breaks.
              </p>
              <form
                onSubmit={handleSearch}
                className="mt-1.5 flex items-center gap-2 rounded-[14px] border-[1.5px] border-amber-200 bg-white px-3.5 py-2.5 dark:border-amber-500/20 dark:bg-white/5"
              >
                <Icon name="auto_awesome" variant="round" className="shrink-0 text-lg text-amber-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Describe what you need done… we'll match you"
                  className="min-w-0 flex-1 bg-transparent text-sm text-default-800 outline-none placeholder:text-default-400 dark:text-white/85 dark:placeholder:text-white/35"
                />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-[7px] text-xs font-semibold text-white"
                >
                  Find an agent
                  <Icon name="arrow_forward" variant="round" className="text-sm" />
                </button>
              </form>
            </div>
            {/* Avatar mosaic */}
            <div className="hidden grid-cols-4 gap-2 sm:grid">
              {allAgents.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  className="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-[14px] shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, hsl(${a.hue} 60% 92%), hsl(${(a.hue + 30) % 360} 60% 86%))`,
                  }}
                >
                  {a.lottie && (
                    <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
                      <PreviewBackdrop src={a.lottie} alt={a.name} opacity={1} />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  {/* Verified badge */}
                  <div className="absolute top-1.5 right-1.5 z-10">
                    <Icon name="verified" variant="round" className="text-base text-blue-500 drop-shadow-sm" />
                  </div>
                  {/* Name + role */}
                  <div className="relative z-10 p-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold leading-tight text-white">
                        {a.name}
                      </span>
                    </div>
                    <span className="mt-0.5 block text-[9px] leading-tight text-white/70">
                      {a.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Featured teams (hero-level callout — comes first under the
              search/welcome block to give one-click setups maximum
              visibility) ── */}
          {cat === "all" && (
            <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50/40 p-5 shadow-sm dark:border-amber-500/20 dark:from-amber-500/8 dark:via-orange-500/5 dark:to-rose-500/3">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-white/70 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <Icon name="rocket_launch" variant="round" className="text-[13px]" />
                    Ship today
                  </div>
                  <h2 className="text-[22px] font-bold tracking-tight text-default-900 dark:text-white">
                    Featured teams
                  </h2>
                  <p className="mt-0.5 text-[13.5px] text-default-500 dark:text-white/55">
                    Curated rosters with goal, lead, and agents — one click and they&apos;re yours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHomeView("inbox")}
                  className="text-[13px] font-medium text-amber-700 hover:underline dark:text-amber-300"
                >
                  See your teams →
                </button>
              </div>
              <TeamTemplateRow
                templates={TEAM_TEMPLATES}
                agentBySlug={(s) => agentsBySlug.get(s)}
                busySlug={creatingTemplateSlug}
                onCreate={createTeamFromTemplate}
                variant="row"
              />
            </section>
          )}

          {/* ── Browse categories (tile grid — Variant A/C style) ── */}
          {cat === "all" && (
            <section className="flex flex-col gap-3">
              <SectionHeader title="Browse categories" action="See all →" />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {CATEGORIES.slice(0, 5).map((c) => (
                  <CategoryTile
                    key={c.slug}
                    cat={c}
                    active={false}
                    onClick={() => setCat(c.slug)}
                  />
                ))}
              </div>
            </section>
          )}


          {/* ── Team strip (recommended) ── */}
          {cat === "all" && (
            <section className="flex flex-col gap-3">
              <SectionHeader
                title="Based on your business"
                subtitle="recommended for you"
                action="Tune recommendations →"
              />
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-default-200 bg-default-50 p-4 sm:grid-cols-6 dark:border-white/8 dark:bg-white/[0.03]">
                {allAgents.slice(0, 6).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAgent(a)}
                    className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-2.5 transition-transform hover:-translate-y-0.5 dark:bg-white/5"
                  >
                    <AgentAvatar agent={a} size={48} />
                    <div className="text-center text-xs font-semibold text-default-800 dark:text-white/85">
                      {a.name}
                    </div>
                    <div className="text-center text-[11px] leading-snug text-default-400 dark:text-white/40">
                      {a.role}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Popular agents — filter rail + grid ── */}
          <section className="flex flex-col gap-3">
            <SectionHeader
              title={
                cat === "all"
                  ? "Popular agents"
                  : (CATEGORIES.find((c) => c.slug === cat)?.name ?? "Agents")
              }
              subtitle={`${visible.length} available`}
              action="See all →"
            />
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-[240px_1fr]">
              {/* ── Filter rail ── */}
              <aside className="hidden flex-col gap-5 lg:flex">
                {/* Category */}
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-default-400 dark:text-white/35">
                    Category
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <CategoryTile
                      cat={{ slug: "all", name: "All agents", icon: "apps", count: allAgents.length * 100 }}
                      active={cat === "all"}
                      onClick={() => setCat("all")}
                    />
                    {CATEGORIES.map((c) => (
                      <CategoryTile
                        key={c.slug}
                        cat={c}
                        active={cat === c.slug}
                        onClick={() => setCat(cat === c.slug ? "all" : c.slug)}
                      />
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="border-t border-default-200 pt-4 dark:border-white/8">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-default-400 dark:text-white/35">
                    Price per run
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="mt-1 flex justify-between text-[11px] font-medium text-default-400 dark:text-white/35">
                    <span>$0</span>
                    <span>{maxPrice >= 50 ? "$50+" : `$${maxPrice}`}</span>
                  </div>
                </div>

                {/* Turnaround */}
                <div className="border-t border-default-200 pt-4 dark:border-white/8">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-default-400 dark:text-white/35">
                    Turnaround
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: "5", label: "Under 5 min" },
                      { value: "15", label: "Under 15 min" },
                      { value: "60", label: "Under 1 hour" },
                      { value: "any", label: "Any" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2 text-[13px] text-default-600 dark:text-white/65"
                      >
                        <input
                          type="radio"
                          name="turnaround"
                          checked={turnaround === opt.value}
                          onChange={() => setTurnaround(opt.value)}
                          className="accent-amber-500"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Integrations */}
                <div className="border-t border-default-200 pt-4 dark:border-white/8">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-default-400 dark:text-white/35">
                    Integrations
                  </div>
                  <div className="flex flex-col gap-2">
                    {TOOL_COUNTS.map(([tool, count]) => (
                      <label
                        key={tool}
                        className="flex cursor-pointer items-center gap-2 text-[13px] text-default-600 dark:text-white/65"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTools.includes(tool)}
                          onChange={() => toggleTool(tool)}
                          className="accent-amber-500"
                        />
                        <span className="flex-1">{tool}</span>
                        <span className="text-[12px] text-default-400 dark:text-white/30">
                          {count}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </aside>

              {/* ── Agent grid ── */}
              <div className="min-w-0">
                {/* Sort bar */}
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[22px] font-bold text-default-800 dark:text-white/90">
                    {cat === "all"
                      ? "All AI agents"
                      : CATEGORIES.find((c) => c.slug === cat)?.name}
                    <span className="ml-2 text-sm font-medium text-default-400 dark:text-white/40">
                      · {visible.length * 87} available
                    </span>
                  </h3>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-default-200 bg-white px-3 py-[7px] text-[13px] font-medium text-default-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55"
                  >
                    <Icon name="sort" variant="round" className="text-base" />
                    Best match
                  </button>
                </div>

                {visible.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-default-200 py-16 dark:border-white/8">
                    <Icon name="search_off" variant="round" className="mb-2 text-4xl text-default-300 dark:text-white/20" />
                    <p className="text-sm text-default-400 dark:text-white/40">
                      No agents match your filters
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCat("all");
                        setMaxPrice(50);
                        setTurnaround("any");
                        setSelectedTools([]);
                      }}
                      className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map((a) => (
                      <AgentCard key={a.id} agent={a} onHire={setSelectedAgent} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      </>}

      {/* ── Floating bottom CTA ── */}
      {homeView === "explore" && <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-30 flex justify-center px-5 pb-4 sm:px-10">
        <div className="pointer-events-auto flex w-full max-w-[1360px] items-center justify-between gap-4 rounded-2xl border border-dashed border-default-300 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#0d0d14]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-default-100 dark:bg-white/10">
              <Icon name="auto_fix_high" variant="round" className="text-xl text-default-600 dark:text-white/70" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-default-800 dark:text-white/90">
                Can&apos;t find what you need?
              </p>
              <p className="text-xs text-default-400 dark:text-white/40">
                Build a custom AI agent in ~15 minutes
              </p>
            </div>
          </div>
          <Button
            className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white shadow-md shadow-amber-500/20"
            size="sm"
            onPress={() => setBuildCustom({})}
            startContent={<Icon name="build" variant="round" className="text-sm" />}
          >
            Build Custom
          </Button>
        </div>
      </div>}

      {/* Agent detail modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onHire={handleHire}
        />
      )}

      {/* Build Custom modal */}
      {buildCustom && (
        <BuildCustomModal
          seedTagline={buildCustom.seedTagline}
          onClose={() => setBuildCustom(null)}
          onSaveDraft={(draft) => {
            // TODO: POST /api/custom-agents with status="draft"
            console.log("save draft", draft);
            setBuildCustom(null);
          }}
          onPublish={(draft) => {
            // TODO: POST /api/custom-agents with status="published"
            console.log("publish", draft);
            setBuildCustom(null);
          }}
        />
      )}
    </div>
  );
}

// ── Agent detail data ───────────────────────────────────────────────────────

type AgentDetail = {
  about: string;
  stats: { label: string; value: string }[];
  capabilities: { icon: string; label: string; desc: string }[];
  tools: { name: string; icon: string; perm: string; scope: string }[];
  reviews: { author: string; team: string; rating: number; body: string; time: string }[];
};

const DETAIL_MAP: Record<string, Partial<AgentDetail>> = {
  a1: {
    about: "Iris watches your inbox 24/7. She classifies every message (lead, billing, support, noise), writes context-aware draft replies in your tone, and escalates anything urgent to Slack. She will never send without your approval unless you turn on auto-pilot.",
    stats: [
      { label: "Avg. emails handled / week", value: "1,240" },
      { label: "Reply quality rating", value: "4.9 / 5" },
      { label: "Active since", value: "Jan 2025" },
    ],
    capabilities: [
      { icon: "mark_email_read", label: "Classify inbox", desc: "Sorts into lead, billing, support, partnership, noise." },
      { icon: "edit_note", label: "Draft replies", desc: "Writes in your tone; learns from your sent folder." },
      { icon: "emergency", label: "Escalate urgent", desc: "Pings Slack when keywords or VIPs trigger." },
      { icon: "schedule", label: "Follow-up nudges", desc: "Tracks threads with no reply after 3 days." },
      { icon: "label", label: "Auto-label & file", desc: "Applies Gmail labels and archives handled mail." },
      { icon: "shield", label: "Privacy guard", desc: "Redacts PII before sending anywhere outside your workspace." },
    ],
    tools: [
      { name: "Gmail", icon: "mail", perm: "Read + draft", scope: "Last 90 days" },
      { name: "Slack", icon: "forum", perm: "Post to #inbox", scope: "1 channel" },
      { name: "Notion", icon: "description", perm: "Append to DB", scope: '"Inbox log" DB' },
      { name: "Calendar", icon: "event", perm: "Read busy times", scope: "Primary only" },
    ],
    reviews: [
      { author: "Maria S.", team: "Roastery owner", rating: 5, body: "Iris cut my morning inbox time from 90 min to 12. She actually sounds like me.", time: "2d" },
      { author: "Devang P.", team: "Agency founder", rating: 5, body: "Catches urgent stuff I would have missed. Draft quality is scarily good.", time: "1w" },
      { author: "Lena K.", team: "Operator", rating: 4, body: "Great, but I had to retrain her tone for the first week.", time: "3w" },
    ],
  },
};

const DEFAULT_DETAIL: AgentDetail = {
  about: "A specialist agent, pre-trained on best practices and tuned to your workspace. Ships working output on the first run; improves with feedback.",
  stats: [
    { label: "Runs this month", value: "—" },
    { label: "Quality rating", value: "—" },
    { label: "Active since", value: "2025" },
  ],
  capabilities: [
    { icon: "bolt", label: "Core task", desc: "Executes its specialty end-to-end." },
    { icon: "auto_awesome", label: "Context-aware", desc: "Learns your team, tone, and preferences." },
    { icon: "shield", label: "Safe by default", desc: "Requires approval on destructive actions." },
    { icon: "schedule", label: "Schedulable", desc: "Run on trigger, cron, or ad-hoc." },
  ],
  tools: [],
  reviews: [
    { author: "Anon team", team: "", rating: 5, body: "Works exactly as advertised — saved us a hire.", time: "1w" },
  ],
};

function getDetail(agent: Agent): AgentDetail {
  return { ...DEFAULT_DETAIL, ...(DETAIL_MAP[agent.id] || {}) };
}

// ── Agent Skills section ───────────────────────────────────────────────────
//
// Lists the SKILL.md-style prompt skills loaded into the agent's system
// prompt. Skills are LLM-driven (instructions + reasoning per call), as
// opposed to workflows (deterministic code).

// `draft` — agent doesn't exist yet (custom-agent build modal). Edits stage
//           in local state until the draft is saved/published.
// `preHire` — existing agent, user hasn't hired. Edits stage in local state
//           until hire; uploads/builds are disabled because they need
//           server processing tied to a real (user, slug) pair.
// `postHire` — existing agent, user has hired. Edits persist live; uploads
//           and builds run server-side.
export type DetailMode = "draft" | "preHire" | "postHire";

export interface AgentSkill {
  source: "anthropic" | "clawhub" | "upload";
  externalId: string;
  name: string;
  description: string;
  // Set on draft uploads (parsed client-side, not yet on the server).
  // Carries the SKILL.md body so the publish step can persist it without
  // re-parsing. Empty for skills that came from the registry or the server.
  instructions?: string;
  unresolved?: boolean;
  registryUnavailable?: boolean;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  version: string;
  description: string | null;
}

interface SkillBrowseResult {
  id: string;
  name: string;
  description: string;
}

export function AgentSkillsSection({
  agent,
  mode,
  skills,
  isLoading = false,
  onRemove,
  onAdd,
  onUpload,
}: {
  agent: Agent;
  mode: DetailMode;
  skills: AgentSkill[];
  isLoading?: boolean;
  onRemove: (skill: AgentSkill) => void;
  onAdd: (skill: AgentSkill) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const stagingHint =
    mode === "preHire" && skills.length > 0
      ? `These defaults will be saved when you hire ${agent.name}; remove any you don't want.`
      : mode === "draft" && skills.length > 0
        ? "Edits stage locally and save when you publish the agent."
        : null;
  return (
    <section className="border-t border-default-200 py-5 dark:border-white/8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-default-800 dark:text-white/90">
            Skills
          </h2>
          <p className="mt-0.5 text-[13px] text-default-400 dark:text-white/45">
            Prompt-level know-how merged into {agent.name}&apos;s instructions.{" "}
            <span className="text-default-500 dark:text-white/55">
              The LLM reasons every call — flexible, uses tokens, not deterministic.
            </span>
            {stagingHint && (
              <span className="ml-1 text-violet-600 dark:text-violet-400">
                {stagingHint}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="flat"
            onPress={() => setAddOpen(true)}
            startContent={<Icon name="add" variant="round" className="text-base" />}
          >
            Add skill
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-3 py-2.5 text-sm text-default-400 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/40">
          <Spinner size="sm" /> Loading skills…
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-default-200 bg-default-50 px-4 py-5 text-center text-sm text-default-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
          {mode === "postHire"
            ? `No skills attached. ${agent.name} runs on the base persona only.`
            : mode === "draft"
              ? "No skills yet. Add from a registry or upload your own."
              : `${agent.name} ships without preset skills.`}
        </div>
      ) : (
        <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto pr-1">
          {skills.map((s) => (
            <div
              key={`${s.source}:${s.externalId}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-default-200 bg-white px-3.5 py-3 dark:border-white/8 dark:bg-white/[0.03]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                <Icon name="psychology" variant="round" className="text-base" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-default-800 dark:text-white/90">
                  {s.name}
                </div>
                <div className="mt-0.5 line-clamp-1 text-xs text-default-400 dark:text-white/45">
                  {s.registryUnavailable
                    ? `Registry "${s.source}" not configured on this server.`
                    : s.unresolved
                      ? `Couldn't fetch from ${s.source} registry.`
                      : (s.description || `${s.source}/${s.externalId}`)}
                </div>
              </div>
              <Button size="sm" variant="light" onPress={() => onRemove(s)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <AddSkillModal
          agentSlug={agent.id}
          mode={mode}
          existing={skills}
          onClose={() => setAddOpen(false)}
          onAdd={(skill) => {
            onAdd(skill);
            setAddOpen(false);
          }}
          onRemove={(skill) => {
            // Stay in the modal so the user can keep toggling skills.
            onRemove(skill);
          }}
          onUpload={async (file) => {
            await onUpload(file);
            setAddOpen(false);
          }}
        />
      )}
    </section>
  );
}

// Skill empty/non-empty copy is handled inline above. The empty state
// message is mode-aware too: pre-hire/draft = "ships without preset skills";
// post-hire = "no skills attached".

function AddSkillModal({
  agentSlug,
  mode,
  existing,
  onClose,
  onAdd,
  onRemove,
  onUpload,
}: {
  agentSlug: string;
  mode: DetailMode;
  existing: AgentSkill[];
  onClose: () => void;
  onAdd: (skill: AgentSkill) => void;
  onRemove: (skill: AgentSkill) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  type Tab = "anthropic" | "clawhub" | "upload";
  const [tab, setTab] = useState<Tab>("anthropic");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkillBrowseResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const existingKeys = useMemo(
    () => new Set(existing.map((s) => `${s.source}:${s.externalId}`)),
    [existing],
  );

  // Reset + fetch first page when tab or query changes.
  useEffect(() => {
    if (tab === "upload") return;
    let cancelled = false;
    setLoading(true);
    setBrowseError(null);
    setResults([]);
    setNextCursor(null);
    fetchAPI(
      `/api/agent/worker/${encodeURIComponent(agentSlug)}/skills/browse?source=${tab}` +
        (query ? `&query=${encodeURIComponent(query)}` : ""),
    )
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 503) {
          setBrowseError(
            tab === "anthropic"
              ? "Anthropic skills registry is unreachable right now."
              : "ClawHub is unreachable right now.",
          );
          return;
        }
        if (!res.ok) {
          setBrowseError(`Browse failed: ${res.status}`);
          return;
        }
        const data = await res.json();
        setResults(Array.isArray(data?.skills) ? data.skills : []);
        setNextCursor(
          typeof data?.nextCursor === "string" && data.nextCursor.length > 0
            ? data.nextCursor
            : null,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setBrowseError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, query, agentSlug]);

  const loadMore = useCallback(async () => {
    if (tab === "upload" || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchAPI(
        `/api/agent/worker/${encodeURIComponent(agentSlug)}/skills/browse?source=${tab}` +
          (query ? `&query=${encodeURIComponent(query)}` : "") +
          `&cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const more: SkillBrowseResult[] = Array.isArray(data?.skills)
        ? data.skills
        : [];
      // Dedupe against existing results (the recommended set may overlap
      // with the API page; the direct-slug merge can repeat too).
      setResults((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        const append = more.filter((s) => s.id && !seen.has(s.id));
        return prev.concat(append);
      });
      setNextCursor(
        typeof data?.nextCursor === "string" && data.nextCursor.length > 0
          ? data.nextCursor
          : null,
      );
    } finally {
      setLoadingMore(false);
    }
  }, [tab, query, agentSlug, nextCursor, loadingMore]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        await onUpload(file);
      } finally {
        setUploading(false);
      }
    },
    [onUpload],
  );

  const tabClass = (active: boolean) =>
    `flex-1 px-3 py-2 text-[13px] font-semibold border-b-2 transition-colors ${
      active
        ? "border-violet-500 text-default-800 dark:text-white/90"
        : "border-transparent text-default-400 hover:text-default-600 dark:text-white/45 dark:hover:text-white/70"
    }`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[640px] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1a1d]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-default-200 px-5 py-4 dark:border-white/8">
          <div className="text-sm font-semibold text-default-800 dark:text-white/90">
            Add skill
          </div>
          <p className="mt-0.5 text-xs text-default-400 dark:text-white/45">
            Browse a registry or upload your own SKILL.md / ZIP.
          </p>
        </div>
        <div className="flex border-b border-default-200 dark:border-white/8">
          <button
            type="button"
            onClick={() => setTab("anthropic")}
            className={tabClass(tab === "anthropic")}
          >
            Claude
          </button>
          <button
            type="button"
            onClick={() => setTab("clawhub")}
            className={tabClass(tab === "clawhub")}
          >
            ClawHub
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={tabClass(tab === "upload")}
          >
            Upload
          </button>
        </div>

        {tab === "upload" ? (
          <UploadSkillTab
            mode={mode}
            uploading={uploading}
            onSelectFile={handleUpload}
          />
        ) : (
          <BrowseSkillTab
            tab={tab}
            query={query}
            setQuery={setQuery}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={!!nextCursor}
            onLoadMore={loadMore}
            results={results}
            browseError={browseError}
            existingKeys={existingKeys}
            onPick={(s) =>
              onAdd({
                source: tab,
                externalId: s.id,
                name: s.name,
                description: s.description,
              })
            }
            onRemove={(s) =>
              onRemove({
                source: tab,
                externalId: s.id,
                name: s.name,
                description: s.description,
              })
            }
          />
        )}

        <div className="flex justify-end border-t border-default-200 px-3 py-2 dark:border-white/8">
          <Button size="sm" variant="light" onPress={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function BrowseSkillTab({
  tab,
  query,
  setQuery,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  results,
  browseError,
  existingKeys,
  onPick,
  onRemove,
}: {
  tab: "anthropic" | "clawhub";
  query: string;
  setQuery: (v: string) => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  results: SkillBrowseResult[];
  browseError: string | null;
  existingKeys: Set<string>;
  onPick: (skill: SkillBrowseResult) => void;
  onRemove: (skill: SkillBrowseResult) => void;
}) {
  // External browse links open in a new tab so the user can read the full
  // SKILL.md / metadata (the public APIs don't expose full content).
  const externalUrl = (id: string) =>
    tab === "anthropic"
      ? `https://github.com/anthropics/skills/tree/main/skills/${id}`
      : `https://clawhub.ai/skills/${id}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-default-200 px-5 py-3 dark:border-white/8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tab === "anthropic"
              ? "Search Anthropic skills…"
              : "Search by name or paste a slug…"
          }
          className="w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-violet-300 dark:border-white/10 dark:bg-white/5"
        />
        {tab === "clawhub" && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-default-400 dark:text-white/40">
            Browse the full catalog at{" "}
            <a
              href="https://clawhub.ai/skills"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-violet-600 hover:underline dark:text-violet-400"
            >
              clawhub.ai/skills
              <Icon name="open_in_new" variant="round" className="text-[12px]" />
            </a>{" "}
            and paste any slug above to add it.
          </p>
        )}
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
        onScroll={(e) => {
          // Trigger load-more when the user scrolls within ~80px of the
          // bottom. Cheap, no IntersectionObserver — fits the bounded list.
          const el = e.currentTarget;
          if (
            hasMore &&
            !loadingMore &&
            !loading &&
            el.scrollHeight - el.scrollTop - el.clientHeight < 80
          ) {
            onLoadMore();
          }
        }}
      >
        {browseError ? (
          <div className="px-3 py-6 text-center text-sm text-default-400 dark:text-white/40">
            {browseError}
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-default-400 dark:text-white/40">
            <Spinner size="sm" /> Loading skills…
          </div>
        ) : results.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-default-400 dark:text-white/40">
            No skills found.
          </div>
        ) : (
          results.map((s) => {
            const already = existingKeys.has(`${tab}:${s.id}`);
            return (
              <div
                key={s.id}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-default-100 dark:hover:bg-white/8"
              >
                <Icon
                  name="psychology"
                  variant="round"
                  className="text-base text-violet-500"
                />
                <button
                  type="button"
                  onClick={() => (already ? onRemove(s) : onPick(s))}
                  className="min-w-0 text-left"
                >
                  <div className="truncate text-[13.5px] font-semibold text-default-800 dark:text-white/90">
                    {s.name}
                  </div>
                  <div className="line-clamp-1 text-xs text-default-400 dark:text-white/45">
                    {s.description || `${tab}/${s.id}`}
                  </div>
                </button>
                <a
                  href={externalUrl(s.id)}
                  target="_blank"
                  rel="noreferrer"
                  title="Open on registry"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-default-400 transition-colors hover:bg-default-200 hover:text-default-700 dark:hover:bg-white/10 dark:hover:text-white/80"
                >
                  <Icon name="open_in_new" variant="round" className="text-base" />
                </a>
                <button
                  type="button"
                  onClick={() => (already ? onRemove(s) : onPick(s))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-default-400 transition-colors hover:bg-default-200 hover:text-default-700 dark:hover:bg-white/10 dark:hover:text-white/80"
                  title={already ? "Remove" : "Add"}
                >
                  <Icon
                    name={already ? "close" : "add"}
                    variant="round"
                    className="text-base"
                  />
                </button>
              </div>
            );
          })
        )}
        {/* Pagination footer — visible only when there's at least one page
            already rendered. Loading spinner appears while fetching the
            next page; nothing is shown when the registry has no more
            pages (the list just ends). */}
        {results.length > 0 && loadingMore && (
          <div className="flex items-center justify-center gap-2 px-3 py-3 text-xs text-default-400 dark:text-white/40">
            <Spinner size="sm" /> Loading more…
          </div>
        )}
      </div>
    </div>
  );
}

function UploadSkillTab({
  mode,
  uploading,
  onSelectFile,
}: {
  mode: DetailMode;
  uploading: boolean;
  onSelectFile: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Upload is allowed in every mode now:
  //   - postHire → file goes to /skills/upload immediately, server parses + stores.
  //   - preHire  → file is held client-side until hire; server parses at hire.
  //                If parsing fails, the hire is aborted (no HiredAgent row).
  //   - draft    → file is parsed client-side and staged in the draft.
  const stagingHint =
    mode === "preHire"
      ? "ZIPs are kept in the browser until you hire. The server parses them then — if parsing fails, the hire is aborted and you'll be asked to fix it."
      : mode === "draft"
        ? "ZIPs are parsed in the browser and staged with the draft."
        : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-stretch gap-3 px-5 py-6">
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,.zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onSelectFile(f);
          // Reset so the same file can be chosen twice if needed.
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-default-200 bg-default-50 px-6 py-8 text-sm text-default-500 transition-colors hover:border-violet-300 hover:bg-violet-50/30 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-violet-500/30 dark:hover:bg-violet-500/5"
      >
        {uploading ? (
          <Spinner size="sm" />
        ) : (
          <Icon name="upload_file" variant="round" className="text-3xl text-default-400" />
        )}
        <div className="font-semibold text-default-700 dark:text-white/85">
          {uploading ? "Uploading…" : "Choose a SKILL.md or ZIP"}
        </div>
        <div className="text-xs text-default-400 dark:text-white/45">
          ZIPs must contain a SKILL.md at the root or a subfolder.
        </div>
      </button>
      {stagingHint && (
        <p className="text-center text-[11.5px] leading-relaxed text-default-400 dark:text-white/40">
          {stagingHint}
        </p>
      )}
    </div>
  );
}

// ── Agent Workflows section ────────────────────────────────────────────────
//
// Lives inside the detail card (not the worker chat). Lists workflows the
// user has attached to this agent and lets them attach an existing one or
// kick off the workflow builder for a new one.

interface UserWorkflow {
  id: string;
  name: string;
  version: string;
  description: string | null;
}

export function AgentWorkflowsSection({
  agent,
  mode,
  workflows,
  isLoading = false,
  onAttach,
  onDetach,
  onBuildAttached,
}: {
  agent: Agent;
  mode: DetailMode;
  workflows: AgentWorkflow[];
  isLoading?: boolean;
  onAttach: (w: AgentWorkflow) => void;
  onDetach: (workflowId: string) => void;
  // Called once a post-hire build completes, so the modal can re-fetch state.
  onBuildAttached: () => void;
}) {
  // Build new is post-hire-only: it kicks off an async server build that needs
  // a persisted (user, slug) pair to attach the result to.
  const buildEnabled = mode === "postHire";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [buildGoal, setBuildGoal] = useState("");
  const [buildTaskId, setBuildTaskId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);

  const startBuild = useCallback(async () => {
    if (!buildGoal.trim()) return;
    try {
      const res = await fetchAPI(
        `/api/agent/worker/${encodeURIComponent(agent.id)}/workflows/build`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: buildGoal }),
        },
      );
      if (!res.ok) throw new Error(`Build start failed: ${res.status}`);
      const data = await res.json();
      setBuildTaskId(data.taskId);
      setBuildStatus("running");
      addToast({
        title: "Workflow build started",
        description: "I'll attach it when it's ready.",
        color: "primary",
      });
    } catch (err) {
      addToast({
        title: "Couldn't start build",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    }
  }, [agent.id, buildGoal]);

  // Poll for build completion. The backend's build-complete callback
  // auto-attaches the resulting workflow.
  useEffect(() => {
    if (!buildTaskId || buildStatus !== "running") return;
    const handle = setInterval(async () => {
      try {
        const res = await fetchAPI(
          `/api/workflow/run/status?taskId=${encodeURIComponent(buildTaskId)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "completed" || data.status === "failed") {
          setBuildStatus(data.status);
          if (data.status === "completed") {
            onBuildAttached();
            setBuildOpen(false);
            setBuildGoal("");
            setBuildTaskId(null);
          }
        }
      } catch {
        // keep polling
      }
    }, 3000);
    return () => clearInterval(handle);
  }, [buildTaskId, buildStatus, onBuildAttached]);

  return (
    <section className="border-t border-default-200 py-5 dark:border-white/8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-default-800 dark:text-white/90">
            Workflows
          </h2>
          <p className="mt-0.5 text-[13px] text-default-400 dark:text-white/45">
            Code or node-based automations {agent.name} can call.{" "}
            <span className="text-default-500 dark:text-white/55">
              Deterministic, fast, no LLM tokens used at run time.
            </span>
            {mode === "preHire" && (
              <span className="ml-1 text-violet-600 dark:text-violet-400">
                Edits stage locally and persist when you hire {agent.name}.
              </span>
            )}
            {mode === "draft" && (
              <span className="ml-1 text-violet-600 dark:text-violet-400">
                Edits stage locally and save when you publish the agent.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="flat"
            onPress={() => setPickerOpen(true)}
            startContent={<Icon name="add" variant="round" className="text-base" />}
          >
            Add existing
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            onPress={() => setBuildOpen(true)}
            isDisabled={!buildEnabled}
            startContent={<Icon name="auto_awesome" variant="round" className="text-base" />}
          >
            Build new
          </Button>
        </div>
      </div>

      {!buildEnabled && (
        <p className="mb-2 text-[12px] text-default-400 dark:text-white/40">
          {mode === "preHire"
            ? "Build new is available after hiring — it kicks off a long-running server build that needs persisted state."
            : "Build new is available after the agent is published."}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-3 py-2.5 text-sm text-default-400 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/40">
          <Spinner size="sm" /> Loading workflows…
        </div>
      ) : workflows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-default-200 bg-default-50 px-4 py-5 text-center text-sm text-default-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
          No workflows attached yet.{" "}
          {mode === "postHire"
            ? `Add an existing one or build a new workflow tailored for ${agent.name}.`
            : mode === "draft"
              ? `Pick from your existing workflows — they'll save when you publish ${agent.name}.`
              : `Add an existing one — it'll be saved when you hire ${agent.name}.`}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-default-200 bg-white px-3.5 py-3 dark:border-white/8 dark:bg-white/[0.03]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-default-100 text-default-500 dark:bg-white/8 dark:text-white/55">
                <Icon name="account_tree" variant="round" className="text-base" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-default-800 dark:text-white/90">
                  {w.name}{" "}
                  <span className="text-xs font-normal text-default-400 dark:text-white/40">
                    v{w.version}
                  </span>
                </div>
                {w.description && (
                  <div className="mt-0.5 line-clamp-1 text-xs text-default-400 dark:text-white/45">
                    {w.description}
                  </div>
                )}
              </div>
              <Button size="sm" variant="light" onPress={() => onDetach(w.id)}>
                Detach
              </Button>
            </div>
          ))}
        </div>
      )}

      {pickerOpen && (
        <ExistingWorkflowPicker
          excludeIds={workflows.map((w) => w.id)}
          onClose={() => setPickerOpen(false)}
          onPick={(w) => {
            onAttach(w);
            setPickerOpen(false);
          }}
        />
      )}

      {buildOpen && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="mb-2 text-[13px] font-semibold text-default-800 dark:text-white/90">
            Build a workflow for {agent.name}
          </div>
          <textarea
            value={buildGoal}
            onChange={(e) => setBuildGoal(e.target.value)}
            placeholder="Describe what the workflow should do, e.g. 'When a new Stripe invoice is overdue by 7 days, draft a polite reminder and post a Slack alert.'"
            rows={3}
            disabled={buildStatus === "running"}
            className="w-full resize-none rounded-lg border border-default-200 bg-white px-3 py-2 text-[13px] text-default-800 outline-none focus:border-amber-300 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/85"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="text-xs text-default-400 dark:text-white/40">
              {buildStatus === "running"
                ? "Building… this can take a few minutes."
                : buildStatus === "failed"
                  ? "Build failed. Try again with a clearer goal."
                  : "Palmos will design, generate, and attach this workflow."}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="light"
                onPress={() => {
                  setBuildOpen(false);
                  setBuildGoal("");
                  setBuildTaskId(null);
                  setBuildStatus(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                isDisabled={!buildGoal.trim() || buildStatus === "running"}
                onPress={startBuild}
                startContent={
                  buildStatus === "running" ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <Icon name="auto_awesome" variant="round" className="text-base" />
                  )
                }
              >
                {buildStatus === "running" ? "Building…" : "Start build"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ExistingWorkflowPicker({
  excludeIds,
  onClose,
  onPick,
}: {
  excludeIds: string[];
  onClose: () => void;
  onPick: (w: AgentWorkflow) => void;
}) {
  const [workflows, setWorkflows] = useState<UserWorkflow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAPI("/api/workflow/list")
      .then((res) => (res.ok ? res.json() : { workflows: [] }))
      .then((data) => {
        if (cancelled) return;
        const list: UserWorkflow[] = Array.isArray(data?.workflows)
          ? data.workflows
          : Array.isArray(data)
            ? data
            : [];
        setWorkflows(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const excluded = new Set(excludeIds);
    return workflows
      .filter((w) => !excluded.has(w.id))
      .filter(
        (w) =>
          !q ||
          w.name.toLowerCase().includes(q) ||
          (w.description ?? "").toLowerCase().includes(q),
      );
  }, [workflows, query, excludeIds]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[560px] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1a1d]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-default-200 px-5 py-4 dark:border-white/8">
          <div className="text-sm font-semibold text-default-800 dark:text-white/90">
            Attach an existing workflow
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="mt-3 w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-amber-300 dark:border-white/10 dark:bg-white/5"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-default-400 dark:text-white/40">
              <Spinner size="sm" /> Loading workflows…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-default-400 dark:text-white/40">
              No workflows found.
            </div>
          ) : (
            filtered.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() =>
                  onPick({
                    id: w.id,
                    name: w.name,
                    version: w.version,
                    description: w.description,
                  })
                }
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-default-100 dark:hover:bg-white/8"
              >
                <Icon
                  name="account_tree"
                  variant="round"
                  className="text-base text-default-400"
                />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-default-800 dark:text-white/90">
                    {w.name}
                  </div>
                  <div className="truncate text-xs text-default-400 dark:text-white/45">
                    v{w.version}
                    {w.description ? ` · ${w.description}` : ""}
                  </div>
                </div>
                <Icon
                  name="add"
                  variant="round"
                  className="text-base text-default-400"
                />
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end border-t border-default-200 px-3 py-2 dark:border-white/8">
          <Button size="sm" variant="light" onPress={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Agent Detail Modal ──────────────────────────────────────────────────────

// Pre-hire skill removals are persisted to localStorage so the edit survives
// closing/reopening the detail card and full page reloads. Cleared on
// successful hire. Each entry is a Set<"source:externalId">. Uploads are
// excluded (the File can't be re-staged after reload).
const PRE_HIRE_REMOVED_KEY = (slug: string) =>
  `pe:preHireRemovedSkills:${slug}`;

function loadPreHireRemoved(slug: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PRE_HIRE_REMOVED_KEY(slug));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function savePreHireRemoved(slug: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    if (set.size === 0) {
      window.localStorage.removeItem(PRE_HIRE_REMOVED_KEY(slug));
    } else {
      window.localStorage.setItem(
        PRE_HIRE_REMOVED_KEY(slug),
        JSON.stringify([...set]),
      );
    }
  } catch {
    // Storage quota or disabled — pre-hire edits will then only persist
    // for the lifetime of the component, which is the prior behavior.
  }
}

function clearPreHireRemoved(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PRE_HIRE_REMOVED_KEY(slug));
  } catch {}
}

interface TeamSummary {
  id: string;
  name: string;
}

export function AgentDetailModal({
  agent,
  onClose,
  onHire,
}: {
  agent: Agent;
  onClose: () => void;
  onHire: (
    agent: Agent,
    teamId: string | null,
    snapshot: {
      skills: { source: "anthropic" | "clawhub"; externalId: string }[];
      workflowIds: string[];
      // Files staged pre-hire; the parent uploads them via multipart and
      // resolves to false if the server rejects any of them. The modal
      // stays in pre-hire mode on false so the user can fix the upload.
      pendingUploads: { externalId: string; file: File }[];
      // Optional avatar override picked pre-hire ("emoji/1f9d0" etc.).
      customAvatarPath?: string | null;
    },
  ) => Promise<boolean>;
}) {
  const d = getDetail(agent);
  const category = CATEGORIES.find((c) => c.slug === agent.cat);

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchAPI("/api/agent/teams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        setTeams(
          data.map((t: any) => ({ id: t.id as string, name: t.name as string })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Hire status + skills/workflows state ─────────────────────────────────
  // Pre-hire: skills/workflows are seed presets; mutations stage in local state
  //           and get persisted on hire.
  // Post-hire: skills/workflows are persisted rows; mutations call the
  //            attach/detach routes immediately.
  const [hired, setHired] = useState(false);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);

  // Avatar picker: pre-hire override of the agent's default avatarPath.
  // null = use the seed avatar (whatever agent.lottie already points to).
  const [customAvatarPath, setCustomAvatarPath] = useState<string | null>(null);
  const [customAvatarLottie, setCustomAvatarLottie] = useState<string | null>(null);

  // Files uploaded pre-hire are held here keyed by externalId. They get
  // posted as multipart along with the hire payload; the server parses + stores
  // each. Removed from this map when the user removes the staged skill.
  const pendingUploadsRef = useRef<Map<string, File>>(new Map());

  const fetchState = useCallback(async () => {
    try {
      const res = await fetchAPI(
        `/api/agent/worker/${encodeURIComponent(agent.id)}/state`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setHired(!!data.hired);
      // Pre-hire: re-apply any skills the user has staged for removal so the
      // edit persists across modal close/reopen and across reloads. Cleared
      // on successful hire.
      const incoming: AgentSkill[] = data.skills ?? [];
      if (!data.hired) {
        const removed = loadPreHireRemoved(agent.id);
        setSkills(
          incoming.filter(
            (s) => !removed.has(`${s.source}:${s.externalId}`),
          ),
        );
      } else {
        setSkills(incoming);
      }
      setWorkflows(data.workflows ?? []);
    } catch {
      // Best-effort; missing state means empty defaults.
    } finally {
      setStateLoaded(true);
    }
  }, [agent.id]);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  // Mutation handlers — branch on `hired`. The handlers update local state
  // optimistically; for post-hire, they also call the corresponding API.
  // On API failure we re-fetch so the UI re-syncs with truth.
  const handleSkillRemove = useCallback(
    async (skill: AgentSkill) => {
      setSkills((prev) =>
        prev.filter(
          (s) => !(s.source === skill.source && s.externalId === skill.externalId),
        ),
      );
      // Drop any pending upload tied to this externalId.
      if (skill.source === "upload") {
        pendingUploadsRef.current.delete(skill.externalId);
      }
      if (!hired) {
        // Persist pre-hire removal so it survives close/reopen + reload.
        // Uploads are session-only (the File can't be re-staged), so don't
        // persist those — they'd dangle.
        if (skill.source !== "upload") {
          const removed = loadPreHireRemoved(agent.id);
          removed.add(`${skill.source}:${skill.externalId}`);
          savePreHireRemoved(agent.id, removed);
        }
        return;
      }
      try {
        const res = await fetchAPI(
          `/api/agent/worker/${encodeURIComponent(agent.id)}/skills/detach`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: skill.source,
              externalId: skill.externalId,
            }),
          },
        );
        if (!res.ok) throw new Error(`Detach failed: ${res.status}`);
      } catch (err) {
        addToast({
          title: "Couldn't remove skill",
          description: err instanceof Error ? err.message : "Unknown error",
          color: "danger",
        });
        void fetchState();
      }
    },
    [agent.id, hired, fetchState],
  );

  const handleSkillAdd = useCallback(
    async (skill: AgentSkill) => {
      // Avoid dupes.
      if (
        skills.some(
          (s) => s.source === skill.source && s.externalId === skill.externalId,
        )
      ) {
        return;
      }
      setSkills((prev) => [...prev, skill]);
      if (!hired) {
        // If the user is re-adding a previously staged-removed default,
        // clear it from the persisted removal set.
        if (skill.source !== "upload") {
          const removed = loadPreHireRemoved(agent.id);
          if (removed.delete(`${skill.source}:${skill.externalId}`)) {
            savePreHireRemoved(agent.id, removed);
          }
        }
        return;
      }
      try {
        const res = await fetchAPI(
          `/api/agent/worker/${encodeURIComponent(agent.id)}/skills/attach`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: skill.source,
              externalId: skill.externalId,
            }),
          },
        );
        if (!res.ok) throw new Error(`Attach failed: ${res.status}`);
      } catch (err) {
        addToast({
          title: "Couldn't add skill",
          description: err instanceof Error ? err.message : "Unknown error",
          color: "danger",
        });
        void fetchState();
      }
    },
    [agent.id, hired, skills, fetchState],
  );

  const handleSkillUpload = useCallback(
    async (file: File) => {
      // Quick client-side guard so we don't stage clearly-invalid uploads
      // even pre-hire. The full SKILL.md parse runs server-side at hire time.
      const lower = file.name.toLowerCase();
      const allowed =
        lower.endsWith(".zip") ||
        lower.endsWith(".md") ||
        lower.endsWith(".markdown");
      if (!allowed) {
        addToast({
          title: "Unsupported file",
          description: "Upload a .zip with SKILL.md inside, or a .md file.",
          color: "danger",
        });
        return;
      }
      const MAX_BYTES = 2 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        addToast({
          title: "File too large",
          description: `Max ${MAX_BYTES / 1024 / 1024} MB.`,
          color: "danger",
        });
        return;
      }

      if (hired) {
        // Post-hire: server parses + persists immediately.
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetchAPI(
            `/api/agent/worker/${encodeURIComponent(agent.id)}/skills/upload`,
            { method: "POST", body: fd },
          );
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.message ?? `Upload failed: ${res.status}`);
          }
          await fetchState();
          addToast({ title: "Skill uploaded", color: "success" });
        } catch (err) {
          addToast({
            title: "Upload failed",
            description: err instanceof Error ? err.message : "Unknown error",
            color: "danger",
          });
        }
        return;
      }

      // Pre-hire: hold the file, stage a placeholder skill. Server parses
      // at hire — if it fails, hire is aborted (handled by the hire flow).
      const externalId = `upload-${
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)
      }`;
      pendingUploadsRef.current.set(externalId, file);
      setSkills((prev) => [
        ...prev,
        {
          source: "upload",
          externalId,
          name: file.name,
          description: "Pending upload — server parses on hire.",
        },
      ]);
      addToast({ title: "Staged for hire", color: "primary" });
    },
    [agent.id, hired, fetchState],
  );

  const handleWorkflowAttach = useCallback(
    async (w: AgentWorkflow) => {
      if (workflows.some((x) => x.id === w.id)) return;
      setWorkflows((prev) => [...prev, w]);
      if (!hired) return;
      try {
        const res = await fetchAPI(
          `/api/agent/worker/${encodeURIComponent(agent.id)}/workflows/attach`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workflowId: w.id }),
          },
        );
        if (!res.ok) throw new Error(`Attach failed: ${res.status}`);
      } catch (err) {
        addToast({
          title: "Couldn't attach workflow",
          description: err instanceof Error ? err.message : "Unknown error",
          color: "danger",
        });
        void fetchState();
      }
    },
    [agent.id, hired, workflows, fetchState],
  );

  const handleWorkflowDetach = useCallback(
    async (workflowId: string) => {
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
      if (!hired) return;
      try {
        const res = await fetchAPI(
          `/api/agent/worker/${encodeURIComponent(agent.id)}/workflows/detach`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workflowId }),
          },
        );
        if (!res.ok) throw new Error(`Detach failed: ${res.status}`);
      } catch (err) {
        addToast({
          title: "Couldn't detach workflow",
          description: err instanceof Error ? err.message : "Unknown error",
          color: "danger",
        });
        void fetchState();
      }
    },
    [agent.id, hired, fetchState],
  );

  const hire = useCallback(
    async (teamId: string | null) => {
      const registrySkills = skills.flatMap((s) =>
        s.source === "upload"
          ? []
          : [{ source: s.source, externalId: s.externalId }],
      );
      const pendingUploads: { externalId: string; file: File }[] = skills
        .filter((s) => s.source === "upload")
        .map((s) => ({
          externalId: s.externalId,
          file: pendingUploadsRef.current.get(s.externalId)!,
        }))
        .filter((u) => u.file instanceof File);

      const ok = await onHire(agent, teamId, {
        skills: registrySkills,
        workflowIds: workflows.map((w) => w.id),
        pendingUploads,
        customAvatarPath,
      });
      // Only refresh on success — failed hires keep the modal in pre-hire
      // mode so the user can fix the bad upload.
      if (ok) {
        pendingUploadsRef.current.clear();
        clearPreHireRemoved(agent.id);
        await fetchState();
      }
    },
    [agent, onHire, skills, workflows, fetchState, customAvatarPath],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative grid h-full max-h-[860px] w-full max-w-[1180px] overflow-hidden rounded-[20px] bg-white shadow-2xl sm:grid-cols-[1fr_380px] dark:bg-[#18181b] animate-in slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-default-200 bg-white/80 text-default-500 backdrop-blur-sm transition-colors hover:bg-white hover:text-default-800 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
        >
          <Icon name="close" variant="round" className="text-lg" />
        </button>

        {/* ── Left: Main content ── */}
        <div className="flex min-h-0 flex-col border-r border-default-200 dark:border-white/8">
          {/* Hero */}
          <div
            className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-default-200 px-8 py-7 dark:border-white/8"
            style={{ background: `linear-gradient(135deg, hsl(${agent.hue} 55% 96%), hsl(${(agent.hue + 30) % 360} 55% 92%) 60%, transparent 100%)` }}
          >
            <div className="flex flex-col items-center gap-1.5">
              <AgentAvatar
                agent={agent}
                size={88}
                lottieOverride={customAvatarLottie ?? undefined}
              />
              {!hired && (
                <AvatarPicker
                  selectedPath={customAvatarPath}
                  onSelect={(path, lottie) => {
                    setCustomAvatarPath(path);
                    setCustomAvatarLottie(lottie);
                  }}
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Available now
                </span>
                {category && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-default-400 dark:text-white/45">
                    <Icon name={category.icon} variant="round" className="text-sm" />
                    {category.name}
                  </span>
                )}
              </div>
              <h1 className="text-[26px] font-bold leading-tight tracking-tight text-default-900 dark:text-white">
                {agent.name}
              </h1>
              <p className="text-sm font-medium text-default-500 dark:text-white/55">{agent.role}</p>
              <p className="mt-1 text-sm leading-relaxed text-default-600 dark:text-white/65">{agent.tagline}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs font-medium text-default-500 dark:text-white/50">
                <Stars value={agent.rating} reviews={agent.reviews} />
                <span className="text-default-300 dark:text-white/20">·</span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="schedule" variant="round" className="text-[14px]" />
                  {agent.turnaround}
                </span>
                <span className="text-default-300 dark:text-white/20">·</span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="groups" variant="round" className="text-[14px]" />
                  {agent.used}
                </span>
                <span className="text-default-300 dark:text-white/20">·</span>
                <span>
                  From <strong className="text-default-800 dark:text-white/90">${agent.price}</strong> / run
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              {hired ? (
                <Button
                  variant="flat"
                  isDisabled
                  startContent={<Icon name="check_circle" variant="round" className="text-lg" />}
                >
                  Hired
                </Button>
              ) : teams.length === 0 ? (
                <Button
                  className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white"
                  onPress={() => hire(null)}
                  startContent={<Icon name="person_add" variant="round" className="text-lg" />}
                >
                  Hire to a team
                </Button>
              ) : (
                <Popover placement="bottom-end">
                  <PopoverTrigger>
                    <Button
                      className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white"
                      startContent={<Icon name="person_add" variant="round" className="text-lg" />}
                    >
                      Hire to a team
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-1.5">
                    <div className="flex w-56 flex-col gap-0.5">
                      <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-default-400 dark:text-white/40">
                        Add to team
                      </div>
                      {teams.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => hire(t.id)}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-default-700 transition-colors hover:bg-default-100 dark:text-white/80 dark:hover:bg-white/8"
                        >
                          <Icon name="groups" variant="round" className="text-base text-default-400" />
                          <span className="truncate">{t.name}</span>
                        </button>
                      ))}
                      <div className="my-1 border-t border-default-200 dark:border-white/10" />
                      <button
                        type="button"
                        onClick={() => hire(null)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-default-600 transition-colors hover:bg-default-100 dark:text-white/70 dark:hover:bg-white/8"
                      >
                        <Icon name="person_add" variant="round" className="text-base text-default-400" />
                        Hire without a team
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <Button variant="light" size="sm" startContent={<Icon name="bookmark_border" variant="round" className="text-lg" />}>
                Save
              </Button>
            </div>
          </div>

          {/* Scrollable sections */}
          <div className="flex-1 overflow-y-auto px-8 py-6 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar]:w-2">
            {/* About */}
            <section className="pb-5">
              <h2 className="mb-1 text-base font-semibold text-default-800 dark:text-white/90">About {agent.name}</h2>
              <p className="max-w-[640px] text-sm leading-relaxed text-default-500 dark:text-white/55">{d.about}</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {d.stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-default-200 bg-default-50 p-3.5 dark:border-white/8 dark:bg-white/[0.03]">
                    <div className="text-xl font-bold tracking-tight text-default-800 dark:text-white/90">{s.value}</div>
                    <div className="mt-1 text-[11.5px] font-medium uppercase tracking-wide text-default-400 dark:text-white/40">{s.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Capabilities */}
            <section className="border-t border-default-200 py-5 dark:border-white/8">
              <h2 className="mb-1 text-base font-semibold text-default-800 dark:text-white/90">What {agent.name} can do</h2>
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                {d.capabilities.map((c) => (
                  <div key={c.label} className="flex gap-3 rounded-xl border border-default-200 bg-white p-3 dark:border-white/8 dark:bg-white/[0.03]">
                    <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      <Icon name={c.icon} variant="round" className="text-xl" />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-default-800 dark:text-white/90">{c.label}</div>
                      <div className="mt-0.5 text-xs leading-snug text-default-400 dark:text-white/45">{c.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Skills — section chrome renders immediately; content waits
                on /state. */}
            <AgentSkillsSection
              agent={agent}
              mode={hired ? "postHire" : "preHire"}
              skills={skills}
              isLoading={!stateLoaded}
              onRemove={handleSkillRemove}
              onAdd={handleSkillAdd}
              onUpload={handleSkillUpload}
            />

            {/* Workflows */}
            <AgentWorkflowsSection
              agent={agent}
              mode={hired ? "postHire" : "preHire"}
              workflows={workflows}
              isLoading={!stateLoaded}
              onAttach={handleWorkflowAttach}
              onDetach={handleWorkflowDetach}
              onBuildAttached={fetchState}
            />

            {/* Previous work */}
            <PreviousWork agent={agent} />

            {/* Tools */}
            <section className="border-t border-default-200 py-5 dark:border-white/8">
              <h2 className="mb-0.5 text-base font-semibold text-default-800 dark:text-white/90">
                Tools & integrations
                <span className="ml-2 text-xs font-medium text-default-400 dark:text-white/40">
                  {(d.tools.length || agent.tools.length)}
                </span>
              </h2>
              <p className="mb-3 text-[13px] text-default-400 dark:text-white/45">
                Granular, revocable permissions. {agent.name} can only touch what you allow.
              </p>
              <div className="flex flex-col">
                {(d.tools.length > 0
                  ? d.tools
                  : agent.tools.map((name) => ({ name, icon: "extension", perm: "Use", scope: "—" }))
                ).map((tool, i, arr) => (
                  <div
                    key={tool.name}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-t-0 border-default-200 bg-white px-3.5 py-3 dark:border-white/8 dark:bg-white/[0.03] ${
                      i === 0 ? "rounded-t-xl border-t" : ""
                    } ${i === arr.length - 1 ? "rounded-b-xl" : ""}`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-default-100 text-default-600 dark:bg-white/8 dark:text-white/60">
                      <Icon name={tool.icon} variant="round" className="text-base" />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-default-800 dark:text-white/90">{tool.name}</div>
                      <div className="mt-0.5 text-xs text-default-400 dark:text-white/40">{tool.scope}</div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {tool.perm}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section className="border-t border-default-200 py-5 dark:border-white/8">
              <h2 className="mb-3 text-base font-semibold text-default-800 dark:text-white/90">
                Reviews
                <span className="ml-2 text-xs font-medium text-default-400 dark:text-white/40">
                  {agent.reviews.toLocaleString()}
                </span>
              </h2>
              <div className="flex flex-col gap-3">
                {d.reviews.map((r, i) => (
                  <div key={i} className="rounded-xl border border-default-200 bg-white p-3.5 dark:border-white/8 dark:bg-white/[0.03]">
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <div className="text-[13px] text-default-600 dark:text-white/65">
                        <strong className="font-bold text-default-800 dark:text-white/90">{r.author}</strong>
                        {r.team && <span> · {r.team}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: r.rating }).map((_, j) => (
                            <Icon key={j} name="star" variant="round" className="text-[13px] text-amber-400" />
                          ))}
                        </span>
                        <span className="text-xs text-default-400 dark:text-white/35">{r.time}</span>
                      </div>
                    </div>
                    <p className="text-[13.5px] leading-relaxed text-default-500 dark:text-white/55">{r.body}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── Right: Chat panel ── */}
        <WorkerChatProvider agentSlug={agent.id}>
          <DetailChatPanel agent={agent} />
        </WorkerChatProvider>
      </div>
    </div>
  );
}

// ── Chat panel (try before you hire) — hooked to real agent chat ─────────

export function DetailChatPanel({ agent }: { agent: Agent }) {
  const { messages: chatMessages, isLoading, submit } = useWorkerChatContext();
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    `Show me what you can do`,
    `Run ${agent.role.toLowerCase()} on a sample task`,
    `What tools do you use?`,
  ];

  const send = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      submit(text);
      setDraft("");
    },
    [isLoading, submit],
  );

  // The worker agent's responses include a hidden suggestions block at the
  // bottom (<!--suggestions:[...]--> ); strip those before displaying.
  const displayMessages = useMemo(() => {
    const msgs: { role: "agent" | "you"; text: string }[] = [];
    for (const m of chatMessages) {
      const type = m._getType();
      const content = typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
          ? m.content
              .filter((b: any) => typeof b === "string" || b?.type === "text")
              .map((b: any) => (typeof b === "string" ? b : b.text))
              .join("")
          : "";
      if (!content.trim()) continue;
      if (type === "human") {
        msgs.push({ role: "you", text: content });
      } else if (type === "ai") {
        const cleaned = content.replace(/<!--suggestions:.*?-->\s*$/, "").trim();
        if (cleaned) msgs.push({ role: "agent", text: cleaned });
      }
    }
    return msgs;
  }, [chatMessages]);

  const hasSent = displayMessages.some((m) => m.role === "you");

  // Stick to bottom while streaming, but don't yank the user back down if
  // they've scrolled up to read earlier messages. Smooth-scroll on every
  // token causes jumpy behavior because each new animation interrupts the
  // last; pin instantly instead. We re-arm "stick" whenever the user
  // scrolls back to within 80px of the bottom.
  const stickToBottomRef = useRef(true);
  useEffect(() => {
    const el = threadRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [displayMessages, isLoading]);

  const handleThreadScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distFromBottom < 80;
  }, []);

  return (
    <aside className="flex min-h-0 flex-col bg-default-50 dark:bg-white/[0.02]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-default-200 bg-white px-4 py-3.5 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2.5">
          <AgentAvatar agent={agent} size={36} />
          <div>
            <div className="text-sm font-semibold text-default-800 dark:text-white/90">{agent.name}</div>
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-default-400 dark:text-white/45">
              <span className="h-[7px] w-[7px] rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
              Online · replies in seconds
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div ref={threadRef} onScroll={handleThreadScroll} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5">
        {/* Try-before-you-hire banner */}
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-3 dark:border-amber-500/15 dark:from-amber-500/5 dark:to-orange-500/3">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-400">
            Try-before-you-hire
          </span>
          <span className="text-xs leading-relaxed text-default-600 dark:text-white/60">
            Run {agent.name} on one of your real tasks. Free, no setup — takes about {agent.turnaround.replace("~", "")}.
          </span>
        </div>

        {/* Intro message (always shown) */}
        {displayMessages.length === 0 && (
          <div className="flex gap-2">
            <AgentAvatar agent={agent} size={28} />
            <div className="max-w-[82%] rounded-[14px] rounded-tl-sm border border-default-200 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-default-600 dark:border-white/8 dark:bg-white/[0.05] dark:text-white/65">
              Hi — I&apos;m {agent.name}. Before you hire me, I can run on a real task of yours so you can see my work. What would you like me to try?
            </div>
          </div>
        )}

        {/* Messages from real chat */}
        {displayMessages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "you" ? "justify-end" : ""}`}>
            {m.role === "agent" && <AgentAvatar agent={agent} size={28} />}
            <div
              className={`max-w-[82%] rounded-[14px] px-3 py-2.5 text-[13px] leading-relaxed ${
                m.role === "agent"
                  ? "rounded-tl-sm border border-default-200 bg-white text-default-600 dark:border-white/8 dark:bg-white/[0.05] dark:text-white/65"
                  : "rounded-tr-sm whitespace-pre-wrap bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              }`}
            >
              {m.role === "agent" ? <MarkdownRender content={m.text} /> : m.text}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2">
            <AgentAvatar agent={agent} size={28} />
            <div className="flex items-center gap-2 rounded-[14px] rounded-tl-sm border border-default-200 bg-white px-3 py-2.5 dark:border-white/8 dark:bg-white/[0.05]">
              <Spinner size="sm" />
              <span className="text-xs text-default-400 dark:text-white/40">Thinking…</span>
            </div>
          </div>
        )}

        {/* Quick prompts */}
        {!hasSent && (
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="rounded-full border border-default-200 bg-white px-2.5 py-1.5 text-xs font-medium text-default-600 transition-colors hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/60 dark:hover:border-amber-500/25 dark:hover:text-amber-300"
            >
              {q}
            </button>
          ))}
        </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-default-200 bg-white px-3 py-2.5 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-end gap-1.5 rounded-[14px] border border-default-200 bg-default-50 px-2.5 py-2 focus-within:border-amber-300 focus-within:bg-white focus-within:shadow-sm dark:border-white/10 dark:bg-white/5 dark:focus-within:border-amber-500/30">
          <button type="button" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-default-400 hover:bg-default-100 hover:text-default-600 dark:text-white/40 dark:hover:bg-white/10">
            <Icon name="attach_file" variant="round" className="text-lg" />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); }
            }}
            placeholder={`Message ${agent.name}…`}
            rows={1}
            className="max-h-[100px] min-w-0 flex-1 resize-none bg-transparent py-1 text-[13.5px] text-default-800 outline-none placeholder:text-default-400 dark:text-white/85 dark:placeholder:text-white/35"
          />
          <button
            type="button"
            disabled={!draft.trim() || isLoading}
            onClick={() => send(draft)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icon name="arrow_upward" variant="round" className="text-lg" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-default-400 dark:text-white/35">First run is free · Enter to send</p>
      </div>
    </aside>
  );
}
