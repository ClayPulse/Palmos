import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { useAuth } from "@/lib/hooks/use-auth";
import useSWR from "swr";

export function useAgentAccess() {
  const { session } = useAuth();

  const { data, isLoading } = useSWR(
    session ? "/api/billing/agent-access" : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      if (!res.ok) return { allowed: false };
      return res.json() as Promise<{ allowed: boolean }>;
    },
    { revalidateOnFocus: false },
  );

  return {
    allowed: data?.allowed ?? false,
    isLoading: session ? isLoading : false,
  };
}
