"use client";

import Icon from "@/components/misc/icon";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

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
      <div className={`flex ${variant === "hero" ? "w-full max-w-3xl" : "w-full max-w-xl"} items-center justify-center py-6`}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
      </div>
    );
  }

  if (categories.length === 0) return null;

  if (variant === "hero") {
    return <HeroTemplateGallery categories={categories} active={active} activeCategory={activeCategory} onCategoryChange={(id) => { setActiveCategory(id); }} onSend={onSend} />;
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
                  {/* Card header — always visible */}
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
                      <Icon
                        name={tpl.icon}
                        variant="round"
                        className="text-sm"
                      />
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

                  {/* Expanded detail */}
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
                          {/* Tool chips */}
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {tpl.tools.map((tool) => (
                              <span
                                key={tool}
                                className="inline-flex items-center gap-1 rounded-md border border-default-200/60 bg-default-50 px-2 py-0.5 text-[10px] font-medium text-default-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                              >
                                <span className="flex h-3 w-3 shrink-0 items-center justify-center overflow-hidden">
                                  <Icon
                                    name="extension"
                                    variant="round"
                                    className="text-[10px]"
                                  />
                                </span>
                                {tool}
                              </span>
                            ))}
                          </div>

                          {/* Prompt preview */}
                          <div className="mb-3 rounded-lg bg-default-50 p-2.5 dark:bg-white/3">
                            <p className="text-default-500 mb-1 text-[10px] font-semibold uppercase tracking-wider dark:text-white/40">
                              What this will build
                            </p>
                            <p className="text-default-600 line-clamp-4 text-xs leading-relaxed dark:text-white/60">
                              {tpl.prompt}
                            </p>
                          </div>

                          {/* Use button */}
                          <button
                            type="button"
                            onClick={() => onSend(tpl.prompt)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:shadow-amber-500/20 active:scale-[0.98]"
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                              <Icon
                                name="bolt"
                                variant="round"
                                className="text-base"
                              />
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

// ── Hero variant ─────────────────────────────────────────────────────────────

function HeroTemplateGallery({
  categories,
  active,
  activeCategory,
  onCategoryChange,
  onSend,
}: {
  categories: Category[];
  active: Category | undefined;
  activeCategory: string | null;
  onCategoryChange: (id: string) => void;
  onSend: (text: string) => void;
}) {
  return (
    <div className="w-full max-w-3xl">
      {/* Hero header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/25">
          <img
            src="/assets/pulse-logo.svg"
            alt="Palmos"
            className="h-5 w-5 brightness-0 invert"
          />
        </div>
        <div>
          <h2 className="text-default-900 text-lg font-bold dark:text-white leading-tight">
            Start with a proven workflow
          </h2>
          <p className="text-default-400 text-sm dark:text-white/40">
            Pick a template and get running in seconds
          </p>
        </div>
      </div>

      {/* Category pills */}
      <div className="scrollbar-hide -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "border-amber-400/60 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
                  : "border-default-200/60 bg-white text-default-500 hover:border-amber-300/60 hover:bg-amber-50/50 dark:border-white/8 dark:bg-white/3 dark:text-white/50 dark:hover:border-amber-500/25 dark:hover:bg-white/5"
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                <Icon name={cat.icon} variant="round" className="text-sm" />
              </span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      {active && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {active.templates.map((tpl) => (
              <div
                key={tpl.title}
                className="group flex flex-col overflow-hidden rounded-xl border border-default-200/60 bg-white transition-all hover:border-amber-300/60 hover:shadow-md dark:border-white/8 dark:bg-white/3 dark:hover:border-amber-500/25"
              >
                <div className="flex flex-1 flex-col p-4">
                  {/* Icon + title */}
                  <div className="mb-2 flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active.color} ${active.darkColor}`}
                    >
                      <Icon name={tpl.icon} variant="round" className="text-base" />
                    </div>
                    <h4 className="text-default-800 text-sm font-semibold leading-snug dark:text-white/90 pt-0.5">
                      {tpl.title}
                    </h4>
                  </div>

                  {/* Description */}
                  <p className="text-default-500 mb-3 line-clamp-3 text-xs leading-relaxed dark:text-white/50">
                    {tpl.description}
                  </p>

                  {/* Tool chips */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {tpl.tools.slice(0, 4).map((tool) => (
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
                    {tpl.tools.length > 4 && (
                      <span className="text-[10px] font-medium text-default-400 dark:text-white/30 px-1 py-0.5">
                        +{tpl.tools.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Use button */}
                  <button
                    type="button"
                    onClick={() => onSend(tpl.prompt)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:shadow-amber-500/20 active:scale-[0.98]"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <Icon name="bolt" variant="round" className="text-base" />
                    </span>
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
