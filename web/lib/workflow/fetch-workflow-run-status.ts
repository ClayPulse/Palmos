const inflightRequests = new Map<string, Promise<any>>();

/**
 * Fetch workflow run status for a given taskId.
 * Deduplicates concurrent requests for the same taskId — if a fetch is
 * already in-flight, the existing promise is returned instead of firing
 * another request.
 */
export async function fetchWorkflowRunStatus(
  backendUrl: string,
  taskId: string,
): Promise<{ ok: true; data: any } | { ok: false }> {
  const key = `${backendUrl}::${taskId}`;

  const existing = inflightRequests.get(key);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    try {
      const res = await fetch(
        `${backendUrl}/api/workflow/run/status?taskId=${taskId}`,
        { credentials: "include" },
      );
      if (!res.ok) return { ok: false as const };
      const data = await res.json();
      return { ok: true as const, data };
    } catch {
      return { ok: false as const };
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, request);
  return request;
}
