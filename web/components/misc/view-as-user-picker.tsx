"use client";

import { useAdminUsers, useViewAs } from "@/lib/hooks/use-view-as";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/react";
import { useState } from "react";
import Icon from "./icon";

/**
 * Modal for picking a user to view-as. Rendered outside the dropdown
 * so it doesn't unmount when the dropdown closes.
 */
export function ViewAsModal({
  isOpen,
  onClose,
  isAdmin,
}: {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}) {
  const { users, isLoading } = useAdminUsers(isAdmin && isOpen);
  const { switchToUser } = useViewAs();
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Switch to User View</ModalHeader>
        <ModalBody className="pb-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-default-300 bg-default-100 px-3 py-2 text-sm outline-none focus:border-primary dark:border-white/15 dark:bg-white/5"
          />
          {isLoading ? (
            <p className="py-4 text-center text-sm text-default-400">
              Loading users...
            </p>
          ) : (
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {filtered.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    switchToUser(user.id, user.name ?? user.email ?? user.id);
                    onClose();
                    setSearch("");
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-default-100 dark:hover:bg-white/8"
                >
                  <Icon
                    name="account_circle"
                    variant="round"
                    className="text-xl text-default-400"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {user.name ?? "Unnamed"}
                    </p>
                    <p className="truncate text-xs text-default-400">
                      {user.email}
                    </p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && !isLoading && (
                <p className="py-4 text-center text-sm text-default-400">
                  No users found
                </p>
              )}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export function ViewAsBanner() {
  const { viewAsUserId, viewAsUserName, exitViewAs } = useViewAs();

  if (!viewAsUserId) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-warning-100 px-4 py-1.5 text-xs font-medium text-warning-800 dark:bg-warning-500/15 dark:text-warning-300">
      <Icon name="visibility" className="text-sm" />
      <span>Viewing as: {viewAsUserName ?? viewAsUserId}</span>
      <button
        onClick={exitViewAs}
        className="rounded-md bg-warning-200 px-2 py-0.5 transition-colors hover:bg-warning-300 dark:bg-warning-500/25 dark:hover:bg-warning-500/40"
      >
        Exit
      </button>
    </div>
  );
}
