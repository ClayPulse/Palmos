import { useContext } from "react";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { WorkflowContent } from "@/lib/types";
import { usePlatformApi } from "./use-platform-api";

/**
 * Hook that provides canvas workflow persistence.
 * Saves and loads workflow content via the platform API (file system on
 * desktop/mobile, localStorage on cloud/web) so that in-progress edits
 * survive page reloads and app restarts.
 */
export function useWorkflowPersistence() {
  const { platformApi } = usePlatformApi();
  const editorContext = useContext(EditorContext);

  /**
   * Returns a stable storage key for the current project.
   * Combines projectHomePath and projectName so each project has its own
   * saved canvas state.
   */
  function getProjectUri(): string | undefined {
    const project = editorContext?.editorStates.project;
    if (!project) return undefined;
    const homePath = editorContext?.persistSettings?.projectHomePath;
    return homePath ? `${homePath}/${project}` : project;
  }

  /**
   * Persist the given workflow content for the active project.
   * Silently no-ops when no project is open or the platform API is unavailable.
   */
  async function saveWorkflow(content: WorkflowContent): Promise<void> {
    if (!platformApi) return;
    const projectUri = getProjectUri();
    if (!projectUri) return;
    try {
      await platformApi.saveCanvasState(projectUri, content);
    } catch (err) {
      console.error("Failed to save canvas state:", err);
    }
  }

  /**
   * Load the previously saved workflow content for the active project.
   * Returns undefined when no saved state exists or the load fails.
   */
  async function loadWorkflow(): Promise<WorkflowContent | undefined> {
    if (!platformApi) return undefined;
    const projectUri = getProjectUri();
    if (!projectUri) return undefined;
    try {
      return await platformApi.loadCanvasState(projectUri);
    } catch (err) {
      console.error("Failed to load canvas state:", err);
      return undefined;
    }
  }

  return {
    saveWorkflow,
    loadWorkflow,
  };
}
