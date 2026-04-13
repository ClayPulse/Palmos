"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { useContext, useState } from "react";

export default function ProjectPicker() {
  const editorContext = useContext(EditorContext);
  const { projects, openProject } = useProjectManager();
  const currentProject = editorContext?.editorStates.project;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover placement="top" isOpen={isOpen} onOpenChange={setIsOpen} offset={8}>
      <Tooltip content="Select project" delay={400} closeDelay={0}>
        <div>
          <PopoverTrigger>
            <button className="flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-50/80 px-2 py-1 text-xs transition-colors hover:bg-amber-100/80 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/20">
              <Icon
                name="folder"
                variant="round"
                className="text-sm text-amber-600 dark:text-amber-400"
              />
              <span className="max-w-[10rem] truncate text-default-800 dark:text-white/85">
                {currentProject || "Project"}
              </span>
            </button>
          </PopoverTrigger>
        </div>
      </Tooltip>
      <PopoverContent className="p-0">
        <div className="w-64 overflow-hidden rounded-lg border border-amber-200/60 bg-white dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <span className="text-[11px] font-medium text-gray-500 dark:text-white/50">
              Select project
            </span>
            <button
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
              onClick={() => {
                editorContext?.updateModalStates({
                  projectSettings: { isOpen: true },
                });
                setIsOpen(false);
              }}
            >
              <Icon name="add" variant="round" className="text-sm" />
              New
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto overflow-x-hidden px-1.5 pb-1.5">
            {!projects || projects.length === 0 ? (
              <div className="py-3 text-center text-xs text-gray-400 dark:text-white/30">
                No projects yet
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {currentProject && (
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                    onClick={() => {
                      openProject("");
                      setIsOpen(false);
                    }}
                  >
                    <Icon
                      name="close"
                      variant="round"
                      className="shrink-0 text-sm text-gray-400 dark:text-white/40"
                    />
                    <span className="text-gray-500 dark:text-white/50">
                      Clear project
                    </span>
                  </button>
                )}
                {projects.map((p) => (
                  <button
                    key={p.id ?? p.name}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      p.name === currentProject
                        ? "bg-amber-100/80 dark:bg-amber-500/15"
                        : "hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                    onClick={() => {
                      openProject(p.name);
                      setIsOpen(false);
                    }}
                  >
                    <Icon
                      name="folder"
                      variant="round"
                      className={`shrink-0 text-sm ${
                        p.name === currentProject
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-gray-400 dark:text-white/40"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-default-700 dark:text-white/80">
                      {p.name}
                    </span>
                    {p.name === currentProject && (
                      <Icon
                        name="check"
                        variant="round"
                        className="shrink-0 text-sm text-amber-500 dark:text-amber-400"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
