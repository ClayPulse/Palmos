import { fetchAPI } from "@/lib/pulse-editor-website/backend";

const inflightRequests = new Map<string, Promise<any>>();

/**
 * Fetch workflow run status for a given taskId.
 * Deduplicates concurrent requests for the same taskId — if a fetch is
 * already in-flight, the existing promise is returned instead of firing
 * another request.
 */
export async function fetchWorkflowRunStatus(
  taskId: string,
): Promise<{ ok: true; data: any } | { ok: false }> {
  const existing = inflightRequests.get(taskId);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    try {
      const res = await fetchAPI(
        `/api/workflow/run/status?taskId=${taskId}`,
      );
      if (!res.ok) return { ok: false as const };
      const data = await res.json();
      return { ok: true as const, data };
    } catch {
      return { ok: false as const };
    } finally {
      inflightRequests.delete(taskId);
    }
  })();

  inflightRequests.set(taskId, request);
  return request;
}
