import Icon from "@/components/misc/icon";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import {
  NodeResizeControl,
  NodeResizer,
  Position,
  useInternalNode,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { useEffect, useState } from "react";
import NodeHandle from "./node-handle";

export default function CanvasNodeViewLayout({
  viewId,
  height = "100%",
  width = "100%",
  children,
  controlActions = {},
}: {
  viewId: string;
  height?: string;
  width?: string;
  children: React.ReactNode;
  controlActions?: Record<string, (() => void) | undefined>;
}) {
  const updateNodeInternals = useUpdateNodeInternals();
  const node = useInternalNode(viewId);

  const [isShowingMenu, setIsShowingMenu] = useState(false);
  const [isShowingWorkflowConnector, setIsShowingWorkflowConnector] =
    useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Update node internals to ensure handles are positioned correctly
    updateNodeInternals(viewId);
  }, [updateNodeInternals, isShowingWorkflowConnector]);

  useEffect(() => {
    console.log("Node updated:", node);
  }, [node]);

  return (
    <div
      className="relative"
      style={{
        height,
        width,
      }}
    >
      {/* Control */}
      <div className="absolute -top-1.5 z-40 flex w-full justify-center">
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
                  controlActions={controlActions}
                  isShowingWorkflowConnector={isShowingWorkflowConnector}
                  setIsShowingWorkflowConnector={setIsShowingWorkflowConnector}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Input Handles */}
      <>
        <div className="absolute top-0 -translate-x-[100%] h-full pointer-events-none">
          {isShowingWorkflowConnector ? (
            <div className="h-full w-full flex flex-col gap-y-1 relative justify-center">
              <NodeHandle
                id="input-1"
                displayName="input 1"
                position={Position.Left}
                type="target"
              />
              <NodeHandle
                id="input-2"
                displayName="input 2"
                position={Position.Left}
                type="target"
              />
            </div>
          ) : (
            <div className="h-full w-full flex flex-col gap-y-1 relative justify-center">
              <NodeHandle
                id="input-compact"
                displayName="Compact Input"
                position={Position.Left}
                type="target"
              />
            </div>
          )}
        </div>

        {/* Output Handles */}
        <div className="absolute top-0 right-0 translate-x-[100%] h-full pointer-events-none">
          {isShowingWorkflowConnector ? (
            <div className="h-full w-full flex flex-col gap-y-1 relative justify-center">
              <NodeHandle
                id="output-1"
                displayName="output 1"
                position={Position.Right}
                type="source"
              />
              <NodeHandle
                id="output-2"
                displayName="output 2"
                position={Position.Right}
                type="source"
              />
            </div>
          ) : (
            <div className="h-full w-full flex flex-col gap-y-1 relative justify-center">
              <NodeHandle
                id="output-compact"
                displayName="Compact Output"
                position={Position.Right}
                type="source"
              />
            </div>
          )}
        </div>
      </>

      <NodeResizer
        minWidth={40}
        minHeight={40}
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

      <div className="bg-content1 relative h-full w-full rounded-lg shadow-md z-10">
        {node?.selected || node?.dragging ? (
          <div className="absolute top-0 left-0 rounded-lg h-full w-full overflow-hidden selected wrapper gradient z-0" />
        ) : (
          isRunning && (
            <div className="absolute top-0 left-0 rounded-lg h-full w-full overflow-hidden running wrapper gradient z-0" />
          )
        )}

        <div
          className="relative h-full w-full rounded-md overflow-hidden z-10 data-[is-dragging=true]:pointer-events-none data-[is-resizing=true]:pointer-events-none aura"
          data-is-dragging={node?.dragging ? "true" : "false"}
          data-is-resizing={node?.resizing ? "true" : "false"}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function CanvasNodeControl({
  controlActions,
  isShowingWorkflowConnector,
  setIsShowingWorkflowConnector,
}: {
  controlActions: Record<string, (() => void) | undefined>;
  isShowingWorkflowConnector: boolean;
  setIsShowingWorkflowConnector: (showing: boolean) => void;
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

      <Button
        isIconOnly
        variant="light"
        size="sm"
        onPress={() => {
          setIsShowingWorkflowConnector(!isShowingWorkflowConnector);
        }}
        className="data-[active=true]:bg-default data-[active=true]:text-default-foreground"
        data-active={isShowingWorkflowConnector ? "true" : "false"}
      >
        <Icon name="swap_calls" />
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
            // onResizeStart={isMobile() ? undefined : () => setIsResizing(true)}
            // onResizeEnd={isMobile() ? undefined : () => setIsResizing(false)}
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

      <Button
        isIconOnly
        variant="light"
        size="sm"
        onPress={() => {
          const action = controlActions["delete"];
          if (action) action();
        }}
      >
        <Icon name="delete" className="text-danger!" />
      </Button>
    </>
  );
}
