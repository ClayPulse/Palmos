"use client";

import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { useCallback, useState } from "react";

export type ManagedKeyInfo = {
  provider: string;
  basePriceDescription: string;
  markupPercent: number;
};

type EnvSetup = {
  isOpen: boolean;
  workflowId: string;
  env: Record<string, string>;
  managedAvailable: Record<string, ManagedKeyInfo>;
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
    ): Promise<{
      missing: Record<string, string>;
      managedAvailable: Record<string, ManagedKeyInfo>;
    } | null> => {
      if (!workflowId) return null;
      try {
        const res = await fetchAPI(
          `/api/workflow/user-settings/check-missing?workflowId=${encodeURIComponent(workflowId)}`,
        );
        if (res.ok) {
          const { missing, managedAvailable } = await res.json();
          if (missing && Object.keys(missing).length > 0) {
            return { missing, managedAvailable: managedAvailable ?? {} };
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
    (
      workflowId: string,
      env: Record<string, string>,
      managedAvailable?: Record<string, ManagedKeyInfo>,
    ) => {
      setEnvSetup({
        isOpen: true,
        workflowId,
        env,
        managedAvailable: managedAvailable ?? {},
      });
    },
    [],
  );

  const closeEnvSetup = useCallback(() => {
    setEnvSetup(null);
  }, []);

  return { envSetup, checkMissingEnvs, openEnvSetup, closeEnvSetup };
}
