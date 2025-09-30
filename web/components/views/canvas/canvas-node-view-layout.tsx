import { isMobile } from "@/lib/platform-api/platform-checker";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { NodeResizer } from "@xyflow/react";
import { useState } from "react";
import CanvasNodeControl from "./canvas-node-control";

export default function CanvasNodeViewLayout({
  height = "100%",
  width = "100%",
  children,
  controlActions = {},
}: {
  height?: string;
  width?: string;
  children: React.ReactNode;
  controlActions?: Record<string, (() => void) | undefined>;
}) {
  const [isShowingMenu, setIsShowingMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isShowingWorkflowConnector, setIsShowingWorkflowConnector] =
    useState(false);

  return (
    <div
      className="relative"
      style={{
        height,
        width,
      }}
    >
      <div className="absolute -top-1.5 z-20 flex w-full justify-center">
        <div
          className="flex pt-1 h-3 w-8 cursor-grab flex-col items-center justify-start active:h-16 active:w-16 active:cursor-grabbing"
          onClick={(e) => {
            e.preventDefault();
            setIsShowingMenu((prev) => !prev);
          }}
        >
          <div className="bg-default-500 h-1 w-8 rounded-full"></div>

          <Popover isOpen={isShowingMenu} onOpenChange={setIsShowingMenu}>
            <PopoverTrigger>
              <div></div>
            </PopoverTrigger>
            <PopoverContent>
              <div className="bg-content1 flex items-center gap-x-1 rounded-md">
                <CanvasNodeControl
                  setIsResizing={setIsResizing}
                  controlActions={controlActions}
                  isShowingWorkflowConnector={isShowingWorkflowConnector}
                  setIsShowingWorkflowConnector={setIsShowingWorkflowConnector}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isShowingWorkflowConnector && (
        <>
          {/* Input Area */}
          <div className="absolute top-0 -left-4 h-10 w-4 bg-red-400"></div>

          {/* Output Area */}
          <div className="absolute top-0 -right-4 h-10 w-4 bg-blue-400"></div>
        </>
      )}

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
