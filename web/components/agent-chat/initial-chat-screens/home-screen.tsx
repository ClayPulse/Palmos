"use client";

import { STARTER_PROMPTS, StarterPromptButton } from "@/components/agent-chat/starter-prompts";
import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import type { ProjectInfo } from "@/lib/types";
import { useContext, useState } from "react";

const PROJECTS_PER_PAGE = 4;

interface HomeScreenProps {
  onSend: (text: string) => void;
  projects: ProjectInfo[];
}

export default function HomeScreen({ onSend, projects }: HomeScreenProps) {
  const editorContext = useContext(EditorContext);

  function openProject(name: string) {
    editorContext?.setEditorStates((prev) => ({ ...prev, project: name }));
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Welcome banner */}
      <div className="w-full max-w-xl rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 shadow-sm dark:border-amber-500/15 dark:from-amber-500/5 dark:to-orange-500/5">
        <div className="flex items-start gap-4">
          <div className="animate-pulse-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 p-2 dark:bg-amber-500/15">
            <img src="/assets/pulse-logo.svg" alt="Palmos" className="h-full w-full" />
          </div>
          <div>
            <h2 className="text-default-800 text-base font-semibold dark:text-white/90">
              What would you like to build today?
            </h2>
            <p className="text-default-500 mt-0.5 text-sm dark:text-white/50">
              Describe your idea and I'll help you bring it to life.
            </p>
          </div>
        </div>
      </div>

      {/* Starter prompts */}
      <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {STARTER_PROMPTS.map((prompt) => (
          <StarterPromptButton
            key={prompt.label}
            prompt={prompt}
            onSend={onSend}
          />
        ))}
      </div>

      {/* Projects explorer */}
      {projects.length > 0 && (
        <ProjectExplorer projects={projects} onOpen={openProject} />
      )}
    </div>
  );
}

function ProjectExplorer({
  projects,
  onOpen,
}: {
  projects: ProjectInfo[];
  onOpen: (name: string) => void;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(projects.length / PROJECTS_PER_PAGE);
  const visible = projects.slice(
    page * PROJECTS_PER_PAGE,
    (page + 1) * PROJECTS_PER_PAGE,
  );

  return (
    <div className="w-full max-w-xl">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-default-500 text-xs font-medium tracking-wide uppercase dark:text-white/45">
          My Projects
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-default-400 transition-colors hover:text-default-700 disabled:opacity-30 dark:text-white/40 dark:hover:text-white/70"
            >
              <Icon name="chevron_left" variant="round" className="text-sm" />
            </button>
            <span className="text-[10px] text-default-400 tabular-nums dark:text-white/40">
              {page + 1}/{totalPages}
            </span>
            <button
              disabled={page === totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-default-400 transition-colors hover:text-default-700 disabled:opacity-30 dark:text-white/40 dark:hover:text-white/70"
            >
              <Icon name="chevron_right" variant="round" className="text-sm" />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map((project) => (
          <button
            key={project.id ?? project.name}
            onClick={() => onOpen(project.name)}
            className="flex items-start gap-3 rounded-xl border border-default-200/60 bg-white px-3.5 py-3 text-left transition-all hover:border-amber-300/60 hover:bg-amber-50/50 hover:shadow-sm dark:border-white/8 dark:bg-white/3 dark:hover:border-amber-500/25 dark:hover:bg-amber-500/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/70 dark:bg-amber-500/10">
              <Icon
                name="folder"
                variant="round"
                className="text-base text-amber-700 dark:text-amber-300"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-default-800 dark:text-white/85">
                {project.name}
              </p>
              {project.description && (
                <p className="mt-0.5 truncate text-[11px] text-default-400 dark:text-white/40">
                  {project.description}
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-default-400 dark:text-white/35">
                <span className="flex items-center gap-1">
                  <Icon name="account_tree" variant="round" className="text-[10px]" />
                  {project.workflowCount ?? 0} workflow{(project.workflowCount ?? 0) !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="group" variant="round" className="text-[10px]" />
                  {project.memberCount ?? 1} member{(project.memberCount ?? 1) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
