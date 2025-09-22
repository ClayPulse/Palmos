import { NodeResizeControl, NodeResizer } from "@xyflow/react";
import { useState } from "react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { isMobile } from "@/lib/platform-api/platform-checker";
import Icon from "../../misc/icon";

function AppControl() {
  return <></>;
}

function CanvasControl({
  controlActions,
  setIsResizing,
}: {
  controlActions: Record<string, (() => void) | undefined>;
  setIsResizing: (resizing: boolean) => void;
}) {
  return (
    <>
      <Button
        isIconOnly
        variant="light"
        size="sm"
        onPress={() => {
          const action = controlActions["fullscreen"];
          if (action) action();
        }}
      >
        <Icon name="fullscreen" />
      </Button>

      <div className="p-3">
        <div className="relative">
          {/* Popover is interfering with the drag area... */}
          <NodeResizeControl
            style={{
              background: "transparent",
              border: "none",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            minWidth={40}
            minHeight={40}
            // Disable resizing events on mobile
            // because apparently it breaks the touch resizing
            onResizeStart={isMobile() ? undefined : () => setIsResizing(true)}
            onResizeEnd={isMobile() ? undefined : () => setIsResizing(false)}
            autoScale={false}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              strokeWidth="2"
              className="stroke-default-foreground"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                right: "50%",
                bottom: "50%",
                transform: "translate(50%, 50%)",
              }}
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <polyline points="16 20 20 20 20 16" />
              <line x1="14" y1="14" x2="20" y2="20" />
              <polyline points="8 4 4 4 4 8" />
              <line x1="4" y1="4" x2="10" y2="10" />
            </svg>
          </NodeResizeControl>
        </div>
      </div>
    </>
  );
}

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
