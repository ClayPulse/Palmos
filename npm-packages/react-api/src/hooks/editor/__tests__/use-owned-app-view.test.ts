import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useOwnedAppView from "../use-owned-app-view";
import {
  mockUseIMC,
  mockSendMessage,
  resetMocks,
} from "../../../__mocks__/use-imc-mock";

vi.mock("../../imc/use-imc", () => ({
  default: (...args: any[]) => mockUseIMC(...args),
}));

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {
    EditorAppUseOwnedApp: "editor-app-use-owned-app",
  },
}));

describe("useOwnedAppView", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue("action-result");
  });

  it("should return isReady and runAppAction", () => {
    const { result } = renderHook(() => useOwnedAppView());
    expect(result.current.isReady).toBe(true);
    expect(typeof result.current.runAppAction).toBe("function");
  });

  it("should send action via IMC", async () => {
    const { result } = renderHook(() => useOwnedAppView());

    const viewModel = {
      viewId: "view-1",
      appConfig: {
        id: "app-1",
        actions: [{ name: "doSomething" }],
      },
    };

    let res: any;
    await act(async () => {
      res = await result.current.runAppAction(
        viewModel as any,
        "doSomething",
        { key: "value" }
      );
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-app-use-owned-app",
      { viewId: "view-1", actionName: "doSomething", args: { key: "value" } }
    );
    expect(res).toBe("action-result");
  });

  it("should throw when action not found", async () => {
    const { result } = renderHook(() => useOwnedAppView());

    const viewModel = {
      viewId: "view-1",
      appConfig: { id: "app-1", actions: [] },
    };

    await expect(
      act(async () => {
        await result.current.runAppAction(viewModel as any, "missing", {});
      })
    ).rejects.toThrow("Action missing not found");
  });

  it("should return undefined when not ready", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: null, isReady: false });
    const { result } = renderHook(() => useOwnedAppView());

    let res: any;
    await act(async () => {
      res = await result.current.runAppAction(
        { viewId: "v", appConfig: { id: "a", actions: [] } } as any,
        "test",
        {}
      );
    });

    expect(res).toBeUndefined();
  });
});
