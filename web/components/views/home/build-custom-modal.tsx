"use client";

import Icon from "@/components/misc/icon";
import { Button } from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, DetailChatPanel } from "@/components/views/home/home-view";
import { type Agent } from "@/components/views/home/fallback-agents";

// ── Draft shape (mirrors CustomAgent in Prisma, minus the DB/lifecycle fields) ──

type Capability = { icon: string; label: string; desc: string };
type ToolItem = { name: string; icon: string; perm: string; scope: string };
type SkillRef = { appSlug: string; skillName: string; label: string };
type WorkflowRef = { workflowId: string; label: string };

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
  skills: SkillRef[];
  workflows: WorkflowRef[];
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
  const addSkill = () =>
    setDraft((d) => ({
      ...d,
      skills: [...d.skills, { appSlug: "", skillName: "", label: "" }],
    }));
  const updateSkill = (i: number, patch: Partial<SkillRef>) =>
    setDraft((d) => ({
      ...d,
      skills: d.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  const removeSkill = (i: number) =>
    setDraft((d) => ({ ...d, skills: d.skills.filter((_, idx) => idx !== i) }));

  // ── Workflows ────────────────────────────────────────────────────────────
  const addWorkflow = () =>
    setDraft((d) => ({
      ...d,
      workflows: [...d.workflows, { workflowId: "", label: "" }],
    }));
  const updateWorkflow = (i: number, patch: Partial<WorkflowRef>) =>
    setDraft((d) => ({
      ...d,
      workflows: d.workflows.map((w, idx) => (idx === i ? { ...w, ...patch } : w)),
    }));
  const removeWorkflow = (i: number) =>
    setDraft((d) => ({ ...d, workflows: d.workflows.filter((_, idx) => idx !== i) }));

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

            {/* Skills */}
            <section className="border-t border-default-200 py-5 dark:border-white/8">
              <SectionHeading
                title="Skills"
                count={draft.skills.length}
                sub="Pulse App skills — file-based, callable actions bundled with an app package."
                onAdd={addSkill}
                addLabel="Add skill"
              />
              {draft.skills.length === 0 ? (
                <EmptyRow text="No skills attached. Reference a Pulse App skill by its app slug + skill name." />
              ) : (
                <div className="flex flex-col gap-2">
                  {draft.skills.map((s, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-2 rounded-xl border border-default-200 bg-white px-3 py-2 dark:border-white/8 dark:bg-white/[0.03]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                        <Icon name="extension" variant="round" className="text-base" />
                      </div>
                      <InlineText
                        value={s.appSlug}
                        onChange={(v) => updateSkill(i, { appSlug: v })}
                        placeholder="App slug"
                        className="font-mono text-[12.5px] text-default-700 dark:text-white/80"
                      />
                      <InlineText
                        value={s.skillName}
                        onChange={(v) => updateSkill(i, { skillName: v })}
                        placeholder="skill-name"
                        className="font-mono text-[12.5px] text-default-700 dark:text-white/80"
                      />
                      <InlineText
                        value={s.label}
                        onChange={(v) => updateSkill(i, { label: v })}
                        placeholder="Display label"
                        className="text-[12.5px] text-default-600 dark:text-white/70"
                      />
                      <IconButton name="close" onClick={() => removeSkill(i)} title="Remove" />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Workflows */}
            <section className="border-t border-default-200 py-5 dark:border-white/8">
              <SectionHeading
                title="Workflows"
                count={draft.workflows.length}
                sub="DB-stored workflows the agent can invoke. Paste a workflow ID or pick from yours."
                onAdd={addWorkflow}
                addLabel="Attach workflow"
              />
              {draft.workflows.length === 0 ? (
                <EmptyRow text="No workflows attached yet." />
              ) : (
                <div className="flex flex-col gap-2">
                  {draft.workflows.map((w, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 rounded-xl border border-default-200 bg-white px-3 py-2 dark:border-white/8 dark:bg-white/[0.03]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        <Icon name="account_tree" variant="round" className="text-base" />
                      </div>
                      <InlineText
                        value={w.workflowId}
                        onChange={(v) => updateWorkflow(i, { workflowId: v })}
                        placeholder="Workflow ID"
                        className="font-mono text-[12.5px] text-default-700 dark:text-white/80"
                      />
                      <InlineText
                        value={w.label}
                        onChange={(v) => updateWorkflow(i, { label: v })}
                        placeholder="Display label"
                        className="text-[12.5px] text-default-600 dark:text-white/70"
                      />
                      <IconButton name="close" onClick={() => removeWorkflow(i)} title="Remove" />
                    </div>
                  ))}
                </div>
              )}
            </section>

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

        {/* ── Right: live chat preview ── */}
        <DetailChatPanel agent={chatAgent} />
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-default-200 bg-default-50/50 px-4 py-6 text-center text-[13px] text-default-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
      {text}
    </div>
  );
}
