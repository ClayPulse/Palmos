import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { ContextMenuState, Workflow } from "@/lib/types";
import {
  addToast,
  Button,
  Chip,
  Divider,
  Skeleton,
  Tooltip,
} from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import ContextMenu from "../interface/context-menu";
import ShareWorkflowModal from "../interface/share-workflow-modal";

export default function WorkflowPreviewCard({
  workflow,
  onPress,
}: {
  workflow: Workflow;
  onPress?: (workflow: Workflow) => void;
}) {
  const editorContext = useContext(EditorContext);

  const [isLoaded, setIsLoaded] = useState(false);

  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  const [isShowInfo, setIsShowInfo] = useState(false);

  const [isHover, setIsHover] = useState(false);

  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, [workflow]);

  if (!isLoaded) {
    return <Skeleton className="h-full w-full" />;
  }

  const requireWorkspace = workflow.requireWorkspace;

  return (
    <div className="bg-content2 border-divider grid h-full w-full grid-cols-1 grid-rows-[auto_max-content_max-content] rounded-lg border p-2">
      <div
        className="relative h-full min-h-32 w-full"
        onMouseEnter={() => {
          if (getPlatform() !== PlatformEnum.Capacitor) {
            setIsHover(true);
          }
        }}
        // Hide show info when user taps outside of the modal
        onMouseLeave={() => {
          if (getPlatform() !== PlatformEnum.Capacitor) {
            setIsHover(false);
          }
        }}
      >
        <div className="pointer-events-none absolute top-0 right-0.5 z-10">
          <div className="pointer-events-none flex flex-col items-end gap-y-0.5">
            {requireWorkspace && (
              <div className="pointer-events-auto h-7">
                <Tooltip
                  content={
                    <div className="max-w-xs">
                      <p>
                        This app requires a workspace to be opened in order to
                        function properly.
                      </p>
                    </div>
                  }
                >
                  <Chip
                    className="h-full"
                    startContent={<Icon name="computer" />}
                    variant="faded"
                    color="secondary"
                    size="sm"
                  >
                    Requires Workspace
                  </Chip>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        <Button
          className="relative m-0 h-full w-full rounded-md p-0"
          onPress={() => {
            if (onPress) {
              onPress(workflow);
            } else {
              setIsShowInfo((prev) => !prev);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            // Get parent element position
            const current = e.currentTarget as HTMLElement;
            const parent = current.parentElement as HTMLElement;
            const parentRect = parent.getBoundingClientRect();

            setContextMenuState(() => ({
              x: e.clientX - parentRect.left,
              y: e.clientY - parentRect.top,
              isOpen: true,
            }));
          }}
        >
          {workflow.thumbnail ? (
            <img
              src={workflow.thumbnail}
              alt={workflow.name}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <Skeleton className="h-full w-full" isLoaded={false}></Skeleton>
          )}
        </Button>
        {(isShowInfo || isHover) && (
          <div className="absolute bottom-0.5 left-1/2 flex w-full -translate-x-1/2 justify-center gap-x-0.5">
            <Button
              color="primary"
              size="sm"
              onPress={() => {
                if (onPress) {
                  onPress(workflow);
                }
              }}
            >
              Use
            </Button>

            <Button color="secondary" size="sm">
              Details
            </Button>
          </div>
        )}
        <ContextMenu state={contextMenuState} setState={setContextMenuState}>
          <div className="flex flex-col">
            <Button
              className="text-medium h-12 sm:h-8 sm:text-sm"
              variant="light"
              onPress={() => {
                if (onPress) {
                  onPress(workflow);
                }
              }}
            >
              <p className="w-full text-start">Use</p>
            </Button>
            <Button
              className="text-medium h-12 sm:h-8 sm:text-sm"
              variant="light"
              onPress={() => {
                setContextMenuState((prev) => ({ ...prev, isOpen: false }));
                setIsShareOpen(true);
              }}
            >
              <p className="w-full text-start">Share with Client</p>
            </Button>
          </div>
        </ContextMenu>
        <ShareWorkflowModal
          workflow={workflow}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
        />
      </div>
      <div className="w-full">
        <div className="grid w-full grid-cols-[auto_max-content] items-center gap-x-2">
          <p className="font-semibold wrap-break-word">{workflow.name}</p>
          <p className="text-center">{workflow.version}</p>
        </div>

        <div className="py-1">
          <Divider />
        </div>

        <div className="flex items-center justify-end gap-x-2">
          <div className="flex gap-x-1">
            <div>
              <Icon name="comment" />
            </div>
            <p>0</p>
          </div>
          <div className="flex gap-x-1">
            <div>
              <Icon name="favorite" />
            </div>
            <p>0</p>
          </div>
          <Tooltip content="Copy share link">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => {
                const url = `${window.location.origin}/?workflow=${encodeURIComponent(workflow.name)}`;
                navigator.clipboard.writeText(url);
                addToast({
                  title: "Link copied",
                  description: "Share link copied to clipboard.",
                  color: "success",
                });
              }}
            >
              <Icon name="share" />
            </Button>
          </Tooltip>
          <Tooltip content="Share with client">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => setIsShareOpen(true)}
            >
              <Icon name="send" />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
