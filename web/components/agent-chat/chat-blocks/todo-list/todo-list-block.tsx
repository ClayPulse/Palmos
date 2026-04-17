"use client";

import Icon from "@/components/misc/icon";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { TodoListProps } from "@/components/agent-chat/types";
import { Spinner } from "@heroui/react";

export function TodoListBlock({ todos }: TodoListProps) {
  const { getTranslations: t } = useTranslations();
  const completed = todos.filter((t) => t.status === "completed").length;
  const progress = todos.length > 0 ? (completed / todos.length) * 100 : 0;

  return (
    <div className="border-t border-amber-200/60 bg-white px-3 py-2 dark:border-white/8 dark:bg-white/3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
          <Icon
            name="electric_bolt"
            className="text-xs text-amber-600 dark:text-amber-300"
          />
          {t("todoList.tasks")}
        </span>
        <span className="text-default-400 dark:text-white/55">
          {completed}/{todos.length}
        </span>
      </div>
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-500 to-orange-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto">
        {todos.map((todo, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            {todo.status === "completed" ? (
              <Icon
                name="check_circle"
                variant="round"
                className="mt-px shrink-0 text-sm text-green-500"
              />
            ) : todo.status === "in_progress" ? (
              <Spinner size="sm" className="mt-px shrink-0" />
            ) : (
              <span className="text-default-300 mt-0.5 shrink-0 dark:text-white/30">
                ○
              </span>
            )}
            <span
              className={
                todo.status === "completed"
                  ? "text-default-400 line-through dark:text-white/40"
                  : "text-default-700 dark:text-white/80"
              }
            >
              {todo.content}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
