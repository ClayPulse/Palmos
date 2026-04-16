"use client";

import InterruptCard from "@/components/agent-chat/cards/interrupt-card";
import InlineWidget from "@/components/agent-chat/widgets/inline-widget";
import { TodoList } from "@/components/agent-chat/widgets/todo-list";
import { WorkflowTaskCard } from "@/components/agent-chat/cards/workflow-task-card";
import type { ChatMessageAreaProps } from "@/components/agent-chat/types";
import { useTranslations } from "@/lib/hooks/use-translations";
import { Spinner } from "@heroui/react";
import { motion } from "framer-motion";
import type React from "react";

export default function ChatMessageArea({
  variant,
  isLoadingSession,
  isEmptyConversation,
  emptyState,
  messageList,
  workflowTasks,
  onTerminateTask,
  terminatingTaskIds,
  activeInterrupt,
  resume,
  isLoading,
  error,
  todos,
  latestWorkflow,
  scrollContainerRef,
}: ChatMessageAreaProps) {
  const { getTranslations: t } = useTranslations();
  const isPage = variant === "page";

  const loadingIndicator = isLoading && (
    <div className="py-2">
      <div className="relative overflow-hidden rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 shadow-sm dark:border-amber-500/15 dark:from-amber-500/5 dark:via-orange-500/8 dark:to-amber-500/5">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent dark:via-amber-400/10"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex items-center justify-center gap-2.5 py-2.5">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
              />
            ))}
          </div>
          <motion.p
            className="text-xs font-medium text-amber-600/80 dark:text-amber-300/70"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {t("chatMessageArea.thinking")}
          </motion.p>
        </div>
      </div>
    </div>
  );

  const sessionLoadingIndicator = (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
      <Spinner size="lg" />
      <motion.p
        className="text-sm font-medium text-amber-600/80 dark:text-amber-300/70"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {t("chatMessageArea.loadingConversation")}
      </motion.p>
    </div>
  );

  const errorBanner = !!error && (
    <div className="rounded-lg border border-red-300/40 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
      {error instanceof Error ? error.message : t("chatMessageArea.errorOccurred")}
    </div>
  );

  const messageContent = isLoadingSession ? (
    sessionLoadingIndicator
  ) : (
    <>
      {isEmptyConversation && emptyState}
      {messageList}
      {workflowTasks.map((task) => (
        <WorkflowTaskCard
          key={task.taskId}
          task={task}
          onTerminate={onTerminateTask}
          isTerminating={terminatingTaskIds?.has(task.taskId)}
        />
      ))}
      {activeInterrupt && (
        <InterruptCard interrupt={activeInterrupt} onReply={resume} isLoading={isLoading} />
      )}
      {loadingIndicator}
      {errorBanner}
    </>
  );

  return (
    <>
      {/* Scrollable message area */}
      <div
        ref={scrollContainerRef}
        className={
          isPage
            ? "flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))]"
            : "flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
        }
      >
        {messageContent}
        {isPage && <div className="h-2" />}
      </div>

      {/* Todos */}
      {!isLoadingSession && todos.length > 0 && (
        isPage ? (
          <div className="border-t border-amber-200/40 px-4 py-2 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))] dark:border-white/8">
            <TodoList todos={todos} />
          </div>
        ) : (
          <TodoList todos={todos} />
        )
      )}

      {/* Workflow card */}
      {!isLoadingSession && latestWorkflow && (
        <div className={isPage ? "px-4 py-2 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))]" : "px-3 py-2"}>
          <InlineWidget data={latestWorkflow} />
        </div>
      )}
    </>
  );
}
