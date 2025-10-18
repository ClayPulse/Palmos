"use client";

import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext } from "react";
import useSWR from "swr";
import { PlatformEnum } from "../enums";
import { getPlatform } from "../platform-api/platform-checker";
import { fetchAPI, getAPIUrl } from "../pulse-editor-website/backend";
import { CreditBalance, Session, Subscription } from "../types";

export function useAuth() {
  const editorContext = useContext(EditorContext);
  // --- Auth ---
  const { data: session, isLoading } = useSWR<Session | undefined>(
    !editorContext?.editorStates.isSigningIn ? `/api/auth/session` : null,
    async (url: string) => {
      const res = await fetchAPI(url);
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

  // --- Subscription ---
  const { data: subscription } = useSWR<Subscription | undefined>(
    session ? `/api/subscription` : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      if (!res.ok) {
        throw new Error("Failed to fetch subscription data");
      }
      const data = await res.json();
      return data as Subscription;
    },
  );

  // --- Credits ---
  const { data: creditBalance } = useSWR<CreditBalance | undefined>(
    session ? `/api/credits` : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      if (!res.ok) {
        throw new Error("Failed to fetch credit balance");
      }
      const data = await res.json();
      return data as CreditBalance;
    },
  );

  // Open a sign-in page if the user is not signed in.
  async function signIn() {
    if (session) {
      return;
    }

    if (getPlatform() === PlatformEnum.Electron) {
      // In Electron, open the sign-in page in the system browser.
      // TODO: move this to the platform API layer
      // @ts-expect-error window.electronAPI is exposed by the Electron main process
      window.electronAPI.login();
    } else {
      const url = getAPIUrl(`/api/auth/signin`);
      url.searchParams.set("callbackUrl", window.location.href);
      window.location.href = url.toString();
    }
  }

  // Open a sign-out page if the user is signed in.
  async function signOut() {
    if (!session) {
      return;
    }

    if (getPlatform() === PlatformEnum.Electron) {
      // In Electron, open the sign-out page in the system browser.
      // TODO: move this to the platform API layer
      // @ts-expect-error window.electronAPI is exposed by the Electron main process
      window.electronAPI.logout();
    } else {
      const url = getAPIUrl(`/api/auth/signout`);
      url.searchParams.set("callbackUrl", window.location.href);
      window.location.href = url.toString();
    }
  }

  return {
    session,
    subscription,
    creditBalance,
    isLoading,
    signIn,
    signOut,
  };
}
