import { useContext, useEffect, useState } from "react";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { ViewModel } from "@pulse-editor/shared-utils";
import { usePlatformApi } from "./use-platform-api";
import { v4 } from "uuid";

export function useViewManager() {
  const editorContext = useContext(EditorContext);
  const { platformApi } = usePlatformApi();
  const [activeViewModel, setActiveView] = useState<ViewModel | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    const activeView = editorContext.editorStates.openedViewModels.find(
      (view) => view.isFocused,
    );
    setActiveView(activeView);
  }, [editorContext?.editorStates.openedViewModels]);

  async function openFileInView(file: File) {
    const text = await file.text();
    const model: ViewModel = {
      viewId: v4(),
      isFocused: true,
      file: {
        content: text,
        path: file.name,
      },
    };

    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    const isAlreadyOpened = editorContext.editorStates.openedViewModels.find(
      (view) => view.file?.path === model.file?.path,
    );

    if (!isAlreadyOpened) {
      const updatedOpenedViewModels =
        editorContext.editorStates.openedViewModels.map((v) => {
          return {
            ...v,
            isFocused: false,
          };
        });

      editorContext.setEditorStates((prev) => {
        return {
          ...prev,
          openedViewModels: [...updatedOpenedViewModels, model],
        };
      });

      return;
    }

    const updatedOpenedViewModels =
      editorContext.editorStates.openedViewModels.map((v) => {
        if (v.file?.path === model.file?.path) {
          return {
            ...v,
            isFocused: true,
          };
        } else {
          return {
            ...v,
            isFocused: false,
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

  function getViewByFilePath(uri: string): ViewModel | undefined {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    return editorContext.editorStates.openedViewModels.find(
      (view) => view.file?.path === uri,
    );
  }

  function closeView(view: ViewModel) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        openedViewModels: prev.openedViewModels.filter(
          (v) => v.file?.path !== view.file?.path,
        ),
      };
    });
  }

  function updateViewModel(view: ViewModel) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    editorContext.setEditorStates((prev) => {
      const updatedViewModels = prev.openedViewModels.map((v) => {
        if (v.file?.path === view.file?.path) {
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
    if (view.file) {
      const updatedFile = new File([view.file.content], view.file.path);
      platformApi?.writeFile(updatedFile, view.file.path);
    }
  }

  /**
   * Clear all views
   */
  function closeAllViews() {
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

  function viewCount(): number {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    return editorContext.editorStates.openedViewModels.length;
  }

  return {
    openFileInView,
    getViewByFilePath,
    closeView,
    updateViewModel,
    closeAllViews,
    viewCount,
    activeViewModel
  };
}
