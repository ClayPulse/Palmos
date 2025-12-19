import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect, useState } from "react";
import { useAuth } from "./use-auth";
import { usePlatformApi } from "./use-platform-api";

export function useProjectManager() {
  const editorContext = useContext(EditorContext);

  const { session } = useAuth();
  const { platformApi } = usePlatformApi();

  const [isLoading, setIsLoading] = useState(false);

  const projects = editorContext?.editorStates.projectsInfo;

  useEffect(() => {
    if (platformApi && session) {
      const homePath = editorContext?.persistSettings?.projectHomePath;

      setIsLoading(true);
      platformApi.listProjects(homePath).then((projects) => {
        editorContext?.setEditorStates((prev) => {
          return {
            ...prev,
            projectsInfo: projects,
          };
        });
        setIsLoading(false);
      });
    }
  }, [editorContext?.persistSettings, platformApi, session]);

  return {
    isLoading,
    projects,
  };
}
