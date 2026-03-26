import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";

export default function ForEachEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const color = "#a855f7";

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, stroke: color, strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <span
            style={{
              background: color,
              color: "white",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: "bold",
              userSelect: "none",
            }}
          >
            ∀ forEach
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
