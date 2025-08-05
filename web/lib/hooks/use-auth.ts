import { useContext } from "react";
import { Session } from "../types";
import useSWR from "swr";
import { EditorContext } from "@/components/providers/editor-context-provider";

const authUrl = "https://pulse-editor.com";
// const authUrl = "https://localhost:8080";

export function useAuth() {
  // --- Auth ---
  const { data: session, isLoading } = useSWR<Session | undefined>(
    `${authUrl}/api/auth/session`,
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

  const editorContext = useContext(EditorContext);

  // Open a sign-in page if the user is not signed in.
  async function signIn() {
    if (session) {
      return;
    }

    const url = new URL(`${authUrl}/api/auth/signin`);
    url.searchParams.set("callbackUrl", window.location.href);

    window.location.href = url.toString();
  }

  // Open a sign-out page if the user is signed in.
  async function signOut() {
    if (!session) {
      return;
    }

    const url = new URL(`${authUrl}/api/auth/signout`);
    url.searchParams.set("callbackUrl", window.location.href);
    window.location.href = url.toString();
  }

  async function toggleOfflineMode() {
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        isUsingOfflineMode: !prev.isUsingOfflineMode,
      };
    });
  }

  return {
    session,
    isLoading,
    isUsingOfflineMode: editorContext?.editorStates.isUsingOfflineMode,
    signIn,
    signOut,
    toggleOfflineMode,
  };
}
