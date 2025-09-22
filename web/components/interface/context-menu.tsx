"use client";

import { isMobile } from "@/lib/platform-api/platform-checker";
import { ContextMenuState } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { JSX } from "react";

export default function ContextMenu({
  children,
  state,
  setState,
}: {
  children: JSX.Element;
  state: ContextMenuState;
  setState: (state: ContextMenuState) => void;
}) {
  return (
    <div
      className="absolute"
      style={{
        // Add slight offset for better focus on touch screens
        top: isMobile() ? state.y - 8 : state.y,
        left: isMobile() ? state.x - 8 : state.x,
      }}
    >
      <Popover
        onClose={() => {
          if (process.env.NODE_ENV === "development") {
            console.log("Popover closed");
          }
          setState({ isOpen: false, x: 0, y: 0 });
        }}
        isOpen={state.isOpen}
        placement="bottom-start"
      >
        <PopoverTrigger>
          <div className="h-0 w-0 bg-red-500"></div>
        </PopoverTrigger>
        <PopoverContent className="p-2">{children}</PopoverContent>
      </Popover>
    </div>
  );
}
