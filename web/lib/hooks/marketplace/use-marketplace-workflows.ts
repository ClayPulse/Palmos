import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Workflow } from "@/lib/types";
import useSWR from "swr";

export function useMarketplaceWorkflows(
  category: "All" | "Published by Me" | "My Workflows",
) {
  function getUrl() {
    switch (category) {
      case "All":
        return "/api/workflow/list";
      case "Published by Me":
        return "/api/workflow/list?published=true";
      case "My Workflows":
        return "/api/user-workflows/list";
      default:
        return null;
    }
  }

  const { data: marketplaceWorkflows, isLoading } = useSWR<Workflow[]>(
    getUrl(),
    async (url: string) => {
      const res = await fetchAPI(url);
      const body = await res.json();
      return body as Workflow[];
    },
  );

  // Deduplicate by name, keeping only the latest version (API returns newest first)
  const deduped = marketplaceWorkflows
    ? Array.from(
        new Map(
          marketplaceWorkflows.map((wf) => [wf.name, wf]),
        ).values(),
      )
    : undefined;

  return {
    workflows: deduped,
    isLoading,
  };
}
