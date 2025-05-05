"use client";

import {
  ContextMenuState,
  EditorContextType,
  FileSystemObject,
  TreeViewGroupRef,
  TreeViewNodeRef,
} from "@/lib/types";
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
import { EditorContext } from "../providers/editor-context-provider";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { Button, Input } from "@heroui/react";
import Icon from "../misc/icon";
import toast from "react-hot-toast";
import { AbstractPlatformAPI } from "@/lib/platform-api/abstract-platform-api";
import ContextMenu from "../interface/context-menu";
import { PlatformEnum } from "@/lib/types";

function refreshProjectContent(
  platformApi: AbstractPlatformAPI,
  editorContext: EditorContextType | undefined,
) {
  const projectUri =
    editorContext?.persistSettings?.projectHomePath +
    "/" +
    editorContext?.editorStates.project;
  platformApi
    ?.listPathContent(projectUri, {
      include: "all",
      isRecursive: true,
    })
    .then((objects) => {
      editorContext?.setEditorStates((prev) => {
        return {
          ...prev,
          projectContent: objects,
          explorerSelectedNodeRefs: [],
        };
      });

      console.log("Found project content:", objects);

      toast.success("Project content updated.");
    });
}

// A tree view node that represents a single file or folder
const TreeViewNode = forwardRef(function TreeViewNode(
  {
    object,
    viewFile,
    platformApi,
    parentGroupRef,
  }: {
    object: FileSystemObject;
    viewFile: (uri: string) => void;
    platformApi?: AbstractPlatformAPI;
    parentGroupRef: RefObject<TreeViewGroupRef>;
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
                refreshProjectContent(platformApi, editorContext);
              });

              setIsRenaming(false);
            }
          }}
          onFocusChange={(isFocused) => {
            if (!isFocused) {
              const newUri =
                parentGroupRef.current?.getFolderUri() + "/" + newName;

              platformApi?.rename(object.uri, newUri).then(() => {
                refreshProjectContent(platformApi, editorContext);
              });

              setIsRenaming(false);
            }
          }}
        />
      ) : (
        <>
          {object.isFolder ? (
            <Button
              className="w-full px-2 text-[16px]"
              variant={isSelected ? "bordered" : "solid"}
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
              className="w-full px-2 text-[16px]"
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
            <div className="flex flex-col">
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
                    refreshProjectContent(platformApi, editorContext);
                  });
                  setContextMenuState({ x: 0, y: 0, isOpen: false });
                }}
              >
                <p className="w-full text-start">Delete</p>
              </Button>
            </div>
          </ContextMenu>
        </>
      )}

      {object.isFolder && object.subDirItems && !isFolderCollapsed && (
        <div className="ml-4">
          <TreeViewGroup
            ref={childGroupRef}
            objects={object.subDirItems}
            viewFile={viewFile}
            folderUri={object.uri}
            platformApi={platformApi}
          />
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
}: {
  object: FileSystemObject;
  viewFile: (uri: string) => void;
  platformApi?: AbstractPlatformAPI;
  parentGroupRef: RefObject<TreeViewGroupRef>;
}) {
  const nodeRef = useRef<TreeViewNodeRef | null>(null);

  return (
    <TreeViewNode
      ref={nodeRef}
      object={object}
      viewFile={viewFile}
      platformApi={platformApi}
      parentGroupRef={parentGroupRef}
    />
  );
}

const TreeViewGroup = forwardRef(function TreeViewGroup(
  {
    objects,
    viewFile,
    folderUri,
    platformApi,
  }: {
    objects: FileSystemObject[];
    viewFile: (uri: string) => void;
    folderUri: string;
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
  const editorContext = useContext(EditorContext);

  function createNewFolder(uri: string) {
    console.log("Creating new folder with uri:", uri);

    if (!platformApi) {
      toast.error("Platform API is not available.");
      return;
    }

    platformApi.createFolder(uri).then(() => {
      refreshProjectContent(platformApi, editorContext);
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
      refreshProjectContent(platformApi, editorContext);
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
              const uri = folderUri + "/" + fileNameInputValue;
              createNewFile(uri);
            }
          }}
          onFocusChange={(isFocused) => {
            if (!isFocused) {
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
