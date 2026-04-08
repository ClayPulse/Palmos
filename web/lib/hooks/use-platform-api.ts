import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect, useState } from "react";
import { AbstractPlatformAPI } from "../platform-api/abstract-platform-api";
import { getAbstractPlatformAPI } from "../platform-api/get-platform-api";

export function usePlatformApi() {
  const editorContext = useContext(EditorContext);
  const workspace = editorContext?.editorStates?.currentWorkspace;

  const [platformApi, setPlatformApi] = useState<
    AbstractPlatformAPI | undefined
  >(undefined);

  useEffect(() => {
    const api = getAbstractPlatformAPI(workspace);
    setPlatformApi(api);
  }, []);

  // When workspace changes, update platform API if needed.
  // So the platform api switch to the latest workspace context.
  useEffect(() => {
    if (workspace) {
      const api = getAbstractPlatformAPI(workspace);
      setPlatformApi(api);
    }
  }, [workspace]);

  return {
    platformApi,
  };
}
