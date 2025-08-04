import { Session } from "../types";
import useSWR from "swr";

export function useAuth() {
  // --- Auth ---
  const { data: session, isLoading } = useSWR<Session | undefined>(
    "https://pulse-editor.com/api/auth/session",
    async (url: string) => {
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch session data");
      }
      const data = await res.json();
      // return undefined if data's content is empty
      if (Object.keys(data).length === 0) {
        return undefined;
      }
      return data as Session;
    },
  );

  // Open a sign-in page if the user is not signed in.
  async function signIn() {
    if (session) {
      return;
    }

    const url = new URL("https://pulse-editor.com/api/auth/signin");
    url.searchParams.set("callbackUrl", window.location.href);
    window.location.href = url.toString();
  }

  // Open a sign-out page if the user is signed in.
  async function signOut() {
    if (!session) {
      return;
    }

    const url = new URL("https://pulse-editor.com/api/auth/signout");
    url.searchParams.set("callbackUrl", window.location.href);
    window.location.href = url.toString();
  }

  return {
    session,
    isLoading,
    signIn,
    signOut,
  };
}
