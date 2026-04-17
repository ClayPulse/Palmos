"use client";

import KnowledgeFiles from "@/components/agent-chat/widgets/input/knowledge-files";
import ShareChatModal from "@/components/modals/share-chat-modal";
import Icon from "@/components/misc/icon";
import MoveToProjectModal from "@/components/misc/move-to-project-modal";
import { useChatContext } from "@/components/providers/chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { useScreenSize } from "@/lib/hooks/use-screen-size";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useContext, useState } from "react";
import { formatRelativeTime } from "@/components/agent-chat/helpers";

export default function ChatSessionSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const editorContext = useContext(EditorContext);
  const { projects, openProject } = useProjectManager();
  const currentProject = editorContext?.editorStates.project;
  const [isProjectListOpen, setIsProjectListOpen] = useState(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);
  const [moveSessionId, setMoveSessionId] = useState<string | null>(null);
  const { isLandscape } = useScreenSize();
  const { getTranslations: t } = useTranslations();

  const {
    sessions,
    activeSessionId,
    currentSessionIdRef,
    handleNewChat,
    handleSwitchSession,
    handleDeleteSession,
  } = useChatContext();

  async function handleMoveSession(projectId: string | null) {
    if (!moveSessionId) return;
    setMoveSessionId(null);
    try {
      await fetchAPI(`/api/chat/sessions/${moveSessionId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
    } catch {
      // silent
    }
  }

  return (
    <>
    <MoveToProjectModal
      isOpen={!!moveSessionId}
      onClose={() => setMoveSessionId(null)}
      onSelect={handleMoveSession}
      title={t("chatSessionSidebar.moveToProjectTitle")}
    />
    <ShareChatModal
      sessionId={shareSessionId}
      isOpen={!!shareSessionId}
      onClose={() => setShareSessionId(null)}
    />
    <AnimatePresence>
      {isOpen && (
        isLandscape ? (
        /* Desktop: inline side panel */
        <motion.div
          className="h-full shrink-0 overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: 280 }}
          exit={{ width: 0 }}
          transition={{ type: "tween", duration: 0.2 }}
        >
          <div className="flex h-full w-[280px] flex-col border-r border-default-200 bg-default-50 dark:border-white/8 dark:bg-[#0d0d14]">
            {/* Project section */}
            <div className="shrink-0 border-b border-default-200 dark:border-white/8">
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-default-500 dark:text-default-500">
                  {t("chatSessionSidebar.project")}
                </h3>
                <div className="flex items-center gap-2">
                  <Tooltip content={t("chatSessionSidebar.knowledgeFiles")} delay={400} closeDelay={0} size="sm">
                    <button
                      onClick={() => setIsKnowledgeOpen(!isKnowledgeOpen)}
                      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                        isKnowledgeOpen
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-default-500 hover:text-amber-600 dark:text-default-500 dark:hover:text-amber-400"
                      }`}
                    >
                      <Icon name="menu_book" variant="round" className="text-sm" />
                    </button>
                  </Tooltip>
                  <Tooltip content={t("chatSessionSidebar.newProject")} delay={400} closeDelay={0} size="sm">
                    <button
                      onClick={() => {
                        editorContext?.updateModalStates({
                          projectSettings: { isOpen: true },
                        });
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded text-default-500 hover:text-amber-600 dark:text-default-500 dark:hover:text-amber-400"
                    >
                      <Icon name="add" variant="round" className="text-sm" />
                    </button>
                  </Tooltip>
                </div>
              </div>
              {isKnowledgeOpen && (
                <div className="px-2 pb-2">
                  <KnowledgeFiles variant="inline" />
                </div>
              )}
              {!isProjectListOpen ? (
                /* Collapsed: show active project or empty placeholder */
                <div className="px-2 pb-2">
                  {currentProject ? (
                    <div
                      className="group flex cursor-pointer items-center gap-2 rounded-lg bg-amber-100/80 px-2.5 py-2 text-left transition-colors dark:bg-amber-500/15"
                      onClick={() => setIsProjectListOpen(true)}
                    >
                      <Icon
                        name="folder"
                        variant="round"
                        className="shrink-0 text-sm text-amber-500 dark:text-amber-400"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-default-700 dark:text-white/80">
                        {currentProject}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-all group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editorContext?.updateModalStates({
                              projectSettings: {
                                isOpen: true,
                                projectInfo: projects?.find(
                                  (p) => p.name === currentProject,
                                ),
                              },
                            });
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-default-500 hover:text-default-600 dark:text-default-500 dark:hover:text-white/60"
                        >
                          <Icon name="settings" variant="round" className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openProject("");
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-default-500 hover:text-red-500 dark:text-default-500 dark:hover:text-red-400"
                        >
                          <Icon name="close" variant="round" className="text-xs" />
                        </button>
                      </div>
                      <Icon
                        name="unfold_more"
                        variant="round"
                        className="shrink-0 text-sm text-default-500 dark:text-default-500"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-default-300 px-2.5 py-2 text-left transition-colors hover:border-amber-400 hover:text-amber-600 dark:border-white/15 dark:hover:border-amber-500/50 dark:hover:text-amber-400"
                      onClick={() => setIsProjectListOpen(true)}
                    >
                      <Icon
                        name="folder_open"
                        variant="round"
                        className="shrink-0 text-sm text-default-500 dark:text-default-500"
                      />
                      <span className="min-w-0 flex-1 text-xs text-default-500 dark:text-default-500">
                        {t("chatSessionSidebar.selectProject")}
                      </span>
                      <Icon
                        name="unfold_more"
                        variant="round"
                        className="shrink-0 text-sm text-default-500 dark:text-default-500"
                      />
                    </div>
                  )}
                </div>
              ) : projects && projects.length > 0 ? (
                /* Expanded: show full project list */
                <div className="scrollbar-transparent flex max-h-40 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
                  {projects.map((p) => (
                    <div
                      key={p.id ?? p.name}
                      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        p.name === currentProject
                          ? "bg-amber-100/80 dark:bg-amber-500/15"
                          : "hover:bg-default-100 dark:hover:bg-white/5"
                      }`}
                      onClick={() => {
                        openProject(p.name);
                        setIsProjectListOpen(false);
                      }}
                    >
                      <Icon
                        name="folder"
                        variant="round"
                        className={`shrink-0 text-sm ${
                          p.name === currentProject
                            ? "text-amber-500 dark:text-amber-400"
                            : "text-default-500 dark:text-default-500"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-default-700 dark:text-white/80">
                        {p.name}
                      </span>
                      {p.role && p.role !== "owner" && (
                        <span className="shrink-0 text-[10px] text-default-500 dark:text-default-500">
                          {p.role}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          editorContext?.updateModalStates({
                            projectSettings: { isOpen: true, projectInfo: p },
                          });
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-default-500 opacity-0 transition-all group-hover:opacity-100 hover:text-default-600 dark:text-default-500 dark:hover:text-white/60"
                      >
                        <Icon name="settings" variant="round" className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-2 pb-3 text-center text-[10px] text-default-500 dark:text-default-500">
                  {t("chatSessionSidebar.noProjects")}
                </p>
              )}
            </div>

            {/* {t("chatSessionSidebar.chatHistory")} Header */}
            <div className="flex shrink-0 items-center justify-between px-3 py-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-default-500 dark:text-default-500">
                {t("chatSessionSidebar.chatHistory")}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    handleNewChat();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:bg-amber-500/15"
                >
                  <Icon name="add" variant="round" className="text-sm" />
                  {t("chatSessionSidebar.new")}
                </button>
              </div>
            </div>

            {/* Session list */}
            <div className="scrollbar-transparent flex-1 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 ? (
                <p className="py-12 text-center text-xs text-default-500 dark:text-default-500">
                  {t("chatSessionSidebar.noChatHistory")}
                </p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        s.id === (activeSessionId ?? currentSessionIdRef.current)
                          ? "bg-amber-100/80 dark:bg-amber-500/15"
                          : "hover:bg-default-100 dark:hover:bg-white/5"
                      }`}
                      onClick={() => handleSwitchSession(s.id)}
                    >
                      <Icon
                        name="chat_bubble_outline"
                        variant="round"
                        className="shrink-0 text-sm text-default-500 dark:text-default-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-default-700 dark:text-white/80">
                          {s.title}
                        </p>
                        <p className="text-[10px] text-default-500 dark:text-default-500">
                          {formatRelativeTime(s.createdAt, t)}
                        </p>
                      </div>
                      <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-default-400 opacity-0 transition-all group-hover:opacity-100 hover:text-default-600 dark:text-white/30 dark:hover:text-white/60"
                          >
                            <Icon name="more_vert" variant="round" className="text-sm" />
                          </button>
                        </DropdownTrigger>
                        <DropdownMenu
                          onAction={(key) => {
                            if (key === "share") setShareSessionId(s.id);
                            if (key === "move") setMoveSessionId(s.id);
                            if (key === "delete") handleDeleteSession(s.id);
                          }}
                        >
                          <DropdownItem
                            key="share"
                            startContent={<Icon name="share" variant="round" className="text-sm" />}
                          >
                            {t("chatSessionSidebar.share")}
                          </DropdownItem>
                          <DropdownItem
                            key="move"
                            startContent={<Icon name="drive_file_move" variant="round" className="text-sm" />}
                          >
                            {t("chatSessionSidebar.moveToProject")}
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            startContent={<Icon name="delete_outline" variant="round" className="text-sm" />}
                          >
                            {t("chatSessionSidebar.delete")}
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
        ) : (
        /* Mobile: full-screen overlay */
        <motion.div
          className="absolute inset-0 z-50 h-full w-full"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "tween", duration: 0.2 }}
        >
          <div className="flex h-full w-full flex-col bg-default-50 dark:bg-[#0d0d14]">
            {/* Close button for mobile */}
            <div className="flex shrink-0 items-center justify-between border-b border-default-200 px-3 py-2 dark:border-white/8">
              <span className="text-xs font-semibold uppercase tracking-wider text-default-500">
                {t("chatSessionSidebar.menu")}
              </span>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-default-500 transition-colors hover:bg-default-100 dark:text-white/60 dark:hover:bg-white/10"
              >
                <Icon name="close" variant="round" className="text-xl" />
              </button>
            </div>
            {/* Reuse same project + chat history sections */}
            {/* Project section */}
            <div className="shrink-0 border-b border-default-200 dark:border-white/8">
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-default-500 dark:text-default-500">
                  {t("chatSessionSidebar.project")}
                </h3>
                <div className="flex items-center gap-2">
                  <Tooltip content={t("chatSessionSidebar.knowledgeFiles")} delay={400} closeDelay={0} size="sm">
                    <button
                      onClick={() => setIsKnowledgeOpen(!isKnowledgeOpen)}
                      className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                        isKnowledgeOpen
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-default-500 hover:text-amber-600 dark:text-default-500 dark:hover:text-amber-400"
                      }`}
                    >
                      <Icon name="menu_book" variant="round" className="text-base" />
                    </button>
                  </Tooltip>
                  <Tooltip content={t("chatSessionSidebar.newProject")} delay={400} closeDelay={0} size="sm">
                    <button
                      onClick={() => {
                        editorContext?.updateModalStates({
                          projectSettings: { isOpen: true },
                        });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded text-default-500 hover:text-amber-600 dark:text-default-500 dark:hover:text-amber-400"
                    >
                      <Icon name="add" variant="round" className="text-base" />
                    </button>
                  </Tooltip>
                </div>
              </div>
              {isKnowledgeOpen && (
                <div className="px-2 pb-2">
                  <KnowledgeFiles variant="inline" />
                </div>
              )}
              {currentProject ? (
                <div className="px-2 pb-2">
                  <div
                    className="flex items-center gap-2 rounded-lg bg-amber-100/80 px-2.5 py-2.5 dark:bg-amber-500/15"
                    onClick={() => {}}
                  >
                    <Icon
                      name="folder"
                      variant="round"
                      className="shrink-0 text-sm text-amber-500 dark:text-amber-400"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-default-700 dark:text-white/80">
                      {currentProject}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="px-2 pb-2">
                  <div
                    className="flex items-center gap-2 rounded-lg border border-dashed border-default-300 px-2.5 py-2.5 dark:border-white/15"
                    onClick={() => {
                      editorContext?.updateModalStates({
                        projectSettings: { isOpen: true },
                      });
                    }}
                  >
                    <Icon
                      name="folder_open"
                      variant="round"
                      className="shrink-0 text-sm text-default-500"
                    />
                    <span className="text-sm text-default-500">{t("chatSessionSidebar.selectProject")}</span>
                  </div>
                </div>
              )}
            </div>
            {/* {t("chatSessionSidebar.chatHistory")} */}
            <div className="flex shrink-0 items-center justify-between px-3 py-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-default-500">
                {t("chatSessionSidebar.chatHistory")}
              </h3>
              <button
                onClick={() => {
                  handleNewChat();
                  onClose();
                }}
                className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 px-2.5 py-1.5 text-sm font-medium text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300"
              >
                <Icon name="add" variant="round" className="text-base" />
                New
              </button>
            </div>
            <div className="scrollbar-transparent flex-1 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 ? (
                <p className="py-12 text-center text-sm text-default-500">
                  {t("chatSessionSidebar.noChatHistory")}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-2 rounded-lg px-3 py-3 text-left transition-colors ${
                        s.id === (activeSessionId ?? currentSessionIdRef.current)
                          ? "bg-amber-100/80 dark:bg-amber-500/15"
                          : "hover:bg-default-100 dark:hover:bg-white/5"
                      }`}
                      onClick={() => {
                        handleSwitchSession(s.id);
                        onClose();
                      }}
                    >
                      <Icon
                        name="chat_bubble_outline"
                        variant="round"
                        className="shrink-0 text-base text-default-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-default-700 dark:text-white/80">
                          {s.title}
                        </p>
                        <p className="text-xs text-default-500">
                          {formatRelativeTime(s.createdAt, t)}
                        </p>
                      </div>
                      <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-default-400 hover:text-default-600 dark:text-white/30 dark:hover:text-white/60"
                          >
                            <Icon name="more_vert" variant="round" className="text-base" />
                          </button>
                        </DropdownTrigger>
                        <DropdownMenu
                          onAction={(key) => {
                            if (key === "share") setShareSessionId(s.id);
                            if (key === "move") setMoveSessionId(s.id);
                            if (key === "delete") handleDeleteSession(s.id);
                          }}
                        >
                          <DropdownItem
                            key="share"
                            startContent={<Icon name="share" variant="round" className="text-sm" />}
                          >
                            {t("chatSessionSidebar.share")}
                          </DropdownItem>
                          <DropdownItem
                            key="move"
                            startContent={<Icon name="drive_file_move" variant="round" className="text-sm" />}
                          >
                            {t("chatSessionSidebar.moveToProject")}
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            startContent={<Icon name="delete_outline" variant="round" className="text-sm" />}
                          >
                            {t("chatSessionSidebar.delete")}
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
        )
      )}
    </AnimatePresence>
    </>
  );
}
