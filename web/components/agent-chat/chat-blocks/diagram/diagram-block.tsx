"use client";

import Icon from "@/components/misc/icon";
import type { ChatBlockData } from "@/lib/types";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export function DiagramBlock({
  data,
}: {
  data: Extract<ChatBlockData, { type: "diagram" }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [diagramType, setDiagramType] = useState<string | null>(null);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !rendered) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setTransform((t) => {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = t.scale * factor;
        return { ...t, scale: newScale };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [rendered]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!rendered) return;
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transform.x,
        ty: transform.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [rendered, transform.x, transform.y],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!isPanning) return;
      setTransform((t) => ({
        ...t,
        x: panStart.current.tx + (e.clientX - panStart.current.x),
        y: panStart.current.ty + (e.clientY - panStart.current.y),
      }));
    },
    [isPanning],
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleResetView = useCallback(() => {
    const viewport = viewportRef.current;
    const svgEl = containerRef.current?.querySelector("svg");
    if (viewport && svgEl) {
      const vw = viewport.clientWidth - 24;
      const vh = viewport.clientHeight - 24;
      const sw = svgEl.getBoundingClientRect().width / transform.scale;
      const sh = svgEl.getBoundingClientRect().height / transform.scale;
      if (sw > 0 && sh > 0 && vw > 0 && vh > 0) {
        const fitScale = Math.max(0.1, Math.min(vw / sw, vh / sh));
        setTransform({ x: 0, y: 0, scale: fitScale });
        return;
      }
    }
    setTransform({ x: 0, y: 0, scale: 1 });
  }, [transform.scale]);

  const handleDownload = useCallback(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.title || "diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data.title]);

  useEffect(() => {
    const diagramCode = data.code;

    if (!containerRef.current || !diagramCode) return;
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          look: "handDrawn",
          securityLevel: "strict",
          flowchart: {
            padding: 16,
            nodeSpacing: 30,
            rankSpacing: 50,
            wrappingWidth: 200,
          },
        });

        const { svg } = await mermaid.render(
          `mermaid-${uniqueId.replace(/:/g, "")}`,
          diagramCode,
        );
        if (!cancelled && containerRef.current) {
          // Detect diagram type from first line
          const firstLine = diagramCode
            .trim()
            .split("\n")[0]
            .trim()
            .toLowerCase();
          const typeMap: Record<string, string> = {
            flowchart: "Flowchart",
            graph: "Flowchart",
            sequencediagram: "Sequence Diagram",
            classdiagram: "Class Diagram",
            "statediagram-v2": "State Diagram",
            statediagram: "State Diagram",
            erdiagram: "ER Diagram",
            journey: "User Journey",
            gantt: "Gantt",
            pie: "Pie Chart",
            quadrantchart: "Quadrant Chart",
            requirementdiagram: "Requirement Diagram",
            gitgraph: "Git Graph",
            c4context: "C4 Diagram",
            mindmap: "Mindmap",
            timeline: "Timeline",
            zenuml: "ZenUML",
            "sankey-beta": "Sankey",
            "xychart-beta": "XY Chart",
            "block-beta": "Block Diagram",
            "packet-beta": "Packet",
            kanban: "Kanban",
            "architecture-beta": "Architecture",
            "radar-beta": "Radar",
            "treemap-beta": "Treemap",
            "venn-beta": "Venn",
            "ishikawa-v2": "Ishikawa",
            "treeview-beta": "Tree View",
          };
          const detectedKey = Object.keys(typeMap).find((k) =>
            firstLine.startsWith(k),
          );
          setDiagramType(detectedKey ? typeMap[detectedKey] : null);

          containerRef.current.innerHTML = svg;

          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("height");
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
          }
          setRendered(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to render diagram",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.code, uniqueId]);

  return (
    <div>
      <div className="my-2 overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
        <div className="flex items-center gap-2 border-b border-amber-200/40 bg-amber-50/50 px-3 py-1.5 dark:border-white/6 dark:bg-amber-500/5">
          <Icon
            name="schema"
            variant="round"
            className="text-xs text-amber-600 dark:text-amber-300"
          />
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            {diagramType ?? "Diagram"}
          </span>
          <span className="ml-auto truncate text-[9px] text-amber-600/70 dark:text-amber-300/60">
            {data.title}
          </span>
          {rendered && (
            <>
              <button
                onClick={handleResetView}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-amber-600 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/10"
                title="Reset zoom"
              >
                <Icon
                  name="center_focus_strong"
                  variant="round"
                  className="text-xs"
                />
                {Math.round(transform.scale * 100)}%
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-amber-600 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                <Icon name="download" variant="round" className="text-xs" />
                SVG
              </button>
            </>
          )}
        </div>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          ref={viewportRef}
          className="relative overflow-hidden bg-white p-3 text-black dark:text-black"
          style={{
            cursor: isPanning ? "grabbing" : rendered ? "grab" : "default",
            height: 400,
            minWidth: 300,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {error ? (
            <pre className="text-[11px] text-red-500">{error}</pre>
          ) : !rendered ? (
            <p className="text-xs text-gray-400 dark:text-white/40">
              Rendering diagram...
            </p>
          ) : null}
          <div
            ref={containerRef}
            style={{
              display: rendered && !error ? "block" : "none",
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "center center",
              transition: isPanning ? "none" : "transform 0.1s ease-out",
            }}
          />
        </div>
      </div>
    </div>
  );
}
