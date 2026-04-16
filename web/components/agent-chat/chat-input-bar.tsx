"use client";

import Icon from "@/components/misc/icon";
import KnowledgeFiles from "@/components/agent-chat/knowledge-files";
import ProjectPicker from "@/components/agent-chat/project-picker";
import { useTranslations } from "@/lib/hooks/use-translations";
import { Spinner, Tooltip } from "@heroui/react";
import type React from "react";
import { useRef, useState } from "react";

import type { ChatInputBarProps, ChatUpload } from "@/components/agent-chat/types";

export type { ChatUpload } from "@/components/agent-chat/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatInputBar({
  variant,
  inputText,
  setInputText,
  isLoading,
  uploads,
  uploadsInProgress,
  pendingSend,
  onSend,
  onStop,
  onUploadFiles,
  onRemoveUpload,
  onIndexUpload,
  footerExtra,
}: ChatInputBarProps) {
  const { getTranslations: t } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const isPage = variant === "page";

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    e.target.value = "";
    onUploadFiles(selected);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (isLoading) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onUploadFiles(files);
  }

  const btnSize = isPage ? "h-9 w-9" : "h-8 w-8";
  const inputRounding = isPage ? "rounded-xl" : "rounded-lg";
  const dropIconSize = isPage ? "text-3xl" : "text-2xl";
  const dropTextSize = isPage ? "text-sm" : "text-xs";
  const dropRounding = isPage ? "rounded-xl" : "rounded-lg";
  const placeholder = isPage ? t("chatInputBar.askAnything") : t("chatInputBar.askShort");
  const pyTextarea = isPage ? "py-3" : "py-2.5";

  const attachmentChips =
    uploads.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {uploads.map((u) => {
          const chip = (
            <div
              className={`relative overflow-hidden rounded-md border text-xs ${
                u.status === "error"
                  ? "border-red-300/60 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10"
                  : "border-amber-300/60 bg-amber-50/80 dark:border-white/15 dark:bg-white/8"
              }`}
            >
              <div className="relative flex items-center gap-1.5 px-2 py-1">
                {u.status === "uploading" ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-amber-200/60 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-[width] duration-200 ease-out dark:bg-amber-400"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium tabular-nums text-amber-600 dark:text-amber-400">
                      {u.progress}%
                    </span>
                  </div>
                ) : u.status === "processing" ? (
                  <Spinner size="sm" />
                ) : u.status === "error" ? (
                  <Icon
                    name="error_outline"
                    variant="round"
                    className="text-sm text-red-500"
                  />
                ) : (
                  <Icon
                    name="description"
                    variant="round"
                    className="text-sm text-amber-600 dark:text-amber-400"
                  />
                )}
                <span className="text-default-800 max-w-[12rem] truncate dark:text-white/85">
                  {u.filename}
                </span>
                {u.status === "ready" && !u.indexed && !u.indexing && (
                  <Tooltip content={t("chatInputBar.saveToKnowledge")} delay={300} closeDelay={0}>
                    <button
                      className="text-gray-400 hover:text-amber-600 dark:text-white/40 dark:hover:text-amber-400"
                      onClick={() => onIndexUpload(u)}
                      aria-label={t("chatInputBar.saveToKnowledge")}
                    >
                      <Icon name="cloud_upload" variant="round" className="text-xs" />
                    </button>
                  </Tooltip>
                )}
                {u.indexing && <Spinner size="sm" />}
                {u.indexed && (
                  <Tooltip content={t("chatInputBar.savedToKnowledge")} delay={300} closeDelay={0}>
                    <Icon
                      name="check_circle"
                      variant="round"
                      className="text-xs text-green-500 dark:text-green-400"
                    />
                  </Tooltip>
                )}
                <button
                  className="text-gray-400 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/80"
                  onClick={() => onRemoveUpload(u)}
                  aria-label="Remove attachment"
                >
                  <Icon name="close" variant="round" className="text-xs" />
                </button>
              </div>
            </div>
          );

          if (u.status === "error") {
            return (
              <Tooltip
                key={u.tempKey}
                content={
                  <div className="max-w-xs px-1 py-0.5 text-xs">
                    <p className="mb-0.5 font-semibold text-red-500">
                      {t("chatInputBar.uploadFailed")}
                    </p>
                    <p className="text-default-700 break-words dark:text-white/80">
                      {u.error ?? "Unknown error"}
                    </p>
                  </div>
                }
                delay={200}
                closeDelay={0}
                placement="top"
              >
                {chip}
              </Tooltip>
            );
          }

          return (
            <Tooltip
              key={u.tempKey}
              content={`${u.filename} (${formatFileSize(u.sizeBytes)})`}
              delay={400}
              closeDelay={0}
              placement="top"
            >
              {chip}
            </Tooltip>
          );
        })}
      </div>
    ) : null;

  return (
    <div
      className={`relative flex flex-col gap-2 border-t border-amber-200/60 bg-white dark:border-white/8 dark:bg-white/3 ${
        isPage
          ? "px-4 pt-3 pb-4 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))]"
          : "px-3 pt-3 pb-2"
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${dropRounding} border-2 border-dashed border-amber-500 bg-amber-50/80 dark:border-amber-400 dark:bg-amber-900/30`}>
          <div className="flex flex-col items-center gap-1 text-amber-600 dark:text-amber-400">
            <Icon name="upload_file" variant="round" className={dropIconSize} />
            <span className={`${dropTextSize} font-medium`}>{t("chatInputBar.dropFiles")}</span>
          </div>
        </div>
      )}
      {attachmentChips}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className={isPage
        ? "flex items-center gap-2 rounded-xl border border-amber-300/60 bg-gray-50 px-3 shadow-sm transition-shadow focus-within:border-amber-500 focus-within:shadow-[0_0_14px_rgba(245,158,11,0.18)] dark:border-white/15 dark:bg-white/8 dark:focus-within:border-amber-400/70 dark:focus-within:shadow-[0_0_14px_rgba(251,191,36,0.22)]"
        : "flex items-end gap-2 rounded-lg border border-amber-300/60 bg-gray-50 px-2 shadow-sm transition-shadow focus-within:border-amber-500 focus-within:shadow-[0_0_12px_rgba(245,158,11,0.15)] dark:border-white/15 dark:bg-white/8 dark:focus-within:border-amber-400/70 dark:focus-within:shadow-[0_0_12px_rgba(251,191,36,0.2)]"
      }>
        <Tooltip content={t("chatInputBar.attachFile")} delay={400} closeDelay={0}>
          <button
            className={`flex ${btnSize} shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-amber-600 disabled:opacity-30 dark:text-white/40 dark:hover:text-amber-400`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label={t("chatInputBar.attachFile")}
          >
            <Icon name="attach_file" variant="round" className="text-base" />
          </button>
        </Tooltip>
        <textarea
          className={`text-default-900 placeholder-default-500 max-h-40 flex-1 resize-none bg-transparent ${pyTextarea} text-sm leading-5 outline-none dark:text-white dark:placeholder-white/45`}
          style={{ height: "auto" }}
          placeholder={placeholder}
          value={inputText}
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }
          }}
          onChange={(e) => {
            setInputText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length > 0) {
              e.preventDefault();
              onUploadFiles(files);
            }
          }}
          disabled={isLoading}
          autoFocus={isPage}
          rows={1}
        />
        {inputText && !isLoading && (
          <button
            className={`flex ${btnSize} shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60`}
            onClick={() => setInputText("")}
          >
            <Icon name="close" variant="round" className="text-base" />
          </button>
        )}
        {isLoading && isPage ? (
          <button
            className={`flex ${btnSize} shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 transition-all dark:bg-amber-400/20 dark:text-amber-300`}
            onClick={onStop}
          >
            <Icon name="stop" variant="round" className="text-base" />
          </button>
        ) : (
          <button
            className={`flex ${btnSize} shrink-0 items-center justify-center rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white transition-all disabled:opacity-30 ${
              inputText.trim() && !isLoading && !uploadsInProgress ? "animate-pulse-send-glow" : ""
            }`}
            onClick={onSend}
            disabled={!inputText.trim() || (!isPage && isLoading)}
          >
            {uploadsInProgress && pendingSend ? (
              <Spinner size="sm" classNames={{ wrapper: "h-4 w-4" }} />
            ) : (
              <Icon name="arrow_upward" variant="round" className="text-base" />
            )}
          </button>
        )}
      </div>
      <div className={`flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] ${isPage ? "mt-2" : ""}`}>
        <ProjectPicker />
        <KnowledgeFiles />
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {footerExtra}
        </div>
      </div>
    </div>
  );
}
