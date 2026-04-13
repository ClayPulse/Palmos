"use client";

import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { useCallback, useState } from "react";

type EnvSetup = {
  isOpen: boolean;
  workflowId: string;
  env: Record<string, string>;
};

/**
 * Hook that checks for missing workflow env vars and manages
 * the env-setup modal state. Reusable across all workflow open points.
 */
export function useWorkflowEnvCheck() {
  const [envSetup, setEnvSetup] = useState<EnvSetup | null>(null);

  const checkMissingEnvs = useCallback(async (workflowId: string | undefined) => {
    if (!workflowId) return;
    try {const res = await fetchAPI(
      
        `/api/workflow/user-settings/check-missing?workflowId=${encodeURIComponent(workflowId)}`,
      );
      if (res.ok) {
        const { missing } = await res.json();
        if (missing && Object.keys(missing).length > 0) {
          setEnvSetup({ isOpen: true, workflowId, env: missing });
        }
      }
    } catch {
      // Silently ignore — settings can be configured later
    }
  }, []);

  const closeEnvSetup = useCallback(() => {
    setEnvSetup(null);
  }, []);

  return { envSetup, checkMissingEnvs, closeEnvSetup };
}
