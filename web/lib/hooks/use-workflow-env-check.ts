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
 *
 * `checkMissingEnvs` returns the missing env map (or null). Callers can
 * use `openEnvSetup` to show the modal and defer opening the canvas until
 * the user completes the modal (via the `onComplete` callback).
 */
export function useWorkflowEnvCheck() {
  const [envSetup, setEnvSetup] = useState<EnvSetup | null>(null);

  /** Check the backend for missing envs. Returns the missing map or null. */
  const checkMissingEnvs = useCallback(
    async (
      workflowId: string | undefined,
    ): Promise<Record<string, string> | null> => {
      if (!workflowId) return null;
      try {
        const res = await fetchAPI(
          `/api/workflow/user-settings/check-missing?workflowId=${encodeURIComponent(workflowId)}`,
        );
        if (res.ok) {
          const { missing } = await res.json();
          if (missing && Object.keys(missing).length > 0) {
            return missing;
          }
        }
      } catch {
        // Silently ignore — settings can be configured later
      }
      return null;
    },
    [],
  );

  /** Open the env-setup modal manually (e.g. before opening the canvas). */
  const openEnvSetup = useCallback(
    (workflowId: string, env: Record<string, string>) => {
      setEnvSetup({ isOpen: true, workflowId, env });
    },
    [],
  );

  const closeEnvSetup = useCallback(() => {
    setEnvSetup(null);
  }, []);

  return { envSetup, checkMissingEnvs, openEnvSetup, closeEnvSetup };
}
