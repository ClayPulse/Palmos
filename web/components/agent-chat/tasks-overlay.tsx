"use client";

import RunningTasksPanel from "@/components/agent-chat/running-tasks-panel";
import type { TasksOverlayProps } from "@/components/agent-chat/types";

export default function TasksOverlay({
  isPage,
  onClose,
}: TasksOverlayProps) {
  if (isPage) {
    return (
      <div className="absolute inset-0 z-30 flex">
        <div className="w-full max-w-sm">
          <RunningTasksPanel onClose={onClose} />
        </div>
        <div
          className="flex-1 bg-black/20 dark:bg-black/40"
          onClick={onClose}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30">
      <RunningTasksPanel onClose={onClose} />
    </div>
  );
}
