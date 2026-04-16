import { fetchAPI } from "@/lib/pulse-editor-website/backend";

/**
 * SWR-compatible fetcher that routes through fetchAPI so requests
 * hit the correct backend (NEXT_PUBLIC_BACKEND_URL) instead of
 * the client-app origin.
 */
export async function workflowSettingsFetcher(
  url: string,
): Promise<Record<string, string>> {
  const response = await fetchAPI(url, { method: "GET" });
  if (!response.ok) return {};
  const { settings } = await response.json();
  return (settings as Record<string, string>) ?? {};
}

export async function getWorkflowSettings(
  workflowId: string,
): Promise<Record<string, string>> {
  return workflowSettingsFetcher(
    `/api/workflow/user-settings/get?workflowId=${encodeURIComponent(workflowId)}`,
  );
}

export async function setWorkflowSetting(
  workflowId: string,
  key: string,
  value: string,
  isSecret: boolean,
): Promise<void> {
  const response = await fetchAPI("/api/workflow/user-settings/set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId, key, value, isSecret }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save setting: ${response.status}`);
  }
}

export async function deleteWorkflowSetting(
  workflowId: string,
  key: string,
): Promise<void> {
  const response = await fetchAPI("/api/workflow/user-settings/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId, key }),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete setting: ${response.status}`);
  }
}
