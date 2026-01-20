import { v4 } from "uuid";

export function createAppViewId(appId: string) {
  return `${appId}-${v4()}`;
}

export function createCanvasViewId() {
  return `canvas-${v4()}`;
}
