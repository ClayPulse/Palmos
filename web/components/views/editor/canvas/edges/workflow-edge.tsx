import Icon from "@/components/misc/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useEdges,
  useReactFlow,
} from "@xyflow/react";

export type WorkflowEdgeData = {
  flowType?: "if" | "forEach";
  condition?: boolean;
};

const EDGE_STYLES: Record<string, { color: string; label: string }> = {
  default: { color: "var(--xy-edge-stroke)", label: "Default" },
  "if-true": { color: "#22c55e", label: "IF ✓" },
  "if-false": { color: "#ef4444", label: "IF ✗" },
  forEach: { color: "#a855f7", label: "∀ forEach" },
};

function getEdgeKey(data: WorkflowEdgeData | undefined): string {
  if (!data?.flowType) return "default";
  if (data.flowType === "if") return data.condition === false ? "if-false" : "if-true";
  return "forEach";
}

export default function WorkflowEdge({
  id,
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
  const edges = useEdges();
  const selectedEdgeCount = edges.filter((e) => e.selected).length;

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

  function setFlowType(flowType: "if" | "forEach" | undefined, condition?: boolean) {
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
        {/* Type badge — always visible for non-default edges */}
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

        {/* Toolbar — shown when this edge is the only selected edge */}
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
                      description: "Continue only when the source value is truthy.",
                      onPress: () => setFlowType("if", true),
                    },
                    {
                      edgeKey: "if-false",
                      icon: "close",
                      iconColor: "#ef4444",
                      label: "IF — false branch",
                      description: "Continue only when the source value is falsy.",
                      onPress: () => setFlowType("if", false),
                    },
                    {
                      edgeKey: "forEach",
                      icon: "repeat",
                      iconColor: "#a855f7",
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
                        <p className="text-sm font-medium leading-tight">{label}</p>
                        <p className="text-default-400 truncate text-xs">{description}</p>
                      </span>
                      {key === edgeKey && (
                        <Icon name="check_circle" className="text-primary ml-auto shrink-0 text-sm!" />
                      )}
                    </button>
                  ))}

                  <div className="border-content3 border-t">
                    <button
                      className="hover:bg-danger/10 flex w-full items-center gap-x-3 px-3 py-2 text-left transition-colors"
                      onClick={deleteEdge}
                    >
                      <span className="bg-danger/20 flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                        <Icon name="delete" className="text-danger text-sm!" />
                      </span>
                      <span>
                        <p className="text-danger text-sm font-medium leading-tight">Delete edge</p>
                        <p className="text-default-400 text-xs">Remove this connection.</p>
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
