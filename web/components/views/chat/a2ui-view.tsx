"use client";

import Icon from "@/components/misc/icon";

const A2UI_URL = "https://a2ui.org";

const FEATURE_BULLETS = [
  { icon: "bolt", text: "AI agents generate rich UIs via the A2UI protocol" },
  { icon: "hub", text: "Connect any LLM or agent to a live interface" },
  { icon: "palette", text: "Component library with rich design primitives" },
  { icon: "chat", text: "Widgets render inline in chat when the agent responds" },
];

export default function A2UIView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto bg-gray-50 px-6 py-10 dark:bg-[#0d0d14]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
        <Icon name="language" variant="round" className="text-2xl text-amber-600 dark:text-amber-300" />
      </div>
      <div className="text-center">
        <h3 className="mb-1 text-sm font-bold text-gray-800 dark:text-white/85">A2UI</h3>
        <p className="max-w-xs text-xs text-gray-500 dark:text-white/50">
          A2UI widgets appear inline in chat when the AI agent generates dynamic UI.
          Ask the agent to create a chart, form, or dashboard to see it in action.
        </p>
      </div>

      <ul className="w-full max-w-xs space-y-2">
        {FEATURE_BULLETS.map(({ icon, text }) => (
          <li key={icon} className="flex items-start gap-2 text-xs text-gray-600 dark:text-white/60">
            <Icon name={icon} variant="round" className="mt-0.5 shrink-0 text-sm text-amber-500/80 dark:text-amber-400/70" />
            {text}
          </li>
        ))}
      </ul>

      <a
        href={A2UI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-xl border border-amber-300/60 bg-white px-4 py-2 text-xs font-semibold text-amber-700 shadow-sm transition-all hover:border-amber-500 hover:bg-amber-50 dark:border-amber-500/35 dark:bg-white/6 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-white/10"
      >
        <Icon name="open_in_new" variant="round" className="text-sm" />
        Learn more about A2UI
      </a>
    </div>
  );
}
