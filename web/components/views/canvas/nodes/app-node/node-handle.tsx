import { TypedVariable } from "@pulse-editor/shared-utils";
import { Handle, HandleType, Position } from "@xyflow/react";
import { useTranslations } from "next-intl";

export default function NodeHandle({
  id,
  param,
  position,
  type,
  isOptional,
}: {
  id: string;
  param: TypedVariable;
  position: Position;
  type: HandleType;
  isOptional?: boolean;
}) {
  const t = useTranslations();
  
  return (
    <div
      className="bg-content2 text-content2-foreground pointer-events-none relative z-40 flex h-fit w-fit flex-col justify-center px-2 py-1 shadow-md data-[direction=left]:rounded-l-lg data-[direction=right]:rounded-r-lg"
      data-direction={position}
      aria-label={t("nodeHandle.ariaLabel")}
    >
      <div className="text-center text-sm">
        <p>{id}</p>
        <p>({param?.type.toString()})</p>
        {isOptional !== undefined && !isOptional && <p className="text-danger">{t("nodeHandle.required")}</p>}
      </div>
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
