"use client";

import { useContext } from "react";
import { Session } from "../types";
import useSWR from "swr";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { fetchAPI, getAPIUrl } from "../pulse-editor-website/backend";

export function useAuth() {
  const editorContext = useContext(EditorContext);
  // --- Auth ---
  const { data: session, isLoading } = useSWR<Session | undefined>(
    !editorContext?.editorStates.isUsingOfflineMode
      ? `/api/auth/session`
      : null,
    async (url: string) => {
      const res = await fetchAPI(url, {
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

    const url = getAPIUrl(`/api/auth/signin`);
    url.searchParams.set("callbackUrl", window.location.href);

    window.location.href = url.toString();
  }

  // Open a sign-out page if the user is signed in.
  async function signOut() {
    if (!session) {
      return;
    }

    const url = getAPIUrl(`/api/auth/signout`);
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
