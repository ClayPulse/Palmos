import { useContext, useEffect, useState } from "react";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { FileViewModel } from "@pulse-editor/shared-utils";
import { usePlatformApi } from "./use-platform-api";

export function useViewManager() {
  const editorContext = useContext(EditorContext);
  const { platformApi } = usePlatformApi();
  const [activeFileView, setActiveFileView] = useState<
    FileViewModel | undefined
  >(undefined);

  useEffect(() => {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    const activeView = editorContext.editorStates.openedViewModels.find(
      (view) => view.isActive,
    );
    setActiveFileView(activeView);
  }, [editorContext?.editorStates.openedViewModels]);

  async function openFileView(file: File) {
    const text = await file.text();
    const model: FileViewModel = {
      fileContent: text,
      filePath: file.name,
      isActive: true,
    };

    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    const isAlreadyOpened = editorContext.editorStates.openedViewModels.find(
      (view) => view.filePath === model.filePath,
    );

    if (!isAlreadyOpened) {
      const updatedOpenedViewModels =
        editorContext.editorStates.openedViewModels.map((v) => {
          return {
            ...v,
            isActive: false,
          };
        });

      editorContext.setEditorStates((prev) => {
        return {
          ...prev,
          openedViewModels: [...updatedOpenedViewModels, model],
        };
      });
    } else {
      const updatedOpenedViewModels =
        editorContext.editorStates.openedViewModels.map((v) => {
          if (v.filePath === model.filePath) {
            return {
              ...v,
              isActive: true,
            };
          } else {
            return {
              ...v,
              isActive: false,
            };
          }
        });

      editorContext.setEditorStates((prev) => {
        return {
          ...prev,
          openedViewModels: [...updatedOpenedViewModels],
        };
      });
    }

    return;
  }

  function getFileViewByFilePath(uri: string): FileViewModel | undefined {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    return editorContext.editorStates.openedViewModels.find(
      (view) => view.filePath === uri,
    );
  }

  function closeFileView(view: FileViewModel) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        openedViewModels: prev.openedViewModels.filter(
          (v) => v.filePath !== view.filePath,
        ),
      };
    });
  }

  function updateFileView(view: FileViewModel) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    editorContext.setEditorStates((prev) => {
      const updatedViewModels = prev.openedViewModels.map((v) => {
        if (v.filePath === view.filePath) {
          return {
            ...v,
            ...view,
          };
        } else {
          return v;
        }
      });
      return {
        ...prev,
        openedViewModels: updatedViewModels,
      };
    });

    // Update the file in file system

    const updatedFile = new File([view.fileContent], view.filePath);
    platformApi?.writeFile(updatedFile, view.filePath);
  }

  /**
   * Clear all views
   */
  function closeAllFileViews() {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        openedViewModels: [],
      };
    });
  }

  function fileViewCount(): number {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    return editorContext.editorStates.openedViewModels.length;
  }

  return {
    openFileView,
    getFileViewByFilePath,
    closeFileView,
    updateFileView,
    closeAllFileViews,
    fileViewCount,
    activeFileView,
  };
}
