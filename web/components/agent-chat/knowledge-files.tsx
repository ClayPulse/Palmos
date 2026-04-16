"use client";

import Icon from "@/components/misc/icon";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface KnowledgeFile {
  id: string;
  filename: string;
  sizeBytes: number;
  chunkCount: number;
  createdAt: string;
  status?: "uploading" | "processing" | "ready" | "error";
  progress?: number;
  error?: string;
  tempKey?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface KnowledgeFilesProps {
  /** "popover" opens upward as a popup (for chat input). "panel" renders inline dropdown (for side panel). */
  variant?: "popover" | "panel" | "inline";
}

export default function KnowledgeFiles({
  variant = "popover",
}: KnowledgeFilesProps) {
  const { getTranslations: t } = useTranslations();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isOpen, setIsOpen] = useState(variant === "inline");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    if (!backendUrl) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/knowledge/files`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as KnowledgeFile[];
        setFiles(data.map((f) => ({ ...f, status: "ready" })));
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    if (isOpen) fetchFiles();
  }, [isOpen, fetchFiles]);

  function uploadKnowledgeFile(file: File) {
    if (!backendUrl) return;
    const tempKey = `kf-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const placeholder: KnowledgeFile = {
      id: tempKey,
      filename: file.name,
      sizeBytes: file.size,
      chunkCount: 0,
      createdAt: new Date().toISOString(),
      status: "uploading",
      progress: 0,
      tempKey,
    };
    setFiles((prev) => [placeholder, ...prev]);

    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${backendUrl}/api/knowledge/upload`);
    xhr.withCredentials = true;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setFiles((prev) =>
          prev.map((f) =>
            f.tempKey === tempKey ? { ...f, progress: pct } : f,
          ),
        );
      }
    });

    xhr.upload.addEventListener("loadend", () => {
      setFiles((prev) =>
        prev.map((f) =>
          f.tempKey === tempKey
            ? { ...f, status: "processing", progress: 100 }
            : f,
        ),
      );
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          setFiles((prev) =>
            prev.map((f) =>
              f.tempKey === tempKey
                ? { ...f, ...data, status: "ready", progress: 100 }
                : f,
            ),
          );
        } catch {
          setFiles((prev) =>
            prev.map((f) =>
              f.tempKey === tempKey
                ? { ...f, status: "error", error: t("knowledgeFiles.invalidResponse") }
                : f,
            ),
          );
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data?.error) msg = data.error;
        } catch {
          /* ignore */
        }
        setFiles((prev) =>
          prev.map((f) =>
            f.tempKey === tempKey ? { ...f, status: "error", error: msg } : f,
          ),
        );
      }
    });

    xhr.addEventListener("error", () => {
      setFiles((prev) =>
        prev.map((f) =>
          f.tempKey === tempKey
            ? { ...f, status: "error", error: t("knowledgeFiles.networkError") }
            : f,
        ),
      );
    });

    xhr.send(form);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    const fileList = Array.from(selected);
    e.target.value = "";
    for (const file of fileList) {
      uploadKnowledgeFile(file);
    }
  }

  async function handleDelete(file: KnowledgeFile) {
    if (!backendUrl) return;
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    try {
      await fetch(`${backendUrl}/api/knowledge/files/${file.id}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      /* best-effort */
    }
  }

  const readyCount = files.filter(
    (f) => !f.status || f.status === "ready",
  ).length;

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      className="hidden"
      onChange={handleFileSelect}
    />
  );

  const triggerButton = (
    <button
      className="flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-50/80 px-2 py-1 text-xs transition-colors hover:bg-amber-100/80 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/20"
      onClick={variant === "panel" ? () => setIsOpen(!isOpen) : undefined}
    >
      <Icon
        name="menu_book"
        variant="round"
        className="text-sm text-amber-600 dark:text-amber-400"
      />
      <span className="text-default-800 dark:text-white/85">
        {t("knowledgeFiles.knowledge")}{readyCount > 0 ? ` (${readyCount})` : ""}
      </span>
    </button>
  );

  const fileList = (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-500 dark:text-white/50">
          {t("knowledgeFiles.filesIndexed")}
        </span>
        <button
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="add" variant="round" className="text-sm" />
          {t("knowledgeFiles.upload")}
        </button>
      </div>

      {isLoading && files.length === 0 ? (
        <div className="flex items-center justify-center py-3">
          <Spinner size="sm" />
        </div>
      ) : files.length === 0 ? (
        <div className="py-3 text-center text-xs text-gray-400 dark:text-white/30">
          {t("knowledgeFiles.noFiles")}
        </div>
      ) : (
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          {files.map((f) => (
            <div
              key={f.tempKey ?? f.id}
              className={`flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                f.status === "error"
                  ? "bg-red-50/80 dark:bg-red-500/10"
                  : "bg-gray-50/80 dark:bg-white/5"
              }`}
            >
              {f.status === "uploading" ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-amber-200/60 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-[width] duration-200 ease-out dark:bg-amber-400"
                      style={{ width: `${f.progress ?? 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-amber-600 dark:text-amber-400">
                    {f.progress ?? 0}%
                  </span>
                </div>
              ) : f.status === "processing" ? (
                <Spinner size="sm" />
              ) : f.status === "error" ? (
                <Tooltip
                  content={f.error ?? "Upload failed"}
                  delay={200}
                  closeDelay={0}
                >
                  <Icon
                    name="error_outline"
                    variant="round"
                    className="shrink-0 text-sm text-red-500"
                  />
                </Tooltip>
              ) : (
                <Icon
                  name="description"
                  variant="round"
                  className="shrink-0 text-sm text-amber-600 dark:text-amber-400"
                />
              )}
              <span className="flex-1 truncate text-default-800 dark:text-white/85">
                {f.filename}
              </span>
              <span className="shrink-0 text-[10px] text-gray-400 dark:text-white/30">
                {formatFileSize(f.sizeBytes)}
              </span>
              {(f.status === "ready" || f.status === "error" || !f.status) && (
                <button
                  className="shrink-0 text-gray-400 hover:text-gray-700 dark:text-white/30 dark:hover:text-white/70"
                  onClick={() => handleDelete(f)}
                  aria-label="Remove knowledge file"
                >
                  <Icon name="close" variant="round" className="text-xs" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (variant === "popover") {
    return (
      <div>
        {hiddenInput}
        <Popover
          placement="top"
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          offset={8}
        >
          <Tooltip content={t("knowledgeFiles.knowledgeFilesTooltip")} delay={400} closeDelay={0}>
            <div>
              <PopoverTrigger>{triggerButton}</PopoverTrigger>
            </div>
          </Tooltip>
          <PopoverContent className="p-0">
            <div className="w-80 overflow-hidden rounded-lg border border-amber-200/60 bg-white p-3 dark:border-white/10 dark:bg-neutral-900">
              {fileList}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Inline variant — just the file list, no trigger button
  if (variant === "inline") {
    return (
      <div className="rounded-lg border border-amber-200/60 bg-white/80 p-2 dark:border-white/10 dark:bg-white/5">
        {hiddenInput}
        {fileList}
      </div>
    );
  }

  // Panel variant — inline dropdown
  return (
    <div>
      {hiddenInput}
      {triggerButton}
      {isOpen && (
        <div className="mt-1.5 rounded-lg border border-amber-200/60 bg-white/80 p-2 dark:border-white/10 dark:bg-white/5">
          {fileList}
        </div>
      )}
    </div>
  );
}
