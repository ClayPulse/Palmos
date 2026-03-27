import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useEdges,
  useNodes,
  useReactFlow,
} from "@xyflow/react";
import { useContext, useRef, useState } from "react";

export type WorkflowEdgeData = {
  flowType?: "if" | "forEach";
  condition?: boolean;
  /** Per-iteration results: iterationResults[i][nodeId] = that node's output */
  iterationResults?: Array<Record<string, Record<string, any>>>;
  /** Per-iteration inputs: iterationInputsByNode[i][nodeId] = inputArgs passed to that node */
  iterationInputsByNode?: Array<Record<string, Record<string, any>>>;
  /** Index of the iteration currently executing (undefined when not running) */
  activeIteration?: number;
  /** Total number of iterations expected in this run */
  totalExpectedIterations?: number;
};

const EDGE_STYLES: Record<string, { color: string; label: string }> = {
  default: { color: "var(--xy-edge-stroke)", label: "Default" },
  "if-true": { color: "#22c55e", label: "IF ✓" },
  "if-false": { color: "#ef4444", label: "IF ✗" },
  forEach: { color: "#a855f7", label: "∀ forEach" },
};

function getEdgeKey(data: WorkflowEdgeData | undefined): string {
  if (!data?.flowType) return "default";
  if (data.flowType === "if")
    return data.condition === false ? "if-false" : "if-true";
  return "forEach";
}

const FOREACH_COLOR = "#a855f7";
const FRAME_PADDING = 32;

export default function WorkflowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const allNodes = useNodes();
  const allEdges = useEdges();
  const edges = useEdges();
  const selectedEdgeCount = edges.filter((e) => e.selected).length;
  const editorContext = useContext(EditorContext);
  const [visibleIteration, setVisibleIteration] = useState(0);
  const prevIsRunning = useRef(false);

  function navigateIteration(iterIdx: number) {
    setVisibleIteration(iterIdx);
    editorContext?.editorStates.replayForEachIteration?.(id, iterIdx);
  }


  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as WorkflowEdgeData | undefined;
  const key = getEdgeKey(edgeData);
  const { color, label } = EDGE_STYLES[key];
  const isDefaultType = key === "default";
  const isForEach = key === "forEach";
  const iterationResults = edgeData?.iterationResults;
  const iterationInputsByNode = edgeData?.iterationInputsByNode;
  const activeIteration = edgeData?.activeIteration;
  const isRunning = activeIteration !== undefined;
  // While running, follow the live index; afterwards, use the user-controlled index
  const displayedIteration = isRunning ? activeIteration : visibleIteration;
  const totalIterations = isRunning
    ? (edgeData?.totalExpectedIterations ?? 0)
    : (iterationResults?.length ?? 0);

  // When execution finishes, park the user-controlled index at the last iteration
  if (prevIsRunning.current && !isRunning && totalIterations > 0) {
    setVisibleIteration(totalIterations - 1);
  }
  prevIsRunning.current = isRunning;

  // Input to the subworkflow for the current iteration (args passed to the entry node)
  const currentIterationInput =
    !isRunning && totalIterations > 0
      ? iterationInputsByNode?.[displayedIteration]?.[target]
      : undefined;

  // --- Downstream node bounding box for forEach frame ---
  const forEachFrame = (() => {
    if (!isForEach) return null;
    const adj: Record<string, string[]> = {};
    for (const e of allEdges) {
      if (!adj[e.source]) adj[e.source] = [];
      adj[e.source].push(e.target);
    }
    const visited = new Set<string>();
    const queue = [target];
    while (queue.length > 0) {
      const nid = queue.shift()!;
      if (visited.has(nid)) continue;
      visited.add(nid);
      for (const child of adj[nid] ?? []) queue.push(child);
    }
    const scopeNodes = allNodes.filter((n) => visited.has(n.id));
    if (scopeNodes.length === 0) return null;

    let minFx = Infinity, minFy = Infinity, maxFx = -Infinity, maxFy = -Infinity;
    for (const n of scopeNodes) {
      minFx = Math.min(minFx, n.position.x);
      minFy = Math.min(minFy, n.position.y);
      maxFx = Math.max(maxFx, n.position.x + (n.measured?.width ?? n.width ?? 200));
      maxFy = Math.max(maxFy, n.position.y + (n.measured?.height ?? n.height ?? 100));
    }
    return {
      x: minFx - FRAME_PADDING,
      y: minFy - FRAME_PADDING,
      w: maxFx - minFx + FRAME_PADDING * 2,
      h: maxFy - minFy + FRAME_PADDING * 2,
    };
  })();

  // --- Edge update helpers ---
  function setFlowType(
    flowType: "if" | "forEach" | undefined,
    condition?: boolean,
  ) {
    setEdges((edges) =>
      edges.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          selected: false,
          data: { ...(e.data ?? {}), flowType, condition } as WorkflowEdgeData,
        };
      }),
    );
  }

  function deleteEdge() {
    setEdges((edges) => edges.filter((e) => e.id !== id));
  }


  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#60a5fa" : isDefaultType ? undefined : color,
          strokeWidth: selected ? 3 : 2,
          filter: selected ? "drop-shadow(0 0 8px #60a5fa)" : undefined,
        }}
      />

      <EdgeLabelRenderer>
        {/* forEach frame with iteration navigator */}
        {isForEach && forEachFrame && (
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              left: forEachFrame.x,
              top: forEachFrame.y,
              width: forEachFrame.w,
              height: forEachFrame.h,
              border: `2px dashed ${FOREACH_COLOR}55`,
              background: `${FOREACH_COLOR}08`,
              borderRadius: 12,
              pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar: label + iteration navigator */}
            <div
              className="nodrag nopan"
              style={{
                position: "absolute",
                top: -14,
                left: 8,
                pointerEvents: "all",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  background: FOREACH_COLOR,
                  color: "white",
                  fontSize: 11,
                  fontWeight: "bold",
                  padding: "2px 8px",
                  borderRadius: 4,
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                ∀ forEach scope
              </span>

              {/* Iteration navigator widget — card is anchored here so arrow is always centered */}
              {(totalIterations > 0 || isRunning) && (
                <span className="bg-content2 relative inline-flex select-none items-center gap-0.5 whitespace-nowrap rounded px-1 py-0.5">
                  <button
                    className={`border-none bg-transparent px-0.5 text-[13px] leading-none ${!isRunning && displayedIteration > 0 ? "text-foreground cursor-pointer" : "text-default-300 cursor-default"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isRunning && displayedIteration > 0)
                        navigateIteration(displayedIteration - 1);
                    }}
                  >
                    ‹
                  </button>
                  <span className="text-foreground min-w-[40px] text-center text-[11px] font-bold">
                    {displayedIteration + 1} / {totalIterations}
                  </span>
                  <button
                    className={`border-none bg-transparent px-0.5 text-[13px] leading-none ${!isRunning && displayedIteration < totalIterations - 1 ? "text-foreground cursor-pointer" : "text-default-300 cursor-default"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isRunning && displayedIteration < totalIterations - 1)
                        navigateIteration(displayedIteration + 1);
                    }}
                  >
                    ›
                  </button>

                  {/* Input card — centered above the navigator, arrow points down */}
                  {currentIterationInput && (
                    <div
                      className="nodrag nopan absolute"
                      style={{
                        bottom: "calc(100% + 10px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        minWidth: 180,
                        maxWidth: 280,
                        pointerEvents: "all",
                        zIndex: 10,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-content1 border-divider overflow-hidden rounded-xl border shadow-lg">
                        {/* Header */}
                        <div
                          className="flex items-center gap-1.5 px-3 py-2"
                          style={{ background: `${FOREACH_COLOR}18` }}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: FOREACH_COLOR }}
                          />
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: FOREACH_COLOR }}
                          >
                            Iteration {visibleIteration + 1} input
                          </span>
                        </div>
                        {/* Key-value rows */}
                        <div className="divide-divider divide-y">
                          {Object.entries(currentIterationInput).map(([key, val]) => (
                            <div key={key} className="flex items-start gap-2 px-3 py-1.5">
                              <span className="text-default-400 mt-px shrink-0 text-[11px]">
                                {key}
                              </span>
                              <span className="text-foreground line-clamp-3 min-w-0 break-all font-mono text-[11px]">
                                {typeof val === "object"
                                  ? JSON.stringify(val, null, 2)
                                  : String(val ?? "")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Arrow centered on the navigator */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: -8,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 0,
                          height: 0,
                          borderLeft: "7px solid transparent",
                          borderRight: "7px solid transparent",
                          borderTop: `8px solid ${FOREACH_COLOR}55`,
                        }}
                      />
                    </div>
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Type badge — always visible for non-default edges when not selected */}
        {!isDefaultType && !selected && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
            }}
          >
            <span
              style={{ background: color }}
              className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white select-none"
            >
              {label}
            </span>
          </div>
        )}

        {/* Toolbar popup — shown when this is the only selected edge */}
        {selected && selectedEdgeCount === 1 && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <Popover isOpen placement="top">
              <PopoverTrigger>
                <div />
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <div className="bg-content1 w-64 overflow-hidden rounded-lg">
                  {/* Edge type section */}
                  <p className="text-default-400 border-content3 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider">
                    Edge type
                  </p>

                  {[
                    {
                      edgeKey: "default",
                      icon: "remove",
                      iconColor: undefined,
                      label: "Default",
                      description: "Pass data directly to the next node.",
                      onPress: () => setFlowType(undefined),
                    },
                    {
                      edgeKey: "if-true",
                      icon: "check",
                      iconColor: "#22c55e",
                      label: "IF — true branch",
                      description:
                        "Continue only when the source value is truthy.",
                      onPress: () => setFlowType("if", true),
                    },
                    {
                      edgeKey: "if-false",
                      icon: "close",
                      iconColor: "#ef4444",
                      label: "IF — false branch",
                      description:
                        "Continue only when the source value is falsy.",
                      onPress: () => setFlowType("if", false),
                    },
                    {
                      edgeKey: "forEach",
                      icon: "repeat",
                      iconColor: FOREACH_COLOR,
                      label: "∀ forEach",
                      description: "Run the next node once per item in a list.",
                      onPress: () => setFlowType("forEach"),
                    },
                  ].map(({ edgeKey, icon, iconColor, label, description, onPress }) => (
                    <button
                      key={edgeKey}
                      className="hover:bg-content2 data-[active=true]:bg-content2 flex w-full items-center gap-x-3 px-3 py-2 text-left transition-colors"
                      data-active={key === edgeKey ? "true" : "false"}
                      onClick={onPress}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        style={{
                          background: iconColor ? iconColor + "22" : undefined,
                          color: iconColor,
                        }}
                      >
                        <Icon name={icon} className="text-sm!" />
                      </span>
                      <span className="min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {label}
                        </p>
                        <p className="text-default-400 truncate text-xs">
                          {description}
                        </p>
                      </span>
                      {key === edgeKey && (
                        <Icon
                          name="check_circle"
                          className="text-primary ml-auto shrink-0 text-sm!"
                        />
                      )}
                    </button>
                  ))}

                  {/* Delete */}
                  <div className="border-content3 border-t">
                    <button
                      className="hover:bg-danger/10 flex w-full items-center gap-x-3 px-3 py-2 text-left transition-colors"
                      onClick={deleteEdge}
                    >
                      <span className="bg-danger/20 flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                        <Icon name="delete" className="text-danger text-sm!" />
                      </span>
                      <span>
                        <p className="text-danger text-sm font-medium leading-tight">
                          Delete edge
                        </p>
                        <p className="text-default-400 text-xs">
                          Remove this connection.
                        </p>
                      </span>
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
