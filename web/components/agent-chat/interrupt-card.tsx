"use client";

import type { InterruptState } from "@/lib/hooks/use-deep-agent";
import Icon from "@/components/misc/icon";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useState } from "react";

/**
 * Renders a HITL (Human-In-The-Loop) interrupt from the agent as an interactive
 * card with option buttons. The question text is parsed for choices — if the
 * agent lists options separated by commas or newlines, they are rendered as
 * clickable buttons. A free-text input is always available as fallback.
 */
export default function InterruptCard({
  interrupt,
  onReply,
  isLoading,
}: {
  interrupt: InterruptState;
  onReply: (reply: string) => void;
  isLoading?: boolean;
}) {
  const { getTranslations: t } = useTranslations();
  const [customInput, setCustomInput] = useState("");
  const [replied, setReplied] = useState(false);

  // Try to extract structured choices from the question
  // The agent is instructed to list choices in the question itself
  const choices = parseChoices(interrupt.question);
  const questionText = choices
    ? interrupt.question.split(/\n/).filter((l) => !l.match(/^\s*[-•*\d.]\s/))[0] || interrupt.question
    : interrupt.question;

  function handleReply(reply: string) {
    setReplied(true);
    onReply(reply);
  }

  if (replied) {
    return null;
  }

  return (
    <div className="my-3 w-full max-w-xl shrink-0 overflow-hidden rounded-xl border border-blue-200/60 bg-white shadow-sm dark:border-blue-500/20 dark:bg-white/5">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-blue-200/40 bg-blue-50/50 px-3.5 py-2 dark:border-blue-500/10 dark:bg-blue-500/5">
        <Icon
          name="help"
          variant="round"
          className="text-base text-blue-600 dark:text-blue-400"
        />
        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
          {t("interruptCard.inputNeeded")}
        </span>
      </div>

      {/* Question */}
      <div className="px-3.5 py-3">
        <p className="text-sm text-default-800 dark:text-white/85">
          {questionText}
        </p>
        {interrupt.context && (
          <p className="mt-1 text-xs text-default-500 dark:text-white/50">
            {interrupt.context}
          </p>
        )}
      </div>

      {/* Choice buttons */}
      {choices && choices.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3.5 pb-3">
          {choices.map((choice) => (
            <button
              key={choice}
              disabled={isLoading}
              onClick={() => handleReply(choice)}
              className="rounded-lg border border-blue-200/60 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {/* Free text input */}
      <div className="flex items-center gap-2 border-t border-blue-200/40 px-3.5 py-2.5 dark:border-blue-500/10">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customInput.trim()) {
              handleReply(customInput.trim());
            }
          }}
          placeholder={t("interruptCard.typeAnswer")}
          disabled={isLoading}
          className="min-w-0 flex-1 rounded-lg border border-default-200 bg-default-50 px-3 py-1.5 text-xs text-default-800 placeholder:text-default-400 focus:border-blue-400 focus:outline-none disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/85 dark:placeholder:text-white/30"
        />
        <button
          onClick={() => customInput.trim() && handleReply(customInput.trim())}
          disabled={isLoading || !customInput.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {t("interruptCard.send")}
        </button>
      </div>
    </div>
  );
}

/**
 * Parse choices from the question text. Looks for lines starting with
 * bullet markers (-, *, •, numbered) or quoted options.
 */
function parseChoices(question: string): string[] | null {
  const lines = question.split("\n").map((l) => l.trim()).filter(Boolean);
  const choices: string[] = [];

  for (const line of lines) {
    // Match: - Option, * Option, • Option, 1. Option, 1) Option
    const match = line.match(/^\s*(?:[-•*]|\d+[.)]\s*)\s*(.+)/);
    if (match) {
      // Clean up quoted choices
      const choice = match[1].replace(/^["']|["']$/g, "").trim();
      if (choice) choices.push(choice);
    }
  }

  return choices.length >= 2 ? choices : null;
}
