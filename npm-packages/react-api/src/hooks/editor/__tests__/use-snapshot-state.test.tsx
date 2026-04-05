import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import useSnapshotState from "../use-snapshot-state";
import { SnapshotContext, SnapshotContextType } from "../../../providers/snapshot-provider";

function createWrapper(initialStates: { [key: string]: any } = {}) {
  const states = { ...initialStates };
  const setStates = vi.fn((fn: any) => {
    if (typeof fn === "function") {
      Object.assign(states, fn(states));
    } else {
      Object.assign(states, fn);
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SnapshotContext.Provider value={{ states, setStates }}>
      {children}
    </SnapshotContext.Provider>
  );

  return { wrapper, states, setStates };
}

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {},
}));

describe("useSnapshotState", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should return initial value when no snapshot exists", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSnapshotState("counter", 0),
      { wrapper }
    );

    expect(result.current[0]).toBe(0);
  });

  it("should restore value from snapshot context", () => {
    const { wrapper } = createWrapper({ counter: 42 });
    const { result } = renderHook(
      () => useSnapshotState("counter", 0),
      { wrapper }
    );

    expect(result.current[0]).toBe(42);
  });

  it("should update state via setSnapshotState", async () => {
    const { wrapper, setStates } = createWrapper();
    const { result } = renderHook(
      () => useSnapshotState("counter", 0),
      { wrapper }
    );

    await act(async () => {
      result.current[1](10);
      // Allow microtask to complete for setStates
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current[0]).toBe(10);
    expect(setStates).toHaveBeenCalled();
  });

  it("should support function updater", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSnapshotState("counter", 5),
      { wrapper }
    );

    await act(async () => {
      result.current[1]((prev: number) => prev + 1);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current[0]).toBe(6);
  });

  it("should throw without SnapshotProvider", () => {
    expect(() => {
      renderHook(() => useSnapshotState("key", "value"));
    }).toThrow("useSnapShotState must be used within a SnapshotProvider");
  });
});
