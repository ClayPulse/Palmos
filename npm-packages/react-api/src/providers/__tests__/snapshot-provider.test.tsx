import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import SnapshotProvider, { SnapshotContext } from "../snapshot-provider";
import {
  mockUseIMC,
  getCapturedHandlerMap,
  resetMocks,
  mockImc,
} from "../../__mocks__/use-imc-mock";

vi.mock("../../hooks/imc/use-imc", () => ({
  default: (...args: any[]) => mockUseIMC(...args),
}));

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {
    EditorAppStateSnapshotRestore: "editor-app-state-snapshot-restore",
    EditorAppStateSnapshotSave: "editor-app-state-snapshot-save",
  },
}));

describe("SnapshotProvider", () => {
  beforeEach(() => {
    resetMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should provide context to children", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SnapshotProvider>{children}</SnapshotProvider>
    );

    const { result } = renderHook(
      () => React.useContext(SnapshotContext),
      { wrapper }
    );

    expect(result.current).toBeDefined();
    expect(result.current!.states).toEqual({});
    expect(typeof result.current!.setStates).toBe("function");
  });

  it("should handle restore snapshot handler", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SnapshotProvider>{children}</SnapshotProvider>
    );

    const { result } = renderHook(
      () => React.useContext(SnapshotContext),
      { wrapper }
    );

    const handlerMap = getCapturedHandlerMap();
    const restoreHandler = handlerMap?.get(
      "editor-app-state-snapshot-restore"
    );

    await act(async () => {
      await restoreHandler!({} as Window, {
        payload: { states: { count: 42 } },
      } as any);
    });

    expect(result.current!.states).toEqual({ count: 42 });
  });

  it("should handle save snapshot handler", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SnapshotProvider>{children}</SnapshotProvider>
    );

    renderHook(
      () => React.useContext(SnapshotContext),
      { wrapper }
    );

    const handlerMap = getCapturedHandlerMap();
    const saveHandler = handlerMap?.get(
      "editor-app-state-snapshot-save"
    );

    const savedStates = await saveHandler!({} as Window, {} as any);
    expect(savedStates).toEqual({ states: {} });
  });

  it("should update receiver handler map when states change", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SnapshotProvider>{children}</SnapshotProvider>
    );

    renderHook(
      () => React.useContext(SnapshotContext),
      { wrapper }
    );

    expect(mockImc.updateReceiverHandlerMap).toHaveBeenCalled();
  });
});
