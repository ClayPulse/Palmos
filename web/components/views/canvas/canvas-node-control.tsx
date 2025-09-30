import Icon from "@/components/misc/icon";
import { isMobile } from "@/lib/platform-api/platform-checker";
import { Button } from "@heroui/react";
import { NodeResizeControl } from "@xyflow/react";

export default function CanvasNodeControl({
  controlActions,
  setIsResizing,
  isShowingWorkflowConnector,
  setIsShowingWorkflowConnector,
}: {
  controlActions: Record<string, (() => void) | undefined>;
  setIsResizing: (resizing: boolean) => void;
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
