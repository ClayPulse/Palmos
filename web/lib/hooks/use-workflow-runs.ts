import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { WorkflowRun } from "@/lib/types";
import useSWR from "swr";

export function useWorkflowRuns(
  workflowId: string | null,
  limit = 20,
  offset = 0,
) {
  const url = workflowId
    ? `/api/workflow/runs?workflowId=${workflowId}&limit=${limit}&offset=${offset}`
    : null;

  const { data, isLoading, mutate } = useSWR<{
    runs: WorkflowRun[];
    total: number;
  }>(
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
