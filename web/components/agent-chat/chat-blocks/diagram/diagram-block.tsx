"use client";

import Icon from "@/components/misc/icon";
import type { ChatBlockProps } from "@/lib/types";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export function DiagramBlock({ data }: ChatBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  const handleDownload = useCallback(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.diagram?.title || "diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data.diagram?.title]);

  useEffect(() => {
    if (!containerRef.current || !data.diagram?.code) return;
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "strict",
        });
        const { svg } = await mermaid.render(
          `mermaid-${uniqueId.replace(/:/g, "")}`,
          data.diagram!.code,
        );
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.diagram?.code, uniqueId]);

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
      <div className="flex items-center gap-2 border-b border-amber-200/40 bg-amber-50/50 px-3 py-1.5 dark:border-white/6 dark:bg-amber-500/5">
        <Icon
          name="schema"
          variant="round"
          className="text-xs text-amber-600 dark:text-amber-300"
        />
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
          Diagram
        </span>
        <span className="ml-auto truncate text-[9px] text-amber-600/70 dark:text-amber-300/60">
          {data.diagram?.title}
        </span>
        {rendered && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-amber-600 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/10"
          >
            <Icon name="download" variant="round" className="text-xs" />
            SVG
          </button>
        )}
      </div>
      <div className="overflow-auto p-3" ref={containerRef}>
        {error ? (
          <pre className="text-[11px] text-red-500">{error}</pre>
        ) : (
          <p className="text-xs text-gray-400 dark:text-white/40">
            Rendering diagram...
          </p>
        )}
      </div>
    </div>
  );
}
