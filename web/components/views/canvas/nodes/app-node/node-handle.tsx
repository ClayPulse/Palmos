import { TypedVariable } from "@pulse-editor/shared-utils";
import { Handle, HandleType, Position } from "@xyflow/react";

export default function NodeHandle({
  id,
  param,
  position,
  type,
}: {
  id: string;
  param?: TypedVariable;
  position: Position;
  type: HandleType;
}) {
  return (
    <div
      className="relative h-10 w-fit bg-content1 text-content1-foreground z-40 pointer-events-none px-2 flex flex-col justify-center shadow-md data-[direction=left]:rounded-l-lg data-[direction=right]:rounded-r-lg"
      data-direction={position}
    >
      <p>
        {param
          ? `${id} (${param?.type.toString()})`
          : type === "source"
            ? "Compact Output"
            : "Compact Input"}
      </p>
      <Handle
        id={id}
        type={type}
        position={position}
        className="!bg-default !border-default-foreground pointer-events-auto"
        style={{ width: 12, height: 12 }}
      />
    </div>
  );
}
