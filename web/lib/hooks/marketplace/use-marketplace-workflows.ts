import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Workflow } from "@/lib/types";
import useSWR from "swr";

export function useMarketplaceWorkflows(
  category: "All" | "Published by Me",
) {
  const { data: marketplaceWorkflows, isLoading } = useSWR<Workflow[]>(
    category === "All" || category === "Published by Me"
      ? `/api/workflow/list${category === "Published by Me" ? "?published=true" : ""}`
      : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      const body = await res.json();

      const fetchedWorkflows: Workflow[] = body;
      return fetchedWorkflows;
    },
  );

  return {
    workflows: marketplaceWorkflows,
    isLoading,
  };
}
