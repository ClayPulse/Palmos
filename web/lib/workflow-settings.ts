import { fetchAPI } from "@/lib/pulse-editor-website/backend";

export async function getWorkflowSettings(
  workflowId: string,
): Promise<Record<string, string>> {
  const response = await fetchAPI(
    `/api/workflow/user-settings/get?workflowId=${encodeURIComponent(workflowId)}`,
    { method: "GET" },
  );
  if (!response.ok) return {};
  const { settings } = await response.json();
  return (settings as Record<string, string>) ?? {};
}

export async function setWorkflowSetting(
  workflowId: string,
  key: string,
  value: string,
  isSecret: boolean,
): Promise<void> {
  await fetchAPI("/api/workflow/user-settings/set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId, key, value, isSecret }),
  });
}

export async function deleteWorkflowSetting(
  workflowId: string,
  key: string,
): Promise<void> {
  await fetchAPI("/api/workflow/user-settings/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId, key }),
  });
}
