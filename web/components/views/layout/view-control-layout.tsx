import { NodeResizer } from "@xyflow/react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { isMobile } from "@/lib/platform-api/platform-checker";
import AppControl from "./controls/app-control";
import CanvasControl from "./controls/canvas-control";

export default function ViewControlLayout({
  height = "100%",
  width = "100%",
  children,
  type,
  controlActions = {},
}: {
  height?: string;
  width?: string;
  children: React.ReactNode;
  /**
   *  Type of view layout.
   *
   *  - "canvas": for canvas views with resizable and draggable controls
   *
   *  - "app": for app views without canvas controls
   */
  type: "canvas" | "app";
  controlActions?: Record<string, (() => void) | undefined>;
}) {
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isShowingMenu, setIsShowingMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  return (
    <div
      className="relative"
      style={{
        height,
        width,
      }}
    >
      <div className="absolute top-0 z-20 -mt-0.5 flex w-full justify-center">
        <div
          className="flex h-2 w-8 cursor-grab flex-col items-center justify-start active:h-16 active:w-16 active:cursor-grabbing"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsGrabbing(true);
          }}
          onClick={(e) => {
            e.preventDefault();
            setIsShowingMenu((prev) => !prev);
          }}
          data-is-grabbing={isGrabbing}
        >
          <div className="bg-default-500 h-1 w-8 rounded-full"></div>

          <Popover isOpen={isShowingMenu} onOpenChange={setIsShowingMenu}>
            <PopoverTrigger>
              <div></div>
            </PopoverTrigger>
            <PopoverContent>
              <div className="bg-content1 flex items-center gap-x-1 rounded-md">
                {type === "canvas" ? (
                  <CanvasControl
                    setIsResizing={setIsResizing}
                    controlActions={controlActions}
                  />
                ) : (
                  <AppControl />
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {type === "canvas" && (
        <NodeResizer
          minWidth={40}
          minHeight={40}
          onResizeStart={isMobile() ? undefined : () => setIsResizing(true)}
          onResizeEnd={isMobile() ? undefined : () => setIsResizing(false)}
          lineStyle={{
            borderColor: "transparent",
            borderWidth: 6,
          }}
          handleStyle={{
            background: "transparent",
            borderColor: "transparent",
            width: 12,
            height: 12,
            zIndex: 40,
          }}
        />
      )}
      <div className="bg-content1 relative h-full w-full overflow-hidden rounded-lg shadow-md">
        {
          // Add a temporary div overlay to prevent interaction while resizing
          isResizing && (
            <div className="absolute top-0 left-0 z-20 h-full w-full" />
          )
        }
        {children}
      </div>
    </div>
  );
}
