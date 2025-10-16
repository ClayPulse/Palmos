import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import BaseAppView from "@/components/views/base/base-app-view";
import { DragEventTypeEnum } from "@/lib/enums";
import { AppDragData, AppViewConfig, ExtensionApp } from "@/lib/types";
import {
  addToast,
  Button,
  Form,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Tooltip,
} from "@heroui/react";
import { Action } from "@pulse-editor/shared-utils";
import {
  NodeResizeControl,
  NodeResizer,
  Position,
  useInternalNode,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import clsx from "clsx";
import { useContext, useEffect, useState } from "react";
import { v4 } from "uuid";
import NodeHandle from "./node-handle";

export default function CanvasNodeViewLayout({
  viewId,
  controlActions = {},
  actions,
  selectedAction,
  isRunning,
  isShowingWorkflowConnector,
  children,
}: {
  viewId: string;
  controlActions?: Record<string, (() => void) | undefined>;
  actions: Action[];
  selectedAction: Action | undefined;
  isRunning: boolean;
  isShowingWorkflowConnector: boolean;
  children: React.ReactNode;
}) {
  const editorContext = useContext(EditorContext);

  const updateNodeInternals = useUpdateNodeInternals();
  const node = useInternalNode(viewId);

  const { updateNodeData } = useReactFlow();

  const [isShowingMenu, setIsShowingMenu] = useState(false);
  const [possessedAppConfigs, setPossessedAppConfigs] = useState<{
    [key: string]: AppViewConfig;
  }>({});

  useEffect(() => {
    // Update node internals to ensure handles are positioned correctly
    updateNodeInternals(viewId);
  }, [updateNodeInternals, isShowingWorkflowConnector, selectedAction]);

  async function setSelectedAction(action: Action | undefined) {
    await updateNodeData(viewId, { selectedAction: action });
  }

  async function setIsShowingWorkflowConnector(showing: boolean) {
    await updateNodeData(viewId, { isShowingWorkflowConnector: showing });
  }

  return (
    <div
      className="relative w-full h-full"
      onDragOver={(e) => {
        e.stopPropagation();
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
            {isShowingWorkflowConnector && (
              <div className="h-full w-full flex flex-col gap-y-1 relative justify-center items-end">
                {Object.entries(selectedAction?.parameters ?? {}).map(
                  ([paramName, param]) => (
                    <div
                      key={paramName}
                      onDragOver={(e) => {
                        e.stopPropagation();
                        if (param.type !== "app-instance") {
                          return;
                        }
                        const types = e.dataTransfer.types;
                        if (
                          types.includes(
                            `application/${DragEventTypeEnum.App.toLowerCase()}`,
                          )
                        ) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "link";
                        }
                      }}
                      onDrop={async (e) => {
                        const dataText = e.dataTransfer.getData(
                          `application/${DragEventTypeEnum.App.toLowerCase()}`,
                        );
                        if (!dataText) {
                          return;
                        }
                        console.log("Dropped item:", dataText);
                        try {
                          const data = JSON.parse(dataText) as AppDragData;
                          e.stopPropagation();
                          e.preventDefault();

                          const app: ExtensionApp = data.app;
                          const config: AppViewConfig = {
                            app: app.config.id,
                            viewId: `${app.config.id}-${v4()}`,
                            recommendedHeight: app.config.recommendedHeight,
                            recommendedWidth: app.config.recommendedWidth,
                          };

                          setPossessedAppConfigs((prev) => ({
                            ...prev,
                            [paramName]: config,
                          }));
                        } catch (error) {
                          addToast({
                            title: "Failed to link app",
                            description: "The dropped app data is invalid.",
                            color: "danger",
                          });
                        }
                      }}
                      className="pointer-events-auto"
                    >
                      {param.type === "app-instance" ? (
                        <Button
                          className="h-fit rounded-r-none data-[exist-app=true]:border-2 data-[exist-app=true]:border-success data-[exist-app=true]:bg-success/30"
                          onPress={() => {
                            editorContext?.setEditorStates((prev) => ({
                              ...prev,
                              isSideMenuOpen: true,
                            }));
                          }}
                          data-exist-app={
                            possessedAppConfigs[paramName] ? "true" : "false"
                          }
                        >
                          <div className="text-center py-2">
                            <p>{paramName}</p>
                            <p>(app-instance)</p>
                            {possessedAppConfigs[paramName] ? (
                              <p>{possessedAppConfigs[paramName].viewId}</p>
                            ) : (
                              <p>Tip: drag app here</p>
                            )}
                          </div>
                        </Button>
                      ) : (
                        <NodeHandle
                          id={paramName}
                          param={param}
                          position={Position.Left}
                          type="target"
                        />
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Output Handles */}
          <div className="absolute top-0 right-0 translate-x-[100%] h-full pointer-events-none">
            {isShowingWorkflowConnector && (
              <div className="h-full w-full flex flex-col gap-y-1 relative justify-center">
                {Object.entries(selectedAction?.returns ?? {}).map(
                  ([key, param]) => (
                    <NodeHandle
                      key={key}
                      id={key}
                      param={param}
                      position={Position.Right}
                      type="source"
                    />
                  ),
                )}
              </div>
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
        {isRunning ? (
          <div className="absolute top-0 left-0 rounded-lg h-full w-full overflow-hidden running wrapper gradient z-0" />
        ) : (
          (node?.selected || node?.dragging) && (
            <div className="absolute top-0 left-0 rounded-lg h-full w-full overflow-hidden selected wrapper gradient z-0" />
          )
        )}

        <div
          className={clsx(
            "relative h-full w-full rounded-md overflow-hidden z-10 data-[is-dragging=true]:pointer-events-none data-[is-resizing=true]:pointer-events-none",
            (node?.selected || node?.dragging) && !isRunning && "aura",
          )}
          data-is-dragging={node?.dragging ? "true" : "false"}
          data-is-resizing={node?.resizing ? "true" : "false"}
        >
          {children}
        </div>

        <div
          className="flex-col gap-y-2 py-4 px-2 bg-content2 text-content2-foreground mx-2 rounded-b-lg hidden data-[visible=true]:flex"
          data-visible={
            Object.keys(possessedAppConfigs).length > 0 &&
            isShowingWorkflowConnector
          }
        >
          <p className="text-center font-semibold text-lg">Owned Apps</p>
          {Object.entries(possessedAppConfigs).map(([key, config]) => (
            <div key={config.viewId}>
              <p className="text-center">{key}</p>
              <div className="bg-content3 relative h-full w-full overflow-hidden rounded-lg shadow-md">
                <BaseAppView config={config} viewId={config.viewId} />
              </div>
            </div>
          ))}
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
  setSelectedAction: (action: Action | undefined) => Promise<void>;
  controlActions: Record<string, (() => void) | undefined>;
  isShowingWorkflowConnector: boolean;
  setIsShowingWorkflowConnector: (showing: boolean) => Promise<void>;
}) {
  const [actionError, setActionError] = useState<{ [key: string]: string }>({});

  return (
    <div className="bg-content1 flex items-center gap-x-1 rounded-md">
      <Tooltip content="Open node in fullscreen tab." placement="top">
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
      </Tooltip>

      <Form
        className="flex flex-row items-center gap-x-1"
        validationErrors={actionError}
      >
        <Tooltip content="Toggle workflow connectors" placement="top">
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
        </Tooltip>

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
            if (action) {
              setIsShowingWorkflowConnector(true);
            } else {
              setIsShowingWorkflowConnector(false);
            }
          }}
        >
          {(item) => <SelectItem key={item.name}>{item.name}</SelectItem>}
        </Select>
      </Form>

      <Tooltip content="Resize node" placement="top">
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
      </Tooltip>

      <Tooltip content="Delete node" placement="top">
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
      </Tooltip>
    </div>
  );
}
