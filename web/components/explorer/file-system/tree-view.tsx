"use client";

import ContextMenu from "@/components/interface/context-menu";
import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { AbstractPlatformAPI } from "@/lib/platform-api/abstract-platform-api";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import {
  ContextMenuState,
  DragData,
  FileDragData,
  TreeViewGroupRef,
  TreeViewNodeRef,
} from "@/lib/types";
import { useDraggable } from "@dnd-kit/core";
import { Button, Input } from "@heroui/react";
import { FileSystemObject } from "@pulse-editor/shared-utils";
import {
  forwardRef,
  Ref,
  RefObject,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

// A tree view node that represents a single file or folder
const TreeViewNode = forwardRef(function TreeViewNode(
  {
    object,
    viewFile,
    platformApi,
    parentGroupRef,
    refreshWorkspaceContent,
  }: {
    object: FileSystemObject;
    viewFile: (uri: string) => Promise<void>;
    platformApi?: AbstractPlatformAPI;
    parentGroupRef: RefObject<TreeViewGroupRef>;
    refreshWorkspaceContent: () => Promise<void>;
  },
  ref: Ref<TreeViewNodeRef | null>,
) {
  useImperativeHandle(ref, () => ({
    getParentGroupRef() {
      return parentGroupRef.current;
    },
    getChildGroupRef() {
      return childGroupRef.current;
    },
    isFolder() {
      return object.isFolder;
    },
  }));

  const { setNodeRef, listeners } = useDraggable({
    id: `draggable-file-${object.uri}`,
    data: {
      type: "file",
      data: {
        uri: object.uri,
      } as FileDragData,
    } as DragData,
  });

  const [isFolderCollapsed, setIsFolderCollapsed] = useState(true);
  const [isSelected, setIsSelected] = useState(false);
  const editorContext = useContext(EditorContext);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(object.name);
  const childGroupRef = useRef<TreeViewGroupRef | null>(null);
  const [subDirItems, setSubDirItems] = useState<FileSystemObject[]>(object.subDirItems ?? []);
  const [isLoadingSubDir, setIsLoadingSubDir] = useState(false);
  const [hasLoadedSubDir, setHasLoadedSubDir] = useState((object.subDirItems?.length ?? 0) > 0);

  // Unselect self if self is not in the selected nodes
  useEffect(() => {
    if (
      editorContext?.editorStates.explorerSelectedNodeRefs?.indexOf(
        ref as RefObject<TreeViewNodeRef>,
      ) === -1
    ) {
      setIsSelected(false);

      // Reset group state
      childGroupRef.current?.cancelCreating();
    }
  }, [editorContext?.editorStates.explorerSelectedNodeRefs]);

  /* Select 1 node. This is for single selection when Ctrl is not pressed. */
  function selectNode() {
    // Clear all other selected nodes and select this node
    // if Ctrl is not pressed
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        explorerSelectedNodeRefs: [ref as RefObject<TreeViewNodeRef>],
      };
    });
    setIsSelected(true);
  }

  /* Clear all selected nodes. This is for single selection when Ctrl is not pressed. */
  function unSelectNode() {
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        explorerSelectedNodeRefs: [],
      };
    });
    setIsSelected(false);
  }

  function multiSelectNode() {
    // Unselect this node if it is already selected
    if (
      editorContext?.editorStates.explorerSelectedNodeRefs?.includes(
        ref as RefObject<TreeViewNodeRef>,
      )
    ) {
      editorContext?.setEditorStates((prev) => {
        return {
          ...prev,
          explorerSelectedNodeRefs: prev.explorerSelectedNodeRefs?.filter(
            (nodeRef) => nodeRef !== (ref as RefObject<TreeViewNodeRef>),
          ),
        };
      });
      setIsSelected(false);
      return;
    }

    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        explorerSelectedNodeRefs: [
          ...(prev.explorerSelectedNodeRefs ?? []),
          ref as RefObject<TreeViewNodeRef>,
        ],
      };
    });
    setIsSelected(true);
  }

  function isCtrlDown() {
    return editorContext?.editorStates.pressedKeys.indexOf("Control") !== -1;
  }

  async function loadSubDirContents() {
    if (!object.isFolder || !platformApi) {
      return;
    }

    // If subdirectory contents already loaded, no need to load again
    if (hasLoadedSubDir) {
      return;
    }

    setIsLoadingSubDir(true);
    try {
      const contents = await platformApi.listPathContent(object.uri, {
        include: "all",
        depth: 1,
      });
      setSubDirItems(contents);
      setHasLoadedSubDir(true);
    } catch (error) {
      console.error("Failed to load subdirectory contents:", error);
      toast.error("Failed to load folder contents");
    } finally {
      setIsLoadingSubDir(false);
    }
  }

  function handleOnContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    // Get parent element position
    const current = e.currentTarget as HTMLElement;
    const parent = current.parentElement as HTMLElement;
    const parentRect = parent.getBoundingClientRect();

    setContextMenuState({
      x: e.clientX - parentRect.left,
      y: e.clientY - parentRect.top,
      isOpen: true,
    });
  }

  return (
    <div className="relative flex flex-col gap-y-0.5">
      {isRenaming ? (
        <Input
          autoFocus
          variant="bordered"
          size="sm"
          value={newName}
          onValueChange={(value) => {
            setNewName(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const newUri =
                parentGroupRef.current?.getFolderUri() + "/" + newName;

              platformApi?.rename(object.uri, newUri).then(() => {
                refreshWorkspaceContent();
              });

              setIsRenaming(false);
            }
          }}
          onFocusChange={(isFocused) => {
            if (!isFocused) {
              const newUri =
                parentGroupRef.current?.getFolderUri() + "/" + newName;

              platformApi?.rename(object.uri, newUri).then(() => {
                refreshWorkspaceContent();
              });

              setIsRenaming(false);
            }
          }}
        />
      ) : (
        <>
          {object.isFolder ? (
            <Button
              ref={setNodeRef}
              {...listeners}
              className="w-full touch-manipulation px-2 text-[16px]"
              variant={isSelected ? "bordered" : "solid"}
              style={{
                height:
                  getPlatform() === PlatformEnum.Capacitor ? "32px" : "24px",
              }}
              size="sm"
              onPress={async () => {
                if (contextMenuState.isOpen) {
                  return;
                }

                if (isCtrlDown()) {
                  multiSelectNode();
                } else {
                  if (isFolderCollapsed) {
                    selectNode();
                    // Load subdirectory contents when expanding
                    await loadSubDirContents();
                  } else {
                    unSelectNode();
                  }
                  // Only toggle folder collapsed state if Ctrl is not pressed
                  setIsFolderCollapsed(!isFolderCollapsed);
                }
              }}
              onContextMenu={handleOnContextMenu}
            >
              <div className="flex w-full">
                <p>{object.name}</p>
                <div className="flex w-full justify-end">
                  <div>
                    <Icon
                      name={isFolderCollapsed ? "expand_more" : "expand_less"}
                    />
                  </div>
                </div>
              </div>
            </Button>
          ) : (
            <Button
              ref={setNodeRef}
              {...listeners}
              className="w-full touch-manipulation px-2 text-[16px]"
              variant={isSelected ? "bordered" : "light"}
              style={{
                height:
                  getPlatform() === PlatformEnum.Capacitor ? "32px" : "24px",
              }}
              size="sm"
              onPress={() => {
                if (contextMenuState.isOpen) {
                  return;
                }

                if (isCtrlDown()) {
                  multiSelectNode();
                } else {
                  if (isFolderCollapsed) {
                    selectNode();
                  } else {
                    unSelectNode();
                  }
                }
                // check if ctrl is down
                viewFile(object.uri);
              }}
              onContextMenu={handleOnContextMenu}
            >
              <div className="w-full">
                <p className="w-fit">{object.name}</p>
              </div>
            </Button>
          )}
          <ContextMenu state={contextMenuState} setState={setContextMenuState}>
            <div className="flex flex-col gap-y-1">
              {!object.isFolder && (
                <Button
                  className="text-medium h-12 sm:h-8 sm:text-sm"
                  variant="solid"
                  onPress={(e) => {
                    setContextMenuState({ x: 0, y: 0, isOpen: false });

                    viewFile(object.uri);
                  }}
                >
                  <p className="w-full text-start">Open In Canvas</p>
                </Button>
              )}
              {!object.isFolder && (
                <Button
                  className="text-medium h-12 sm:h-8 sm:text-sm"
                  variant="solid"
                  onPress={(e) => {
                    setContextMenuState({ x: 0, y: 0, isOpen: false });

                    viewFile(object.uri);
                  }}
                >
                  <p className="w-full text-start">Open In App</p>
                </Button>
              )}
              <Button
                className="text-medium h-12 sm:h-8 sm:text-sm"
                variant="light"
                onPress={(e) => {
                  setIsRenaming(true);
                  setContextMenuState({ x: 0, y: 0, isOpen: false });
                }}
              >
                <p className="w-full text-start">Rename</p>
              </Button>
              <Button
                className="text-medium h-12 sm:h-8 sm:text-sm"
                variant="solid"
                color="danger"
                onPress={(e) => {
                  platformApi?.delete(object.uri).then(() => {
                    refreshWorkspaceContent();
                  });
                  setContextMenuState({ x: 0, y: 0, isOpen: false });
                }}
              >
                <p className="text-danger-foreground w-full text-start">
                  Delete
                </p>
              </Button>
            </div>
          </ContextMenu>
        </>
      )}

      {object.isFolder && !isFolderCollapsed && (
        <div className="ml-4">
          {isLoadingSubDir ? (
            <div className="flex justify-center py-2">
              <div className="text-sm">Loading...</div>
            </div>
          ) : (
            <TreeViewGroup
              ref={childGroupRef}
              objects={subDirItems}
              viewFile={viewFile}
              folderUri={object.uri}
              platformApi={platformApi}
              refreshWorkspaceContent={refreshWorkspaceContent}
            />
          )}
        </div>
      )}
    </div>
  );
});

function TreeViewNodeWrapper({
  object,
  viewFile,
  platformApi,
  parentGroupRef,
  refreshWorkspaceContent,
}: {
  object: FileSystemObject;
  viewFile: (uri: string) => Promise<void>;
  platformApi?: AbstractPlatformAPI;
  parentGroupRef: RefObject<TreeViewGroupRef>;
  refreshWorkspaceContent: () => Promise<void>;
}) {
  const nodeRef = useRef<TreeViewNodeRef | null>(null);

  return (
    <TreeViewNode
      ref={nodeRef}
      object={object}
      viewFile={viewFile}
      platformApi={platformApi}
      parentGroupRef={parentGroupRef}
      refreshWorkspaceContent={refreshWorkspaceContent}
    />
  );
}

const TreeViewGroup = forwardRef(function TreeViewGroup(
  {
    objects,
    viewFile,
    folderUri,
    refreshWorkspaceContent,
    platformApi,
  }: {
    objects: FileSystemObject[];
    viewFile: (uri: string) => Promise<void>;
    folderUri: string;
    refreshWorkspaceContent: () => Promise<void>;
    platformApi?: AbstractPlatformAPI;
  },
  ref: Ref<TreeViewGroupRef>,
) {
  useImperativeHandle(ref, () => ({
    startCreatingNewFolder() {
      setFolderNameInputValue("");
      setFileNameInputValue("");
      setIsCreatingNewFolder(true);
      setIsCreatingNewFile(false);
    },
    startCreatingNewFile() {
      setFolderNameInputValue("");
      setFileNameInputValue("");
      setIsCreatingNewFolder(false);
      setIsCreatingNewFile(true);
    },
    cancelCreating() {
      setFolderNameInputValue("");
      setFileNameInputValue("");
      setIsCreatingNewFolder(false);
      setIsCreatingNewFile(false);
    },
    getFolderUri() {
      return folderUri;
    },
  }));

  const [isCreatingNewFile, setIsCreatingNewFile] = useState(false);
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);

  const [folderNameInputValue, setFolderNameInputValue] = useState<string>("");
  const [fileNameInputValue, setFileNameInputValue] = useState<string>("");

  function createNewFolder(uri: string) {
    console.log("Creating new folder with uri:", uri);

    if (!platformApi) {
      toast.error("Platform API is not available.");
      return;
    }

    platformApi.createFolder(uri).then(() => {
      refreshWorkspaceContent();
    });

    setFolderNameInputValue("");
    setIsCreatingNewFolder(false);
  }

  function createNewFile(uri: string) {
    console.log("Creating new file with uri:", uri);

    if (!platformApi) {
      toast.error("Platform API is not available.");
      return;
    }

    platformApi.createFile(uri).then(() => {
      refreshWorkspaceContent();
    });

    setFileNameInputValue("");
    setIsCreatingNewFile(false);
  }

  return (
    <div className="space-y-0.5">
      {objects.map((object) => {
        return (
          <TreeViewNodeWrapper
            key={object.uri}
            object={object}
            viewFile={viewFile}
            platformApi={platformApi}
            parentGroupRef={ref as RefObject<TreeViewGroupRef>}
            refreshWorkspaceContent={refreshWorkspaceContent}
          />
        );
      })}

      {isCreatingNewFolder && (
        <Input
          placeholder="folder name"
          autoFocus
          variant="bordered"
          size="sm"
          value={folderNameInputValue}
          onValueChange={setFolderNameInputValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const uri = folderUri + "/" + folderNameInputValue;
              createNewFolder(uri);
            }
          }}
          onFocusChange={(isFocused) => {
            if (!isFocused) {
              const uri = folderUri + "/" + folderNameInputValue;
              createNewFolder(uri);
            }
          }}
        />
      )}
      {isCreatingNewFile && (
        <Input
          placeholder="file name"
          autoFocus
          variant="bordered"
          size="sm"
          value={fileNameInputValue}
          onValueChange={setFileNameInputValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Cancel on empty input
              if (fileNameInputValue === "") {
                setIsCreatingNewFile(false);
                return;
              }

              const uri = folderUri + "/" + fileNameInputValue;
              createNewFile(uri);
            }
          }}
          onFocusChange={(isFocused) => {
            if (!isFocused) {
              // Cancel on empty input
              if (fileNameInputValue === "") {
                setIsCreatingNewFile(false);
                return;
              }

              const uri = folderUri + "/" + fileNameInputValue;
              createNewFile(uri);
            }
          }}
        />
      )}
    </div>
  );
});

export default TreeViewGroup;
