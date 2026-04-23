"use client";

import Icon from "@/components/misc/icon";
import { fetchAPI, getAPIUrl } from "@/lib/pulse-editor-website/backend";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type Template = {
  title: string;
  description: string;
  prompt: string;
  icon: string;
  tools: string[];
};

type Category = {
  id: string;
  label: string;
  icon: string;
  color: string;
  darkColor: string;
  templates: Template[];
};

// ── Gradient helpers ─────────────────────────────────────────────────────────

const GRADIENT_PAIRS = [
  ["from-blue-400 to-indigo-500", "dark:from-blue-600 dark:to-indigo-700"],
  ["from-purple-400 to-pink-500", "dark:from-purple-600 dark:to-pink-700"],
  ["from-amber-400 to-orange-500", "dark:from-amber-600 dark:to-orange-700"],
  ["from-emerald-400 to-teal-500", "dark:from-emerald-600 dark:to-teal-700"],
  ["from-rose-400 to-red-500", "dark:from-rose-600 dark:to-red-700"],
  ["from-cyan-400 to-blue-500", "dark:from-cyan-600 dark:to-blue-700"],
  ["from-violet-400 to-purple-500", "dark:from-violet-600 dark:to-purple-700"],
  ["from-pink-400 to-rose-500", "dark:from-pink-600 dark:to-rose-700"],
  ["from-teal-400 to-cyan-500", "dark:from-teal-600 dark:to-cyan-700"],
  ["from-orange-400 to-amber-500", "dark:from-orange-600 dark:to-amber-700"],
  ["from-indigo-400 to-violet-500", "dark:from-indigo-600 dark:to-violet-700"],
  ["from-lime-400 to-green-500", "dark:from-lime-600 dark:to-green-700"],
];

// Deterministic gradient from title string
function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % GRADIENT_PAIRS.length;
  return `bg-gradient-to-br ${GRADIENT_PAIRS[idx][0]} ${GRADIENT_PAIRS[idx][1]}`;
}

// Varying flex-grow values to create organic widths like ribbi
const FLEX_PATTERNS = [
  [3, 1, 1, 2],
  [1, 2, 1, 3],
  [2, 1, 3, 1],
  [1, 3, 2, 1],
  [2, 2, 1, 2],
  [3, 1, 2, 1],
];

function getFlexGrow(catIndex: number, itemIndex: number): number {
  const pattern = FLEX_PATTERNS[catIndex % FLEX_PATTERNS.length];
  return pattern[itemIndex % pattern.length];
}

// Map tool display names to icon paths under /assets/icons/
// string = same icon for both themes
// { light, dark } = theme-specific icons
const ICON_MAP: Record<string, string | { light: string; dark: string }> = {
  // svgl icons
  "Slack": "svgl/slack.svg",
  "Calendly": "svgl/calendly.svg",
  "Salesforce": "svgl/salesforce.svg",
  "Google Sheets": "svgl/google-sheets.svg",
  "Apollo.io": "svgl/apollo-io.svg",
  "Resend": { light: "svgl/resend-icon-black.svg", dark: "svgl/resend-icon-white.svg" },
  "WordPress": "svgl/wordpress.svg",
  "Notion": "svgl/notion.svg",
  "Ahrefs": "svgl/ahrefs.svg",
  "Facebook Ads": "svgl/facebook-icon.svg",
  "Gmail": "svgl/gmail.svg",
  "Zoom": "svgl/zoom.svg",
  "Linear": "svgl/linear.svg",
  "Twilio": "svgl/twilio.svg",
  "Google Workspace": "svgl/google.svg",
  "GitHub": { light: "svgl/github_light.svg", dark: "svgl/github_dark.svg" },
  "Shopify": "svgl/shopify.svg",
  "Trustpilot": "svgl/trustpilot.svg",
  "Stripe": "svgl/stripe.svg",
  "PayPal": "svgl/paypal.svg",
  "Google Calendar": "svgl/google-calendar.svg",
  "Meta": "svgl/meta.svg",
  // SimpleIcons
  "HubSpot": "simple/hubspot.svg",
  "Mailchimp": "simple/mailchimp.svg",
  "Zendesk": "simple/zendesk.svg",
  "Intercom": "simple/intercom.svg",
  "Airtable": "simple/airtable.svg",
  "PagerDuty": "simple/pagerduty.svg",
  "Buffer": "simple/buffer.svg",
  "QuickBooks": "simple/quickbooks.svg",
  "Deepgram": "simple/deepgram.svg",
  "BambooHR": "simple/bamboohr.svg",
  "Google Ads": "simple/googleads.svg",
  "Google Docs": "simple/googledocs.svg",
};

function getIconUrl(name: string, isDark: boolean): string {
  const entry = ICON_MAP[name];
  if (!entry) return "";
  const path = typeof entry === "string" ? entry : isDark ? entry.dark : entry.light;
  try {
    return getAPIUrl(`/assets/icons/${path}`).toString();
  } catch {
    return "";
  }
}

// Map category IDs to undraw illustration URLs
const PERSONA_IMAGES: Record<string, string> = {
  "sales-crm": "https://cdn.undraw.co/illustration/pitching_y6kw.svg",
  "marketing": "https://cdn.undraw.co/illustration/marketing-analysis_2u5r.svg",
  "customer-support": "https://cdn.undraw.co/illustration/contact-us_s4jn.svg",
  "operations": "https://cdn.undraw.co/illustration/spreadsheets_bh6n.svg",
  "ecommerce": "https://cdn.undraw.co/illustration/online-shopping_po8w.svg",
  "data-analytics": "https://cdn.undraw.co/illustration/predictive-analytics_6gsu.svg",
};

// ── Component ────────────────────────────────────────────────────────────────

export function TemplateLibrary({
  onSend,
  variant = "compact",
}: {
  onSend: (text: string) => void;
  variant?: "compact" | "hero";
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchAPI("/api/workflow/templates")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Category[]) => {
        setCategories(data);
        if (data.length > 0) setActiveCategory(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = categories.find((c) => c.id === activeCategory);

  if (loading) {
    return (
      <div className={`flex ${variant === "hero" ? "w-full" : "w-full max-w-xl"} items-center justify-center py-6`}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
      </div>
    );
  }

  if (categories.length === 0) return null;

  if (variant === "hero") {
    return <HeroTemplateGallery categories={categories} onSend={onSend} />;
  }

  return (
    <div className="w-full max-w-xl">
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
          <Icon
            name="auto_awesome"
            variant="round"
            className="text-sm text-amber-500 dark:text-amber-400"
          />
        </span>
        <h3 className="text-default-700 text-sm font-semibold dark:text-white/70">
          Workflow Templates
        </h3>
      </div>

      {/* Category pills — horizontally scrollable */}
      <div className="scrollbar-hide -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setExpandedTemplate(null);
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "border-amber-400/60 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
                  : "border-default-200/60 bg-white text-default-500 hover:border-amber-300/60 hover:bg-amber-50/50 dark:border-white/8 dark:bg-white/3 dark:text-white/50 dark:hover:border-amber-500/25 dark:hover:bg-white/5"
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                <Icon name={cat.icon} variant="round" className="text-xs" />
              </span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Template cards */}
      {active && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            {active.templates.map((tpl) => {
              const isExpanded = expandedTemplate === tpl.title;
              return (
                <div
                  key={tpl.title}
                  className={`group overflow-hidden rounded-xl border transition-all ${
                    isExpanded
                      ? "border-amber-300/60 bg-white shadow-md dark:border-amber-500/30 dark:bg-white/6"
                      : "border-default-200/60 bg-white hover:border-amber-300/60 hover:shadow-sm dark:border-white/8 dark:bg-white/3 dark:hover:border-amber-500/25"
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-3.5 py-3 text-left"
                    onClick={() =>
                      setExpandedTemplate(isExpanded ? null : tpl.title)
                    }
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ${active.color} ${active.darkColor}`}
                    >
                      <Icon name={tpl.icon} variant="round" className="text-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-default-800 text-sm font-medium leading-snug dark:text-white/90">
                        {tpl.title}
                      </h4>
                      <p className="text-default-500 mt-0.5 line-clamp-2 text-xs leading-relaxed dark:text-white/50">
                        {tpl.description}
                      </p>
                    </div>
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden">
                      <Icon
                        name={isExpanded ? "expand_less" : "expand_more"}
                        variant="round"
                        className="text-lg text-default-400 dark:text-white/30"
                      />
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-default-200/40 px-3.5 pb-3.5 pt-3 dark:border-white/6">
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {tpl.tools.map((tool) => (
                              <span
                                key={tool}
                                className="inline-flex items-center gap-1 rounded-md border border-default-200/60 bg-default-50 px-2 py-0.5 text-[10px] font-medium text-default-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                              >
                                <span className="flex h-3 w-3 shrink-0 items-center justify-center overflow-hidden">
                                  <Icon name="extension" variant="round" className="text-[10px]" />
                                </span>
                                {tool}
                              </span>
                            ))}
                          </div>
                          <div className="mb-3 rounded-lg bg-default-50 p-2.5 dark:bg-white/3">
                            <p className="text-default-500 mb-1 text-[10px] font-semibold uppercase tracking-wider dark:text-white/40">
                              What this will build
                            </p>
                            <p className="text-default-600 line-clamp-4 text-xs leading-relaxed dark:text-white/60">
                              {tpl.prompt}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSend(tpl.prompt)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:shadow-amber-500/20 active:scale-[0.98]"
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                              <Icon name="bolt" variant="round" className="text-base" />
                            </span>
                            Use This Template
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Hero variant — Ribbi-style gallery + Replicate-style collections ────────

function HeroTemplateGallery({
  categories,
  onSend,
}: {
  categories: Category[];
  onSend: (text: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    let cats = activeFilter ? categories.filter((c) => c.id === activeFilter) : categories;
    if (query) {
      cats = cats
        .map((c) => ({
          ...c,
          templates: c.templates.filter(
            (t) =>
              t.title.toLowerCase().includes(query) ||
              t.description.toLowerCase().includes(query) ||
              t.tools.some((tool) => tool.toLowerCase().includes(query)),
          ),
        }))
        .filter((c) => c.templates.length > 0);
    }
    return cats;
  }, [activeFilter, categories, query]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Search bar */}
      <div className="shrink-0 px-4 pt-8 pb-1">
        <div className="relative mx-auto max-w-2xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Icon name="search" variant="round" className="text-xl text-default-400 dark:text-white/40" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows, tools, and automations..."
            className="w-full rounded-full border border-default-200 bg-white py-3 pl-12 pr-4 text-sm text-default-800 placeholder:text-default-400 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/35 dark:focus:border-amber-500/50 dark:focus:ring-amber-500/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-default-400 hover:text-default-600 dark:text-white/40 dark:hover:text-white/60"
            >
              <Icon name="close" variant="round" className="text-lg" />
            </button>
          )}
        </div>
      </div>

      {/* Category filter bar */}
      <div className="flex shrink-0 items-center gap-2 px-4 py-3">
        <div className="scrollbar-hide flex-1 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <div className="flex items-center">
              <button
                onClick={() => setActiveFilter(null)}
                className={`mr-1.5 h-9 rounded-full px-3 text-xs font-extrabold transition-colors whitespace-nowrap sm:px-5 sm:text-sm ${
                  !activeFilter
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                    : "text-default-700 hover:bg-amber-100/50 dark:text-white/70 dark:hover:bg-amber-500/10"
                }`}
              >
                Top Picks
              </button>
              <div className="hidden h-[10.5px] w-[2px] rounded-full bg-black/10 sm:block dark:bg-white/10 mx-2" />
            </div>
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center">
                <button
                  onClick={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
                  className={`mr-1.5 h-9 rounded-full px-3 text-xs font-extrabold transition-colors whitespace-nowrap sm:px-5 sm:text-sm ${
                    activeFilter === cat.id
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                      : "text-default-700 hover:bg-amber-100/50 dark:text-white/70 dark:hover:bg-amber-500/10"
                  }`}
                >
                  {cat.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-14">
        <div className="space-y-8">
          {/* Workflow cards — one section per category */}
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="space-y-3 mb-6">
              <div className="flex items-center gap-3 mb-1">
                {PERSONA_IMAGES[cat.id] && (
                  <img
                    src={PERSONA_IMAGES[cat.id]}
                    alt=""
                    className="h-8 w-8 object-contain"
                    loading="lazy"
                    draggable={false}
                  />
                )}
                <h2 className="text-2xl font-bold text-default-800 dark:text-white">
                  {cat.label}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cat.templates.map((tpl) => (
                  <WorkflowCard key={tpl.title} template={tpl} onSend={onSend} isDark={isDark} />
                ))}
              </div>
            </div>
          ))}

          {/* "I want to..." text-based collections section */}
          <div className="mt-16">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-default-800 dark:text-white">
                I want to...
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <h4 className="mb-2">
                    <button
                      type="button"
                      onClick={() => setActiveFilter(cat.id)}
                      className="text-xl font-bold text-default-800 underline-offset-4 hover:underline dark:text-white"
                    >
                      {cat.label === "Sales & CRM"
                        ? "Automate my sales"
                        : cat.label === "Marketing & Growth"
                          ? "Grow my marketing"
                          : cat.label === "Customer Support"
                            ? "Improve support"
                            : cat.label === "Internal Operations"
                              ? "Streamline operations"
                              : cat.label === "E-commerce"
                                ? "Scale my store"
                                : "Analyze my data"}
                    </button>
                  </h4>
                  <p className="text-default-600 mb-4 text-sm dark:text-white/60">
                    {cat.templates.length} workflow{cat.templates.length !== 1 ? "s" : ""} to get started
                  </p>
                  <ul className="mt-4 mb-1 space-y-1 text-sm">
                    {cat.templates.slice(0, 3).map((tpl) => (
                      <li key={tpl.title} className="mb-1">
                        <button
                          type="button"
                          onClick={() => onSend(tpl.prompt)}
                          className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400 text-left"
                        >
                          {tpl.title}
                        </button>
                      </li>
                    ))}
                    {cat.templates.length > 3 && (
                      <li className="text-default-400 dark:text-white/40">
                        and{" "}
                        <button
                          type="button"
                          onClick={() => setActiveFilter(cat.id)}
                          className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                        >
                          {cat.templates.length - 3} more...
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── n8n-style workflow card ──────────────────────────────────────────────────

function WorkflowCard({
  template,
  onSend,
  isDark,
}: {
  template: Template;
  onSend: (text: string) => void;
  isDark: boolean;
}) {
  const MAX_ICONS = 4;
  const visibleTools = template.tools.slice(0, MAX_ICONS);
  const extraCount = template.tools.length - MAX_ICONS;

  return (
    <button
      type="button"
      onClick={() => onSend(template.prompt)}
      className="group flex min-h-[160px] flex-col justify-between gap-6 rounded-xl border border-default-200 bg-white p-5 text-left transition-all hover:border-amber-300/60 hover:shadow-lg dark:border-white/8 dark:bg-[#1a1a24] dark:hover:border-amber-500/30"
    >
      {/* Title + description */}
      <div>
        <h3 className="text-base font-semibold text-default-800 mb-1.5 line-clamp-2 leading-snug dark:text-white">
          {template.title}
        </h3>
        <p className="text-xs text-default-500 line-clamp-2 leading-relaxed dark:text-white/45">
          {template.description}
        </p>
      </div>

      {/* Bottom row: tool icons */}
      <div className="flex w-full shrink-0 items-center justify-between gap-4">
        <ul className="flex flex-wrap items-center gap-1.5">
          {visibleTools.map((tool) => {
            const iconUrl = getIconUrl(tool, isDark);
            return (
              <li
                key={tool}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-default-100 px-2 dark:bg-white/[0.07]"
              >
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt=""
                    className="h-4 w-4 object-contain"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-default-300 text-[9px] font-bold text-white dark:bg-white/20">
                    {tool.charAt(0)}
                  </span>
                )}
                <span className="text-[11px] font-medium text-default-600 dark:text-white/60">
                  {tool}
                </span>
              </li>
            );
          })}
          {extraCount > 0 && (
            <li className="flex h-8 shrink-0 items-center justify-center rounded-md bg-default-100 px-2.5 dark:bg-white/[0.07]">
              <span className="text-xs font-medium text-default-500 dark:text-white/50">
                +{extraCount}
              </span>
            </li>
          )}
        </ul>
      </div>
    </button>
  );
}
