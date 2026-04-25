"use client";

import Icon from "@/components/misc/icon";
import { addToast, Button } from "@heroui/react";
import JSZip from "jszip";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AgentSkillsSection,
  AgentWorkflowsSection,
  CATEGORIES,
  type AgentSkill,
  type AgentWorkflow,
} from "@/components/views/home/home-view";
import { type Agent } from "@/components/views/home/fallback-agents";

// ── Draft shape (mirrors CustomAgent in Prisma, minus the DB/lifecycle fields) ──

type Capability = { icon: string; label: string; desc: string };
type ToolItem = { name: string; icon: string; perm: string; scope: string };

type Draft = {
  name: string;
  role: string;
  category: string;
  tagline: string;
  about: string;
  systemPrompt: string;
  hue: number;
  avatar: string;
  price: number;
  turnaround: string;
  capabilities: Capability[];
  tools: ToolItem[];
  // Skills + workflows use the same shape as the existing-agent flow.
  // Skills uploaded in draft mode carry their parsed instructions inline
  // (in `description`'s sibling fields not present here — we cache the
  // parsed body in `draftSkillBundles` keyed by externalId so publish can
  // persist them).
  skills: AgentSkill[];
  workflows: AgentWorkflow[];
};

function emptyDraft(seed?: Partial<Draft>): Draft {
  return {
    name: "",
    role: "",
    category: "automation",
    tagline: "",
    about: "",
    systemPrompt: "",
    hue: 30,
    avatar: "",
    price: 10,
    turnaround: "~5 min",
    capabilities: [],
    tools: [],
    skills: [],
    workflows: [],
    ...seed,
  };
}

// Draft → Agent (for feeding into DetailChatPanel, which expects Agent shape)
function draftToAgent(d: Draft): Agent {
  return {
    id: "draft",
    name: d.name || "New agent",
    role: d.role || "Custom specialist",
    cat: d.category,
    rating: 0,
    reviews: 0,
    price: d.price,
    turnaround: d.turnaround,
    used: "new",
    tools: d.tools.map((t) => t.name).filter(Boolean),
    tagline: d.tagline || "What should this agent do?",
    hue: d.hue,
    avatar: d.avatar,
  };
}

// ── Reusable inline controls ───────────────────────────────────────────────

function SectionHeading({
  title,
  count,
  sub,
  onAdd,
  addLabel,
}: {
  title: string;
  count?: number;
  sub?: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-default-800 dark:text-white/90">
          {title}
          {typeof count === "number" && (
            <span className="ml-2 text-xs font-medium text-default-400 dark:text-white/40">
              {count}
            </span>
          )}
        </h2>
        {onAdd && (
          <Button
            size="sm"
            variant="light"
            onPress={onAdd}
            startContent={<Icon name="add" variant="round" className="text-base" />}
          >
            {addLabel ?? "Add"}
          </Button>
        )}
      </div>
      {sub && <p className="mb-3 text-[13px] text-default-400 dark:text-white/45">{sub}</p>}
    </>
  );
}

function InlineText({
  value,
  onChange,
  placeholder,
  className = "",
  multiline = false,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const base =
    "w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none placeholder:text-default-300 hover:border-default-200 focus:border-amber-300 focus:bg-white dark:placeholder:text-white/25 dark:hover:border-white/10 dark:focus:border-amber-500/40 dark:focus:bg-white/[0.04]";
  if (multiline) {
    return (
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${base} ${className}`}
      />
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${base} ${className}`}
    />
  );
}

function IconButton({
  name,
  onClick,
  title,
}: {
  name: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-default-400 hover:bg-default-100 hover:text-default-700 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/80"
    >
      <Icon name={name} variant="round" className="text-base" />
    </button>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

export function BuildCustomModal({
  seedTagline,
  onClose,
  onSaveDraft,
  onPublish,
}: {
  seedTagline?: string;
  onClose: () => void;
  onSaveDraft?: (draft: Draft) => void;
  onPublish?: (draft: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    emptyDraft({ tagline: seedTagline ?? "" }),
  );

  const patch = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.slug === draft.category),
    [draft.category],
  );

  // ── Capabilities ─────────────────────────────────────────────────────────
  const addCapability = () =>
    setDraft((d) => ({
      ...d,
      capabilities: [...d.capabilities, { icon: "bolt", label: "", desc: "" }],
    }));
  const updateCapability = (i: number, patch: Partial<Capability>) =>
    setDraft((d) => ({
      ...d,
      capabilities: d.capabilities.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  const removeCapability = (i: number) =>
    setDraft((d) => ({ ...d, capabilities: d.capabilities.filter((_, idx) => idx !== i) }));

  // ── Tools ────────────────────────────────────────────────────────────────
  const addTool = () =>
    setDraft((d) => ({
      ...d,
      tools: [...d.tools, { name: "", icon: "extension", perm: "Use", scope: "—" }],
    }));
  const updateTool = (i: number, patch: Partial<ToolItem>) =>
    setDraft((d) => ({
      ...d,
      tools: d.tools.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    }));
  const removeTool = (i: number) =>
    setDraft((d) => ({ ...d, tools: d.tools.filter((_, idx) => idx !== i) }));

  // ── Skills ───────────────────────────────────────────────────────────────
  // Draft skills come from two sources:
  //   - Anthropic / ClawHub registry — staged by ref. Publish resolves and
  //     persists each through the registry adapter.
  //   - Upload — parsed client-side. The parsed SKILL.md body is stored
  //     inline on the skill (`instructions`) so publish can persist it
  //     without re-parsing.
  const addSkill = (skill: AgentSkill) => {
    setDraft((d) =>
      d.skills.some(
        (s) => s.source === skill.source && s.externalId === skill.externalId,
      )
        ? d
        : { ...d, skills: [...d.skills, skill] },
    );
  };

  const removeSkill = (skill: AgentSkill) => {
    setDraft((d) => ({
      ...d,
      skills: d.skills.filter(
        (s) =>
          !(s.source === skill.source && s.externalId === skill.externalId),
      ),
    }));
  };

  const uploadSkill = useCallback(async (file: File) => {
    try {
      const parsed = await parseSkillFile(file);
      addSkill({
        source: "upload",
        externalId: `upload-${crypto.randomUUID()}`,
        name: parsed.name,
        description: parsed.description,
        instructions: parsed.instructions,
      });
      addToast({ title: "Skill added", color: "success" });
    } catch (err) {
      addToast({
        title: "Couldn't parse skill",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Workflows ────────────────────────────────────────────────────────────
  const addWorkflow = (w: AgentWorkflow) => {
    setDraft((d) =>
      d.workflows.some((x) => x.id === w.id)
        ? d
        : { ...d, workflows: [...d.workflows, w] },
    );
  };

  const removeWorkflow = (workflowId: string) => {
    setDraft((d) => ({
      ...d,
      workflows: d.workflows.filter((w) => w.id !== workflowId),
    }));
  };

  const initial = (draft.name[0] || "?").toUpperCase();
  const chatAgent = useMemo(() => draftToAgent(draft), [draft]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative grid h-full max-h-[880px] w-full max-w-[1180px] overflow-hidden rounded-[20px] bg-white shadow-2xl sm:grid-cols-[1fr_380px] dark:bg-[#18181b] animate-in slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-default-200 bg-white/80 text-default-500 backdrop-blur-sm transition-colors hover:bg-white hover:text-default-800 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
        >
          <Icon name="close" variant="round" className="text-lg" />
        </button>

        {/* ── Left column ── */}
        <div className="flex min-h-0 flex-col border-r border-default-200 dark:border-white/8">
          {/* Hero */}
          <div
            className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-default-200 px-8 py-7 dark:border-white/8"
            style={{
              background: `linear-gradient(135deg, hsl(${draft.hue} 55% 96%), hsl(${(draft.hue + 30) % 360} 55% 92%) 60%, transparent 100%)`,
            }}
          >
            <div
              className="flex h-[88px] w-[88px] items-center justify-center rounded-full text-3xl font-bold text-white shadow-md"
              style={{
                background: `radial-gradient(circle at 30% 25%, hsl(${draft.hue} 90% 68%), hsl(${(draft.hue + 30) % 360} 75% 40%))`,
              }}
            >
              {initial}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  <Icon name="edit" variant="round" className="text-[12px]" />
                  Draft
                </span>
                <select
                  value={draft.category}
                  onChange={(e) => patch("category", e.target.value)}
                  className="rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xs font-medium text-default-500 outline-none hover:border-default-200 focus:border-amber-300 focus:bg-white dark:text-white/55 dark:hover:border-white/10 dark:focus:border-amber-500/40 dark:focus:bg-white/[0.04]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {category && (
                  <Icon name={category.icon} variant="round" className="text-sm text-default-400 dark:text-white/45" />
                )}
              </div>
              <InlineText
                value={draft.name}
                onChange={(v) => patch("name", v)}
                placeholder="Agent name (e.g. Iris)"
                className="text-[26px] font-bold leading-tight tracking-tight text-default-900 dark:text-white"
              />
              <InlineText
                value={draft.role}
                onChange={(v) => patch("role", v)}
                placeholder="Role / job title"
                className="text-sm font-medium text-default-500 dark:text-white/55"
              />
              <InlineText
                value={draft.tagline}
                onChange={(v) => patch("tagline", v)}
                placeholder="One-line pitch — what does this agent do?"
                className="text-sm leading-relaxed text-default-600 dark:text-white/65"
              />
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium text-default-500 dark:text-white/50">
                <label className="inline-flex items-center gap-2">
                  <Icon name="palette" variant="round" className="text-[14px]" />
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={draft.hue}
                    onChange={(e) => patch("hue", Number(e.target.value))}
                    className="h-1 w-24 cursor-pointer"
                  />
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <Icon name="schedule" variant="round" className="text-[14px]" />
                  <input
                    value={draft.turnaround}
                    onChange={(e) => patch("turnaround", e.target.value)}
                    className="w-16 rounded border border-transparent bg-transparent px-1 outline-none hover:border-default-200 focus:border-amber-300 dark:hover:border-white/10"
                  />
                </label>
                <label className="inline-flex items-center gap-1">
                  From $
                  <input
                    type="number"
                    min={0}
                    value={draft.price}
                    onChange={(e) => patch("price", Number(e.target.value) || 0)}
                    className="w-12 rounded border border-transparent bg-transparent px-1 outline-none hover:border-default-200 focus:border-amber-300 dark:hover:border-white/10"
                  />
                  / run
                </label>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white"
                onPress={() => onPublish?.(draft)}
                isDisabled={!draft.name.trim() || !draft.role.trim()}
                startContent={<Icon name="rocket_launch" variant="round" className="text-lg" />}
              >
                Publish
              </Button>
              <Button
                variant="light"
                size="sm"
                onPress={() => onSaveDraft?.(draft)}
                startContent={<Icon name="save" variant="round" className="text-lg" />}
              >
                Save draft
              </Button>
            </div>
          </div>

          {/* Scrollable editor sections */}
          <div className="flex-1 overflow-y-auto px-8 py-6 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar]:w-2">
            {/* About */}
            <section className="pb-5">
              <SectionHeading
                title={`About ${draft.name || "your agent"}`}
                sub="A longer description shown in the hero area after publish."
              />
              <textarea
                value={draft.about}
                onChange={(e) => patch("about", e.target.value)}
                rows={4}
                placeholder="What does this agent do, in plain English? Where does it shine? Any guardrails?"
                className="w-full resize-none rounded-xl border border-default-200 bg-white p-3 text-sm leading-relaxed text-default-600 outline-none placeholder:text-default-300 focus:border-amber-300 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/65 dark:placeholder:text-white/25 dark:focus:border-amber-500/40"
              />
            </section>

            {/* System prompt */}
            <section className="border-t border-default-200 py-5 dark:border-white/8">
              <SectionHeading
                title="System prompt"
                sub="Instructions the agent always receives. This defines its personality, style, and operating rules."
              />
              <textarea
                value={draft.systemPrompt}
                onChange={(e) => patch("systemPrompt", e.target.value)}
                rows={6}
                placeholder={'You are a concise, action-oriented assistant. Never send emails without approval…'}
                className="w-full resize-none rounded-xl border border-default-200 bg-white p-3 font-mono text-[13px] leading-relaxed text-default-700 outline-none placeholder:text-default-300 focus:border-amber-300 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/70 dark:placeholder:text-white/25 dark:focus:border-amber-500/40"
              />
            </section>

            {/* Capabilities */}
            <section className="border-t border-default-200 py-5 dark:border-white/8">
              <SectionHeading
                title={`What ${draft.name || "your agent"} can do`}
                count={draft.capabilities.length}
                onAdd={addCapability}
                addLabel="Add capability"
              />
              {draft.capabilities.length === 0 ? (
                <EmptyRow text="No capabilities yet. Add a bullet for each thing the agent can do." />
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {draft.capabilities.map((c, i) => (
                    <div
                      key={i}
                      className="flex gap-3 rounded-xl border border-default-200 bg-white p-3 dark:border-white/8 dark:bg-white/[0.03]"
                    >
                      <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                        <Icon name={c.icon || "bolt"} variant="round" className="text-xl" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <InlineText
                            value={c.label}
                            onChange={(v) => updateCapability(i, { label: v })}
                            placeholder="Capability name"
                            className="text-[13.5px] font-semibold text-default-800 dark:text-white/90"
                          />
                          <IconButton name="close" onClick={() => removeCapability(i)} title="Remove" />
                        </div>
                        <InlineText
                          value={c.desc}
                          onChange={(v) => updateCapability(i, { desc: v })}
                          placeholder="Short description"
                          className="text-xs leading-snug text-default-500 dark:text-white/55"
                        />
                        <InlineText
                          value={c.icon}
                          onChange={(v) => updateCapability(i, { icon: v })}
                          placeholder="Material icon (e.g. bolt)"
                          className="mt-1 font-mono text-[11px] text-default-400 dark:text-white/40"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Skills — same component as the existing-agent detail card,
                running in "draft" mode (edits are local until publish). */}
            <AgentSkillsSection
              agent={chatAgent}
              mode="draft"
              skills={draft.skills}
              onAdd={addSkill}
              onRemove={removeSkill}
              onUpload={uploadSkill}
            />

            {/* Workflows — Build new is disabled in draft mode (see comment
                in AgentWorkflowsSection: builds need a persisted agent slug). */}
            <AgentWorkflowsSection
              agent={chatAgent}
              mode="draft"
              workflows={draft.workflows}
              onAttach={addWorkflow}
              onDetach={removeWorkflow}
              onBuildAttached={() => {
                /* unreachable in draft mode */
              }}
            />

            {/* Tools */}
            <section className="border-t border-default-200 py-5 dark:border-white/8">
              <SectionHeading
                title="Tools & integrations"
                count={draft.tools.length}
                sub="Granular, revocable permissions. The agent can only touch what you allow."
                onAdd={addTool}
                addLabel="Add tool"
              />
              {draft.tools.length === 0 ? (
                <EmptyRow text="No tools yet. Add integrations like Gmail, Slack, Notion…" />
              ) : (
                <div className="flex flex-col">
                  {draft.tools.map((t, i, arr) => (
                    <div
                      key={i}
                      className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-3 border border-t-0 border-default-200 bg-white px-3.5 py-3 dark:border-white/8 dark:bg-white/[0.03] ${i === 0 ? "rounded-t-xl border-t" : ""} ${i === arr.length - 1 ? "rounded-b-xl" : ""}`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-default-100 text-default-600 dark:bg-white/8 dark:text-white/60">
                        <Icon name={t.icon || "extension"} variant="round" className="text-base" />
                      </div>
                      <div className="min-w-0">
                        <InlineText
                          value={t.name}
                          onChange={(v) => updateTool(i, { name: v })}
                          placeholder="Tool name (e.g. Gmail)"
                          className="text-[13.5px] font-semibold text-default-800 dark:text-white/90"
                        />
                        <InlineText
                          value={t.icon}
                          onChange={(v) => updateTool(i, { icon: v })}
                          placeholder="Material icon"
                          className="font-mono text-[11px] text-default-400 dark:text-white/40"
                        />
                      </div>
                      <InlineText
                        value={t.scope}
                        onChange={(v) => updateTool(i, { scope: v })}
                        placeholder="Scope (e.g. Last 90 days)"
                        className="text-xs text-default-500 dark:text-white/50"
                      />
                      <InlineText
                        value={t.perm}
                        onChange={(v) => updateTool(i, { perm: v })}
                        placeholder="Permission (e.g. Read + draft)"
                        className="text-center text-[11.5px] font-medium text-emerald-700 dark:text-emerald-400"
                      />
                      <IconButton name="close" onClick={() => removeTool(i)} title="Remove" />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ── Right: chat preview (static — chat goes live after publish) ── */}
        <DraftChatPreview agent={chatAgent} />
      </div>
    </div>
  );
}

function DraftChatPreview({ agent }: { agent: Agent }) {
  return (
    <aside className="flex min-h-0 flex-col bg-default-50 dark:bg-white/[0.02]">
      <div className="flex shrink-0 items-center justify-between border-b border-default-200 bg-white px-4 py-3.5 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: `hsl(${agent.hue} 60% 55%)` }}
          >
            {(agent.name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-default-800 dark:text-white/90">
              {agent.name || "New agent"}
            </div>
            <div className="text-[11.5px] font-medium text-default-400 dark:text-white/45">
              Preview · publish to chat
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50/60 p-3 dark:border-violet-500/15 dark:from-violet-500/5 dark:to-indigo-500/3">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-violet-700 dark:text-violet-400">
            Preview
          </span>
          <span className="text-xs leading-relaxed text-default-600 dark:text-white/60">
            This is how {agent.name || "your agent"}&apos;s chat will look. The
            chat goes live after you publish — they&apos;ll then have their own
            memory, history, and skills.
          </span>
        </div>

        <div className="rounded-xl border border-default-200 bg-white p-3 text-[13px] leading-relaxed text-default-600 dark:border-white/8 dark:bg-white/[0.05] dark:text-white/65">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-default-400 dark:text-white/40">
            Tagline
          </div>
          {agent.tagline || "What should this agent do?"}
        </div>

        {agent.tools.length > 0 && (
          <div className="rounded-xl border border-default-200 bg-white p-3 dark:border-white/8 dark:bg-white/[0.05]">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-default-400 dark:text-white/40">
              Tools
            </div>
            <div className="flex flex-wrap gap-1.5">
              {agent.tools.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-default-200 bg-default-50 px-2 py-0.5 text-[11.5px] font-medium text-default-600 dark:border-white/10 dark:bg-white/5 dark:text-white/65"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-default-200 bg-white px-3 py-2.5 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-end gap-1.5 rounded-[14px] border border-default-200 bg-default-50 px-2.5 py-2 opacity-60 dark:border-white/10 dark:bg-white/5">
          <Icon name="lock" variant="round" className="text-base text-default-400" />
          <input
            disabled
            placeholder="Publish to start chatting"
            className="min-w-0 flex-1 cursor-not-allowed bg-transparent py-1 text-[13.5px] text-default-400 outline-none placeholder:text-default-400 dark:text-white/40 dark:placeholder:text-white/35"
          />
        </div>
      </div>
    </aside>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-default-200 bg-default-50/50 px-4 py-6 text-center text-[13px] text-default-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
      {text}
    </div>
  );
}

// Client-side parse for draft uploads. Mirrors the server's upload route
// (lib/agent/skill-registry/adapters/anthropic + skills/upload route) but
// runs in the browser so the user can stage uploaded skills before the
// custom agent has a stable backend identity.
const SKILL_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

function parseSkillFrontmatter(md: string): {
  name: string;
  description: string;
  body: string;
} {
  const match = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { name: "", description: "", body: md };
  const yaml = match[1];
  const body = match[2];
  const get = (key: string): string => {
    const re = new RegExp(
      `^${key}\\s*:\\s*(?:>|\\|)?\\s*\\n?([\\s\\S]*?)(?=\\n[a-zA-Z_]+\\s*:|$)`,
      "m",
    );
    const m = yaml.match(re);
    if (!m) return "";
    return m[1].trim().replace(/^["']|["']$/g, "");
  };
  return { name: get("name"), description: get("description"), body };
}

async function parseSkillFile(file: File): Promise<{
  name: string;
  description: string;
  instructions: string;
}> {
  if (file.size > SKILL_UPLOAD_MAX_BYTES) {
    throw new Error(`File too large (max ${SKILL_UPLOAD_MAX_BYTES} bytes)`);
  }
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    const text = await file.text();
    const { name, description, body } = parseSkillFrontmatter(text);
    if (!body.trim()) throw new Error("SKILL.md is empty");
    return {
      name: name || file.name.replace(/\.(md|markdown)$/i, ""),
      description,
      instructions: body.trim(),
    };
  }

  if (lower.endsWith(".zip")) {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const entry = Object.values(zip.files).find((f) => {
      if (f.dir) return false;
      const base = f.name.split("/").pop() ?? "";
      return base.toLowerCase() === "skill.md";
    });
    if (!entry) throw new Error("No SKILL.md found in the ZIP");
    const text = await entry.async("string");
    const { name, description, body } = parseSkillFrontmatter(text);
    if (!body.trim()) throw new Error("SKILL.md is empty");
    return {
      name: name || file.name.replace(/\.zip$/i, ""),
      description,
      instructions: body.trim(),
    };
  }

  throw new Error("Unsupported file type — upload a .md or .zip");
}
