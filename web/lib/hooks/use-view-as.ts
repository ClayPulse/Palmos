"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useSWRConfig } from "swr";
import { fetchAPI } from "../pulse-editor-website/backend";
import {
  clearViewAs,
  getViewAsUserId,
  getViewAsUserName,
  setViewAs,
  subscribeViewAs,
} from "../view-as";
import useSWR from "swr";

type AdminUser = { id: string; name: string | null; email: string | null };

export function useViewAs() {
  const viewAsUserId = useSyncExternalStore(
    subscribeViewAs,
    getViewAsUserId,
    () => null,
  );
  const viewAsUserName = useSyncExternalStore(
    subscribeViewAs,
    getViewAsUserName,
    () => null,
  );

  const { mutate } = useSWRConfig();

  const switchToUser = useCallback(
    (userId: string, userName: string) => {
      setViewAs(userId, userName);
      // Revalidate all SWR caches so data reflects the new user
      mutate(() => true, undefined, { revalidate: true });
    },
    [mutate],
  );

  const exitViewAs = useCallback(() => {
    clearViewAs();
    mutate(() => true, undefined, { revalidate: true });
  }, [mutate]);

  return { viewAsUserId, viewAsUserName, switchToUser, exitViewAs };
}

export function useAdminUsers(isAdmin: boolean) {
  const { data: users, isLoading } = useSWR<AdminUser[]>(
    isAdmin ? "/api/admin/users" : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      if (!res.ok) return [];
      return res.json();
    },
  );

  return { users: users ?? [], isLoading };
}
