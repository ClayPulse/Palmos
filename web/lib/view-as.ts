/**
 * Global (non-React) state for admin "View As" feature.
 * Stored outside React so fetchAPI can access it without context.
 */

let viewAsUserId: string | null = null;
let viewAsUserName: string | null = null;

const listeners = new Set<() => void>();

export function getViewAsUserId() {
  return viewAsUserId;
}

export function getViewAsUserName() {
  return viewAsUserName;
}

export function setViewAs(userId: string | null, userName: string | null) {
  viewAsUserId = userId;
  viewAsUserName = userName;
  listeners.forEach((fn) => fn());
}

export function clearViewAs() {
  setViewAs(null, null);
}

export function subscribeViewAs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
