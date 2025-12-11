"use client";

import { EditorContext } from "@/components/providers/editor-context-provider";
import { Browser } from "@capacitor/browser";
import { CapacitorCookies } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { useContext, useEffect } from "react";
import useSWR from "swr";
import { PlatformEnum } from "../enums";
import { getPlatform } from "../platform-api/platform-checker";
import { fetchAPI, getAPIUrl } from "../pulse-editor-website/backend";
import { CreditBalance, Session, Subscription } from "../types";
import useRouter from "./use-router";

export function useAuth() {
  const editorContext = useContext(EditorContext);

  // --- Auth ---
  const {
    data: session,
    isLoading,
    mutate,
  } = useSWR<Session | undefined>(
    !editorContext?.editorStates.isSigningIn ? `/api/auth/session` : null,
    async (url: string) => {
      try {
        const res = await fetchAPI(url);
        if (!res.ok) {
          console.error("Failed to fetch session data");
        }
        const data = await res.json();
        // return undefined if data's content is empty
        if (Object.keys(data).length === 0) {
          return undefined;
        }
        return data as Session;
      } catch (error) {
        // noop
      }
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

  const router = useRouter();

  useEffect(() => {
    async function refreshSession() {
      if (editorContext?.editorStates.isRefreshSession) {
        const token = await Preferences.get({
          key: "pulse-editor.session-token",
        });

        /*           
          Sometimes other hooks using useSWR are fired right after retuning from deep linking 
          before session is refreshed (triggered by window re-focus), causing cookies to be 
          set again between when it is removed (if removed in deep link handler) and when 
          session is refreshed.

          So a better approach is to clear cookies right here before refreshing session, but 
          possibly after other hooks are fired.
        */
        if (!token.value) {
          await CapacitorCookies.deleteCookie({
            key: "pulse-editor.session-token",
            url: process.env.NEXT_PUBLIC_BACKEND_URL,
          });
        }

        await mutate();
        editorContext.setEditorStates((prev) => ({
          ...prev,
          isRefreshSession: false,
        }));
      }
    }

    refreshSession();
  }, [editorContext?.editorStates.isRefreshSession]);

  // Set is login status in Preferences in Capacitor if logged in
  useEffect(() => {
    if (getPlatform() === PlatformEnum.Capacitor) {
      const isLoggedIn = session !== undefined;
      Preferences.set({
        key: "pulse-editor.is-logged-in",
        value: isLoggedIn ? "true" : "false",
      });
    }
  }, [session]);

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
    } else if (getPlatform() === PlatformEnum.Capacitor) {
      // In Capacitor, open the sign-in page in the system browser.
      const url = getAPIUrl(`/api/auth/signin`);
      // Set the callback URL to the deeplink URL that Capacitor can handle.
      url.searchParams.set(
        "callbackUrl",
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/mobile",
      );

      await Browser.open({ url: url.toString() });
    } else {
      const url = getAPIUrl(`/api/auth/signin`);
      url.searchParams.set("callbackUrl", window.location.href);
      router.replace(url.toString());
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
    } else if (getPlatform() === PlatformEnum.Capacitor) {
      // In Capacitor, open the sign-out page in the system browser.
      const url = getAPIUrl(`/api/auth/signout`);
      // Set the callback URL to the deeplink URL that Capacitor can handle.
      url.searchParams.set(
        "callbackUrl",
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/mobile",
      );
      await Browser.open({ url: url.toString() });
    } else {
      const url = getAPIUrl(`/api/auth/signout`);
      url.searchParams.set("callbackUrl", window.location.href);
      router.replace(url.toString());
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
