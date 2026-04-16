import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { useAuth } from "@/lib/hooks/use-auth";
import useSWR from "swr";

const INVITE_CODE_STORAGE_KEY = "agent-chat:invite-code";

/**
 * Returns the invite code to submit to the backend: the `inviteCode` URL
 * param if present (also persisted for subsequent navigations), otherwise
 * whatever was previously accepted and stored.
 */
function getPendingInviteCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(
      "inviteCode",
    );
    if (fromUrl) return fromUrl;
    return window.localStorage.getItem(INVITE_CODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useAgentAccess() {
  const { session } = useAuth();
  const inviteCode = typeof window !== "undefined" ? getPendingInviteCode() : null;

  const key = session
    ? `/api/billing/agent-access${inviteCode ? `?inviteCode=${encodeURIComponent(inviteCode)}` : ""}`
    : null;

  const { data, isLoading } = useSWR(
    key,
    async (url: string) => {
      const res = await fetchAPI(url);
      if (!res.ok) return { allowed: false };
      const body = (await res.json()) as {
        allowed: boolean;
        viaInviteCode?: boolean;
      };
      // Persist the code only after the backend confirms it. This keeps the
      // list of valid codes entirely on the server.
      if (body.allowed && body.viaInviteCode && inviteCode) {
        try {
          window.localStorage.setItem(INVITE_CODE_STORAGE_KEY, inviteCode);
        } catch {
          // ignore storage errors
        }
      }
      return body;
    },
    { revalidateOnFocus: false },
  );

  return {
    allowed: data?.allowed ?? false,
    isLoading: session ? isLoading : false,
  };
}
