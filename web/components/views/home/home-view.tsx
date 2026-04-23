"use client";

import { useInbox } from "@/components/agent-chat/panels/inbox-panel";
import { formatRelativeTime } from "@/components/agent-chat/helpers";
import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import { useAuth } from "@/lib/hooks/use-auth";
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
import { useState, useMemo, useCallback, useContext } from "react";

// ── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
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

type Agent = {
  id: string;
  name: string;
  role: string;
  cat: string;
  rating: number;
  reviews: number;
  price: number;
  turnaround: string;
  used: string;
  tools: string[];
  tagline: string;
  hue: number;
  avatar: string;
};

const AGENTS: Agent[] = [
  { id: "a1", name: "Iris", role: "Email triage specialist", cat: "automation", rating: 4.9, reviews: 1247, price: 9, turnaround: "~3 min", used: "4.2k teams", tools: ["Gmail", "Slack", "Notion"], tagline: "Classifies inbox, drafts replies, escalates urgent.", hue: 240, avatar: "https://mockmind-api.uifaces.co/content/human/49.jpg" },
  { id: "a2", name: "Kai", role: "Invoice & AR agent", cat: "automation", rating: 4.8, reviews: 843, price: 19, turnaround: "~12 min", used: "1.8k teams", tools: ["Stripe", "QuickBooks", "Gmail"], tagline: "Chases overdue invoices and reconciles payments.", hue: 30, avatar: "https://mockmind-api.uifaces.co/content/human/103.jpg" },
  { id: "a3", name: "Nova", role: "Brand image generator", cat: "aigc", rating: 4.7, reviews: 2104, price: 15, turnaround: "~2 min", used: "6.1k teams", tools: ["Figma", "S3", "Webflow"], tagline: "On-brand hero images, product shots, social cards.", hue: 310, avatar: "https://mockmind-api.uifaces.co/content/human/68.jpg" },
  { id: "a4", name: "Lyra", role: "Long-form writer", cat: "content", rating: 4.9, reviews: 3281, price: 12, turnaround: "~8 min", used: "9.4k teams", tools: ["Docs", "WordPress", "Ghost"], tagline: "Blog posts, landing copy, technical deep-dives.", hue: 160, avatar: "https://mockmind-api.uifaces.co/content/human/181.jpg" },
  { id: "a5", name: "Ember", role: "Ad campaign manager", cat: "marketing", rating: 4.6, reviews: 612, price: 29, turnaround: "~15 min", used: "740 teams", tools: ["Meta Ads", "GA4", "Sheets"], tagline: "Spins up, tests, and rotates ad creative daily.", hue: 0, avatar: "https://mockmind-api.uifaces.co/content/human/156.jpg" },
  { id: "a6", name: "Atlas", role: "Deep researcher", cat: "research", rating: 4.8, reviews: 987, price: 22, turnaround: "~20 min", used: "1.1k teams", tools: ["Web", "PDF", "Notion"], tagline: "Multi-source briefs with citations and ranking.", hue: 210, avatar: "https://mockmind-api.uifaces.co/content/human/87.jpg" },
  { id: "a7", name: "Orbit", role: "Dashboard builder", cat: "data", rating: 4.7, reviews: 445, price: 18, turnaround: "~10 min", used: "520 teams", tools: ["Snowflake", "Metabase", "GA4"], tagline: "Ships live dashboards from plain-English questions.", hue: 190, avatar: "https://mockmind-api.uifaces.co/content/human/200.jpg" },
  { id: "a8", name: "Reed", role: "Tier-1 support agent", cat: "support", rating: 4.9, reviews: 1892, price: 14, turnaround: "~1 min", used: "3.6k teams", tools: ["Intercom", "Zendesk", "Slack"], tagline: "Answers 80% of tickets; routes the rest.", hue: 130, avatar: "https://mockmind-api.uifaces.co/content/human/134.jpg" },
  { id: "a9", name: "Vale", role: "Outbound SDR", cat: "sales", rating: 4.5, reviews: 318, price: 24, turnaround: "~6 min", used: "410 teams", tools: ["HubSpot", "Apollo", "Gmail"], tagline: "Researches leads and sends personalized first touches.", hue: 290, avatar: "https://mockmind-api.uifaces.co/content/human/42.jpg" },
  { id: "a10", name: "Axon", role: "Full-stack coder", cat: "coding", rating: 4.8, reviews: 2712, price: 25, turnaround: "~18 min", used: "5.2k teams", tools: ["GitHub", "Vercel", "Supabase"], tagline: "Ships features PR-ready, with tests and preview.", hue: 260, avatar: "https://mockmind-api.uifaces.co/content/human/217.jpg" },
  { id: "a11", name: "Mira", role: "UI & brand designer", cat: "design", rating: 4.7, reviews: 604, price: 20, turnaround: "~14 min", used: "680 teams", tools: ["Figma", "Webflow", "S3"], tagline: "Produces on-brand screens, components, and systems.", hue: 340, avatar: "https://mockmind-api.uifaces.co/content/human/29.jpg" },
  { id: "a12", name: "Koa", role: "Short-form video editor", cat: "aigc", rating: 4.6, reviews: 1130, price: 17, turnaround: "~9 min", used: "2.3k teams", tools: ["Descript", "YouTube", "Drive"], tagline: "Cuts raw footage into TikToks, Reels, Shorts.", hue: 50, avatar: "https://mockmind-api.uifaces.co/content/human/192.jpg" },
];

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

function AgentAvatar({ agent, size = 56 }: { agent: Agent; size?: number }) {
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
      <img
        src={agent.avatar}
        alt={agent.name}
        className="h-full w-full rounded-full object-cover"
        loading="lazy"
      />
      <span className="absolute right-0 bottom-0 h-[28%] w-[28%] rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-900" />
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
        className={`relative flex items-center justify-center ${featured ? "aspect-[5/3]" : "aspect-[16/10]"}`}
        style={{
          background: `linear-gradient(135deg, hsl(${h} 60% 94%), hsl(${(h + 40) % 360} 60% 88%))`,
        }}
      >
        <AgentAvatar agent={agent} size={featured ? 72 : 64} />
        {category && (
          <span className="absolute top-2.5 left-2.5 rounded-full border border-default-200/60 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-default-600 backdrop-blur-sm dark:border-white/10 dark:bg-black/40 dark:text-white/70">
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
  onBuildCustom,
}: {
  onSelectTemplate: (prompt: string) => void;
  onBuildCustom: (text?: string) => void;
}) {
  const [cat, setCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(50);
  const [turnaround, setTurnaround] = useState("any");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const visible = useMemo(() => {
    let list = cat === "all" ? AGENTS : AGENTS.filter((a) => a.cat === cat);
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
  }, [cat, maxPrice, turnaround, selectedTools]);

  const featured = AGENTS.slice(0, 3);

  const toggleTool = useCallback((tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  }, []);

  const handleHire = useCallback(
    (agent: Agent) => {
      onSelectTemplate(
        `Hire agent: ${agent.name} — ${agent.role}. ${agent.tagline} (Tools: ${agent.tools.join(", ")})`,
      );
    },
    [onSelectTemplate],
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      onBuildCustom(q);
      setSearchQuery("");
    },
    [searchQuery, onBuildCustom],
  );

  const editorContext = useContext(EditorContext);
  const { session, signOut, subscription, usage } = useAuth();
  const { getTranslations: t } = useTranslations();
  const { messages: inboxMessages, unreadCount, markAllRead, dismiss: dismissInbox } = useInbox();

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#0d0d14]">
      {/* ── Nav bar ── */}
      <div className="shrink-0 flex items-center gap-5 border-b border-default-200 bg-white px-7 py-3 dark:border-white/8 dark:bg-[#0d0d14]">
        {/* Left — logo */}
        <a href="/" className="flex shrink-0 items-center gap-2 no-underline">
          <Image src="/assets/pulse-logo.svg" alt="Palmos" width={24} height={24} />
          <span className="hidden text-base font-bold tracking-wide bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 bg-clip-text text-transparent sm:inline dark:from-amber-500 dark:via-amber-200 dark:to-amber-500">
            PALMOS AI
          </span>
        </a>
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
            className="hidden rounded-lg px-3 py-1.5 text-[13px] font-medium text-default-600 transition-colors hover:bg-default-100 sm:block dark:text-white/60 dark:hover:bg-white/8"
          >
            My hires
          </button>
          <Button
            size="sm"
            className="hidden bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white sm:flex"
            onPress={() => {
              editorContext?.setEditorStates((prev) => ({
                ...prev,
                appMode: AppModeEnum.Agent,
              }));
            }}
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
                12 agents online now
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
              {AGENTS.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  className="relative flex aspect-square items-end overflow-hidden rounded-[14px] shadow-sm"
                >
                  <img
                    src={a.avatar}
                    alt={a.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <span className="relative z-10 p-2 text-[11px] font-semibold leading-tight text-white">
                    {a.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

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

          {/* ── Featured ── */}
          {cat === "all" && (
            <section className="flex flex-col gap-3">
              <SectionHeader
                title="Featured"
                subtitle="top-rated this week"
                action="View all featured →"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((a) => (
                  <AgentCard key={a.id} agent={a} onHire={handleHire} featured />
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
                {AGENTS.slice(0, 6).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleHire(a)}
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
                      cat={{ slug: "all", name: "All agents", icon: "apps", count: AGENTS.length * 100 }}
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
                      <AgentCard key={a.id} agent={a} onHire={handleHire} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Floating bottom CTA ── */}
      <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-30 flex justify-center px-5 pb-4 sm:px-10">
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
            onPress={() => onBuildCustom()}
            startContent={<Icon name="build" variant="round" className="text-sm" />}
          >
            Build Custom
          </Button>
        </div>
      </div>
    </div>
  );
}
