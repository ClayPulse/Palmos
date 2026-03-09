import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import BaseAppView from "@/components/views/base/base-app-view";
import { useAppInfo } from "@/lib/hooks/use-app-info";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useVibeCode } from "@/lib/hooks/use-vibe-code";
import { AppNodeData, EditorContextType } from "@/lib/types";
import { useDroppable } from "@dnd-kit/core";
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
import { Action, TypedVariable } from "@pulse-editor/shared-utils";
import {
  NodeResizer,
  Position,
  Node as ReactFlowNode,
  useInternalNode,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import clsx from "clsx";
import { useContext, useEffect, useState } from "react";
import NodeHandle from "./node-handle";

export default function CanvasNodeViewLayout({
  viewId,
  controlActions = {},
  actions,
  selectedAction,
  isRunning,
  isShowingWorkflowConnector,
  isFullScreen,
  children,
}: {
  viewId: string;
  controlActions?: Record<string, (() => void) | undefined>;
  actions: Action[];
  selectedAction: Action | undefined;
  isRunning: boolean;
  isShowingWorkflowConnector: boolean;
  isFullScreen: boolean;
  children: React.ReactNode;
}) {
  const editorContext = useContext(EditorContext);

  const updateNodeInternals = useUpdateNodeInternals();
  const node = useInternalNode<ReactFlowNode<AppNodeData>>(viewId);

  const { updateNodeData } = useReactFlow();

  const [isShowingMenu, setIsShowingMenu] = useState(false);
  const [isShowingOwnedApps, setIsShowingOwnedApps] = useState(false);
  const { getTranslations: t } = useTranslations();

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

  if (!node) {
    return null;
  }

  return (
    <div className="relative h-full w-full">
      {/* Control menu */}
      <div
        className={clsx(
          "absolute -top-1.5 z-40 flex w-full justify-center",
          isFullScreen && "nodrag",
        )}
      >
        <div
          className="flex h-3 w-8 cursor-grab flex-col items-center justify-start pt-1 active:h-16 active:w-16 active:cursor-grabbing"
          onClick={(e) => {
            e.preventDefault();
            setIsShowingMenu((prev) => !prev);
          }}
        >
          <div
            className={clsx(
              "bg-default-500 h-1 w-8 rounded-full",
              isFullScreen && "nodrag",
            )}
          ></div>

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
                isShowingOwnedApps={isShowingOwnedApps}
                setIsShowingOwnedApps={setIsShowingOwnedApps}
                isFullScreen={isFullScreen}
                nodeData={node.data}
                setNodeData={(data) => updateNodeData(viewId, data)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Input and output handles */}
      {selectedAction && (
        <>
          {/* Input Handles */}
          <div className="pointer-events-none absolute top-0 h-full -translate-x-[100%]">
            {isShowingWorkflowConnector && (
              <div className="pointer-events-none relative flex h-full w-full flex-col items-end justify-center gap-y-1">
                {Object.entries(selectedAction?.parameters ?? {}).map(
                  ([paramName, param]) => (
                    <InputHandle
                      key={paramName}
                      paramName={paramName}
                      param={param}
                      editorContext={editorContext}
                      node={node}
                    />
                  ),
                )}
              </div>
            )}
          </div>

          {/* Output Handles */}
          <div className="pointer-events-none absolute top-0 right-0 h-full translate-x-[100%]">
            {isShowingWorkflowConnector && (
              <div className="pointer-events-none relative flex h-full w-full flex-col justify-center gap-y-1">
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

      {/* Entry / Exit floating labels */}
      {node.data.isDefaultEntry && (
        <div className="pointer-events-none absolute top-0 left-0 z-50 translate-x-2 -translate-y-1/2">
          <span className="bg-success text-success-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
            {t("canvasNode.labels.entry")}
          </span>
        </div>
      )}
      {node.data.isDefaultExit && (
        <div className="pointer-events-none absolute top-0 right-0 z-50 -translate-x-2 -translate-y-1/2">
          <span className="bg-danger text-danger-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
            {t("canvasNode.labels.exit")}
          </span>
        </div>
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

      <div className="bg-content1 relative z-10 h-full w-full rounded-lg shadow-md">
        {/* Borders */}
        {isRunning ? (
          <div
            className={clsx(
              "running wrapper gradient absolute top-0 left-0 z-0 h-full w-full overflow-hidden rounded-lg",
              isFullScreen && "nodrag",
            )}
          />
        ) : (
          (node.selected || node.dragging) && (
            <div
              className={clsx(
                "selected wrapper gradient absolute top-0 left-0 z-0 h-full w-full overflow-hidden rounded-lg",
                isFullScreen && "nodrag",
              )}
            />
          )
        )}

        {/* Children wrapper */}
        <div
          className={clsx(
            "relative z-10 h-full w-full overflow-hidden rounded-md data-[is-dragging=true]:pointer-events-none data-[is-resizing=true]:pointer-events-none",
            (node.selected || node.dragging) && !isRunning && "aura",
          )}
          data-is-dragging={node.dragging ? "true" : "false"}
          data-is-resizing={node.resizing ? "true" : "false"}
        >
          <div className="relative h-full w-full">{children}</div>

          <div
            className="nodrag absolute top-0 left-0 hidden h-full w-full data-[is-visible=true]:block"
            data-is-visible={isShowingMenu}
          ></div>
        </div>

        {/* Owned apps */}
        <div
          className="bg-content2 text-content2-foreground relative mx-2 hidden flex-col gap-y-2 rounded-b-lg px-2 py-4 data-[visible=true]:flex"
          data-visible={
            Object.keys(node.data.ownedAppViews ?? {}).length > 0 &&
            isShowingWorkflowConnector &&
            isShowingOwnedApps
          }
        >
          <p className="text-center text-lg font-semibold">Owned Apps</p>
          {Object.entries(node.data.ownedAppViews ?? {}).map(
            ([key, viewModel]) => (
              <div key={viewModel.viewId}>
                <p className="text-center">{key}</p>
                <div className="bg-content3 relative h-80 w-full overflow-hidden rounded-lg shadow-md">
                  <BaseAppView
                    config={{
                      app: viewModel.appConfig.id,
                      viewId: viewModel.viewId,
                    }}
                    viewId={viewModel.viewId}
                  />
                </div>
              </div>
            ),
          )}
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
  isShowingOwnedApps,
  setIsShowingOwnedApps,
  isFullScreen,
  nodeData,
  setNodeData,
}: {
  actions: Action[];
  selectedAction: Action | undefined;
  setSelectedAction: (action: Action | undefined) => Promise<void>;
  controlActions: Record<string, (() => void) | undefined>;
  isShowingWorkflowConnector: boolean;
  setIsShowingWorkflowConnector: (showing: boolean) => Promise<void>;
  isShowingOwnedApps: boolean;
  setIsShowingOwnedApps: (showing: boolean) => void;
  isFullScreen: boolean;
  nodeData: AppNodeData;
  setNodeData: (data: Partial<AppNodeData>) => void;
}) {
  const { openVibeCode } = useVibeCode();
  const { openAppInfoModal } = useAppInfo();
  const { getInstalledExtensionApp } = useExtensionAppManager();
  const { getTranslations: t } = useTranslations();

  return (
    <div className="bg-content1 flex items-center gap-x-1 rounded-md">
      <Tooltip content={t("canvasNode.tooltips.fullscreen")} placement="top">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={() => {
            const action = controlActions["fullscreen"];
            if (action) action();
          }}
        >
          {isFullScreen ? (
            <Icon name="fullscreen_exit" />
          ) : (
            <Icon name="fullscreen" />
          )}
        </Button>
      </Tooltip>

      <Tooltip content={t("canvasNode.tooltips.vibeCode")} placement="top">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="data-[active=true]:bg-default data-[active=true]:text-default-foreground"
          onPress={async () => {
            const nodeApp = await getInstalledExtensionApp(nodeData.config.app);
            if (!nodeApp) {
              addToast({
                title: "Failed to open Vibe Code",
                description:
                  "The app associated with this node is not installed.",
                color: "danger",
              });
              return;
            }

            await openVibeCode({
              appId: nodeApp.config.id,
              version: nodeApp.config.version,
            });
          }}
        >
          <Icon name="auto_awesome" variant="outlined" />
        </Button>
      </Tooltip>

      <Tooltip
        content={t("canvasNode.tooltips.workflowConnectors")}
        placement="top"
      >
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={() => {
            setIsShowingWorkflowConnector(!isShowingWorkflowConnector);
            setIsShowingOwnedApps(!isShowingWorkflowConnector);
          }}
          className="data-[active=true]:bg-default data-[active=true]:text-default-foreground"
          data-active={isShowingWorkflowConnector ? "true" : "false"}
        >
          <Icon name="swap_calls" />
        </Button>
      </Tooltip>

      <Tooltip content={t("canvasNode.tooltips.entry")} placement="top">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="data-[active=true]:bg-default data-[active=true]:text-success"
          data-active={nodeData.isDefaultEntry ? "true" : "false"}
          onPress={() =>
            setNodeData({ isDefaultEntry: !nodeData.isDefaultEntry })
          }
        >
          <Icon name="login" variant="outlined" />
        </Button>
      </Tooltip>

      <Tooltip content={t("canvasNode.tooltips.exit")} placement="top">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="data-[active=true]:bg-default data-[active=true]:text-danger"
          data-active={nodeData.isDefaultExit ? "true" : "false"}
          onPress={() =>
            setNodeData({ isDefaultExit: !nodeData.isDefaultExit })
          }
        >
          <Icon name="logout" variant="outlined" />
        </Button>
      </Tooltip>

      <Tooltip content={"App Settings"} placement="top">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="data-[active=true]:bg-default data-[active=true]:text-default-foreground"
          data-active={isShowingOwnedApps ? "true" : "false"}
          onPress={async () => {
            // Open app details
            const extension = await getInstalledExtensionApp(nodeData.config.app);
            if (!extension) {
              addToast({
                title: "App not found",
                description:
                  "The app associated with this node is not installed.",
                color: "danger",
              });
              return;
            }
            openAppInfoModal({
              id: extension.config.id,
              name: extension.config.displayName ?? extension.config.id,
              version: extension.config.version,
              author: extension.config.author,
              license: extension.config.license,
              url: extension.config.repository,
              readme: extension.config.repository
                ? extension.config.repository + "/README.md"
                : undefined,
            });
          }}
        >
          <Icon name="settings" variant="outlined" />
        </Button>
      </Tooltip>

      <Tooltip content={t("canvasNode.tooltips.selectAction")} placement="top">
        <Form className="flex flex-row items-center gap-x-1">
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
              const action = actions.find(
                (a) => a.name === Array.from(keys)[0],
              );
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
      </Tooltip>

      <Tooltip content={t("canvasNode.tooltips.delete")} placement="top">
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

function InputHandle({
  paramName,
  param,
  editorContext,
  node,
}: {
  paramName: string;
  param: TypedVariable;
  editorContext: EditorContextType | undefined;
  node: ReactFlowNode<AppNodeData>;
}) {
  if (param.type === "app-instance") {
    return (
      <div className="pointer-events-auto">
        <DroppableInputHandle
          paramName={paramName}
          node={node}
          editorContext={editorContext}
          isOptional={param.optional ?? false}
        />
      </div>
    );
  } else {
    return (
      <NodeHandle
        id={paramName}
        param={param}
        position={Position.Left}
        type="target"
        isOptional={param.optional ?? false}
      />
    );
  }
}

function DroppableInputHandle({
  paramName,
  node,
  editorContext,
  isOptional,
}: {
  paramName: string;
  node: ReactFlowNode<AppNodeData>;
  editorContext: EditorContextType | undefined;
  isOptional: boolean;
}) {
  const { updateNodeData } = useReactFlow();

  const { setNodeRef, isOver } = useDroppable({
    id: `node-handle-input-${node.id}-${paramName}`,
    data: {
      viewId: node.id,
      node,
      paramName,
      updateNodeData,
    },
  });

  return (
    <Button
      className="data-[exist-app=true]:border-success data-[exist-app=true]:bg-success/30 data-[is-over=true]:aura h-fit rounded-r-none data-[exist-app=true]:border-2"
      onPress={() => {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isSideMenuOpen: true,
        }));
      }}
      data-exist-app={node.data.ownedAppViews[paramName] ? "true" : "false"}
      ref={setNodeRef}
      data-is-over={isOver ? "true" : "false"}
    >
      <div className="py-2 text-center">
        <p>{paramName}</p>
        <p>(app-instance)</p>
        {!isOptional && <p className="text-danger">*required</p>}
        {node.data.ownedAppViews[paramName] ? (
          <p>{node.data.ownedAppViews[paramName].viewId}</p>
        ) : (
          <p>Tip: drag app here</p>
        )}
      </div>
    </Button>
  );
}
