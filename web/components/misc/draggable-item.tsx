"use client";

import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";
import { useTranslations } from "@/lib/hooks/use-translations";
import React, { forwardRef } from "react";

interface DraggableProps {
  listeners?: DraggableSyntheticListeners;
  transform?: Transform | null;
  children?: React.ReactNode;
  className?: string;
}

export const DraggableItem = forwardRef<HTMLDivElement, DraggableProps>(
  function Draggable({ listeners, transform, className, children }, ref) {
    const {getTranslations: t} = useTranslations();
    
    return (
      <div
        className={className}
        style={
          {
            "--translate-x": `${transform?.x ?? 0}px`,
            "--translate-y": `${transform?.y ?? 0}px`,
          } as React.CSSProperties
        }
      >
        <div aria-label={t("draggableItem.ariaLabel")} {...listeners} ref={ref}>
          {children}
        </div>
      </div>
    );
  },
);
