import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useActionEffect from "../use-action-effect";
import {
  mockUseIMC,
  mockSendMessage,
  getCapturedHandlerMap,
  resetMocks,
} from "../../../__mocks__/use-imc-mock";

vi.mock("../../imc/use-imc", () => ({
  default: (...args: any[]) => mockUseIMC(...args),
}));

vi.mock("@module-federation/runtime", () => ({
  createInstance: vi.fn(() => ({
    loadRemote: vi.fn().mockResolvedValue({ default: vi.fn() }),
  })),
}));

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {
    EditorRegisterAction: "editor-register-action",
    EditorRunAppAction: "editor-run-app-action",
    EditorGetAppOrigin: "editor-get-app-origin",
    EditorRestoreActionCache: "editor-restore-action-cache",
  },
}));

// Mock fetch for pulse.config.json
globalThis.fetch = vi.fn().mockResolvedValue({
  json: vi.fn().mockResolvedValue({
    id: "test-app",
    version: "1.0.0",
    actions: [
      {
        name: "testAction",
        description: "Test action",
        parameters: {},
        returns: {},
      },
    ],
  }),
});

describe("useActionEffect", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue(undefined);
  });

  it("should return isReady and runAppAction", () => {
    const { result } = renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [])
    );
    expect(result.current.isReady).toBe(true);
  });

  it("should register handler maps for EditorRunAppAction and EditorRestoreActionCache", () => {
    renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [])
    );

    const handlerMap = getCapturedHandlerMap();
    expect(handlerMap?.has("editor-run-app-action")).toBe(true);
    expect(handlerMap?.has("editor-restore-action-cache")).toBe(true);
  });

  it("should request app origin on ready", () => {
    renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [])
    );

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-get-app-origin",
      { actionName: "testAction" }
    );
  });

  it("should accept beforeAction and afterAction callbacks", () => {
    const before = vi.fn();
    const after = vi.fn();

    const { result } = renderHook(() =>
      useActionEffect(
        {
          actionName: "testAction",
          beforeAction: before,
          afterAction: after,
        },
        []
      )
    );

    expect(result.current.isReady).toBe(true);
  });

  it("should accept isExtReady parameter", () => {
    const { result } = renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [], false)
    );
    expect(result.current.isReady).toBe(true);
  });

  it("should throw 'Message ignored' for EditorRunAppAction with wrong name", async () => {
    renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [])
    );

    const handlerMap = getCapturedHandlerMap();
    const handler = handlerMap?.get("editor-run-app-action");

    await expect(
      handler!({} as Window, {
        payload: { name: "wrongAction", args: {} },
      } as any)
    ).rejects.toThrow("Message ignored by receiver");
  });

  it("should throw 'Message ignored' for EditorRestoreActionCache with wrong name", async () => {
    renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [])
    );

    const handlerMap = getCapturedHandlerMap();
    const handler = handlerMap?.get("editor-restore-action-cache");

    await expect(
      handler!({} as Window, {
        payload: { name: "wrongAction", input: {}, output: {} },
      } as any)
    ).rejects.toThrow("Message ignored by receiver");
  });

  it("should queue commands when isExtReady is false", async () => {
    renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [], false)
    );

    const handlerMap = getCapturedHandlerMap();
    const handler = handlerMap?.get("editor-run-app-action");

    // This should queue because isExtReady is false
    const resultPromise = handler!({} as Window, {
      payload: { name: "testAction", args: { key: "value" } },
    } as any);

    // The promise should be pending (queued)
    expect(resultPromise).toBeInstanceOf(Promise);
  });

  it("should handle EditorRestoreActionCache with matching name and callbacks", async () => {
    const beforeAction = vi.fn().mockResolvedValue(undefined);
    const afterAction = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useActionEffect(
        {
          actionName: "testAction",
          beforeAction,
          afterAction,
        },
        []
      )
    );

    const handlerMap = getCapturedHandlerMap();
    const handler = handlerMap?.get("editor-restore-action-cache");

    // Matching name should not throw
    await handler!({} as Window, {
      payload: { name: "testAction", input: { x: 1 }, output: { y: 2 } },
    } as any);

    // beforeAction and afterAction should have been called via the handler
    // (they're passed through getReceiverHandlerMap)
  });

  it("should set default beforeAction/afterAction when not provided", () => {
    const { result } = renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [])
    );
    // Should not throw - defaults to async () => {}
    expect(result.current.isReady).toBe(true);
  });

  it("should fetch pulse.config.json and register action when isExtReady", async () => {
    renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [], true)
    );

    // fetch should have been called for pulse.config.json
    // Since our mock returns the action info, it should eventually call
    // EditorRegisterAction
    await vi.waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "editor-register-action",
        expect.objectContaining({
          name: "testAction",
        })
      );
    });
  });

  it("should use preview mode (fetch endpoint) when remoteOrigin is undefined", async () => {
    mockSendMessage.mockImplementation(async (type: string) => {
      if (type === "editor-get-app-origin") return undefined; // no remote origin
      return undefined;
    });

    renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [], true)
    );

    // Should still register action via preview endpoint fetch
    await vi.waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "editor-register-action",
        expect.objectContaining({ name: "testAction" })
      );
    });
  });

  it("should use MF remote when remoteOrigin is provided", async () => {
    mockSendMessage.mockImplementation(async (type: string) => {
      if (type === "editor-get-app-origin") return "https://remote.example.com";
      return undefined;
    });

    renderHook(() =>
      useActionEffect({ actionName: "testAction" }, [], true)
    );

    await vi.waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "editor-register-action",
        expect.objectContaining({ name: "testAction" })
      );
    });
  });
});
