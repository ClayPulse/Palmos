import { Handle, HandleType, Position } from "@xyflow/react";

export default function NodeHandle({
  id,
  displayName,
  position,
  type,
}: {
  id: string;
  displayName: string;
  position: Position;
  type: HandleType;
}) {
  return (
    <div className="relative h-10 w-fit bg-red-400 z-40 pointer-events-none">
      <Handle
        id={id}
        type={type}
        position={position}
        className="!bg-black pointer-events-auto"
      />
      <p>{displayName}</p>
    </div>
  );
}
