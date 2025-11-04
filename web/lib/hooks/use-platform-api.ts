import { useEffect, useState } from "react";
import { AbstractPlatformAPI } from "../platform-api/abstract-platform-api";
import { getAbstractPlatformAPI } from "../platform-api/get-platform-api";
import { useWorkspace } from "./use-workspace";

export function usePlatformApi() {
  const { workspace } = useWorkspace();

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
