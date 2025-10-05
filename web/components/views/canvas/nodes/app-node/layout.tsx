import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import {
  addToast,
  Button,
  Form,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
} from "@heroui/react";
import { Action } from "@pulse-editor/shared-utils";
import {
  NodeResizeControl,
  NodeResizer,
  Position,
  useInternalNode,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { useContext, useEffect, useState } from "react";
import NodeHandle from "./node-handle";

export default function CanvasNodeViewLayout({
  viewId,
  controlActions = {},
  actions,
  selectedAction,
  setSelectedAction,
  children,
}: {
  viewId: string;
  controlActions?: Record<string, (() => void) | undefined>;
  actions: Action[];
  selectedAction: Action | undefined;
  setSelectedAction: (action: Action | undefined) => void;
  children: React.ReactNode;
}) {
  const editorContext = useContext(EditorContext);

  const updateNodeInternals = useUpdateNodeInternals();
  const node = useInternalNode(viewId);

  const [isShowingMenu, setIsShowingMenu] = useState(false);
  const [isShowingWorkflowConnector, setIsShowingWorkflowConnector] =
    useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Update node internals to ensure handles are positioned correctly
    updateNodeInternals(viewId);
  }, [updateNodeInternals, isShowingWorkflowConnector, selectedAction]);

  useEffect(() => {
    console.log("Node updated:", node);

    const isSelected = node?.selected || node?.dragging;
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      selectedNode: isSelected ? node : undefined,
    }));
  }, [node]);

  return (
    <div className="relative w-full h-full">
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
              <CanvasNodeControl
                actions={actions}
                selectedAction={selectedAction}
                setSelectedAction={setSelectedAction}
                controlActions={controlActions}
                isShowingWorkflowConnector={isShowingWorkflowConnector}
                setIsShowingWorkflowConnector={setIsShowingWorkflowConnector}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Input Handles */}
      {selectedAction && (
        <>
          <div className="absolute top-0 -translate-x-[100%] h-full pointer-events-none">
            {isShowingWorkflowConnector ? (
              <div className="h-full w-full flex flex-col gap-y-1 relative justify-center">
                {Object.entries(selectedAction?.parameters ?? {}).map(
                  ([key, param]) => (
                    <NodeHandle
                      key={key}
                      id={key}
                      param={param}
                      position={Position.Left}
                      type="target"
                    />
                  ),
                )}
              </div>
            ) : (
              Object.keys(selectedAction?.parameters ?? {}).length > 0 && (
                <div className="h-full w-full flex flex-col gap-y-1 relative justify-center">
                  <NodeHandle
                    id="input-compact"
                    position={Position.Left}
                    type="target"
                  />
                </div>
              )
            )}
          </div>

          {/* Output Handles */}
          <div className="absolute top-0 right-0 translate-x-[100%] h-full pointer-events-none">
            {isShowingWorkflowConnector ? (
              <div className="h-full w-full flex flex-col gap-y-1 relative justify-center">
                {Object.entries(selectedAction?.returns ?? {}).map(
                  ([key, param]) => (
                    <NodeHandle
                      key={key}
                      id={key}
                      param={param}
                      position={Position.Right}
                      type="target"
                    />
                  ),
                )}
              </div>
            ) : (
              Object.keys(selectedAction?.returns ?? {}).length > 0 && (
                <div className="h-full w-full flex flex-col gap-y-1 relative justify-center">
                  <NodeHandle
                    id="output-compact"
                    position={Position.Right}
                    type="source"
                  />
                </div>
              )
            )}
          </div>
        </>
      )}

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
  actions,
  selectedAction,
  setSelectedAction,
  controlActions,
  isShowingWorkflowConnector,
  setIsShowingWorkflowConnector,
}: {
  actions: Action[];
  selectedAction: Action | undefined;
  setSelectedAction: (action: Action | undefined) => void;
  controlActions: Record<string, (() => void) | undefined>;
  isShowingWorkflowConnector: boolean;
  setIsShowingWorkflowConnector: (showing: boolean) => void;
}) {
  const [actionError, setActionError] = useState<{ [key: string]: string }>({});

  return (
    <div className="bg-content1 flex items-center gap-x-1 rounded-md">
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

      <Form
        className="flex flex-row items-center gap-x-1"
        validationErrors={actionError}
      >
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={() => {
            if (!selectedAction) {
              addToast({
                title: "No action selected",
                description: "Please select an action to toggle connectors.",
                color: "warning",
              });
              setActionError({ "app-action-select": " " });
            } else {
              setIsShowingWorkflowConnector(!isShowingWorkflowConnector);
            }
          }}
          className="data-[active=true]:bg-default data-[active=true]:text-default-foreground"
          data-active={isShowingWorkflowConnector ? "true" : "false"}
        >
          <Icon name="swap_calls" />
        </Button>

        <Select
          name="app-action-select"
          items={actions}
          className="w-32"
          size="sm"
          classNames={{
            popoverContent: "w-fit",
            mainWrapper: "h-8",
            trigger: "py-0.5 min-h-8",
          }}
          label="Node Action"
          selectedKeys={selectedAction ? [selectedAction.name] : []}
          onSelectionChange={(keys) => {
            const action = actions.find((a) => a.name === Array.from(keys)[0]);
            setSelectedAction(action);
          }}
        >
          {(item) => <SelectItem key={item.name}>{item.name}</SelectItem>}
        </Select>
      </Form>

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
    </div>
  );
}
