import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Automation, AutomationRun } from "@/lib/types";
import useSWR from "swr";

export function useAutomations(options?: {
  status?: string;
  triggerType?: string;
  /** Filter by project ID. Pass "none" for automations without a project. */
  projectId?: string;
  /** Auto-refresh interval in ms. Set to 0 to disable. Default: 0 */
  refreshInterval?: number;
}) {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.triggerType) params.set("triggerType", options.triggerType);
  if (options?.projectId) params.set("projectId", options.projectId);
  const query = params.toString();
  const url = `/api/automation${query ? `?${query}` : ""}`;

  const {
    data: automations,
    isLoading,
    mutate,
  } = useSWR<Automation[]>(url, async (u: string) => {
    const res = await fetchAPI(u);
    return res.json();
  }, {
    refreshInterval: options?.refreshInterval ?? 0,
    revalidateOnFocus: false,
  });

  async function createAutomation(
    data: Omit<Automation, "id" | "userId" | "enabled" | "status" | "consecutiveFailures" | "createdAt" | "updatedAt">,
  ) {
    const res = await fetchAPI("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const automation = await res.json();
    await mutate();
    return automation as Automation;
  }

  async function updateAutomation(id: string, data: Partial<Automation>) {
    const res = await fetchAPI(`/api/automation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const automation = await res.json();
    await mutate();
    return automation as Automation;
  }

  async function deleteAutomation(id: string) {
    const res = await fetchAPI(`/api/automation/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    await mutate();
  }

  async function triggerAutomation(
    id: string,
    triggerSource: "manual" | "agentic",
    inputArgs?: Record<string, any>,
  ) {
    const res = await fetchAPI(`/api/automation/${id}/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerSource, inputArgs }),
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    await mutate();
    return result as { taskId: string; runId: string };
  }

  return {
    automations: automations ?? [],
    isLoading,
    mutate,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    triggerAutomation,
  };
}

export function useAutomationRuns(automationId: string | null, limit = 20, offset = 0) {
  const url = automationId
    ? `/api/automation/${automationId}/runs?limit=${limit}&offset=${offset}`
    : null;

  const { data, isLoading, mutate } = useSWR<{ runs: AutomationRun[]; total: number }>(
    url,
    async (u: string) => {
      const res = await fetchAPI(u);
      return res.json();
    },
    { refreshInterval: 10000 },
  );

  return {
    runs: data?.runs ?? [],
    total: data?.total ?? 0,
    isLoading,
    mutate,
  };
}
