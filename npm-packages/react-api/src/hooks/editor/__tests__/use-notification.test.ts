import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useNotification from "../use-notification";
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
    EditorShowNotification: "editor-show-notification",
  },
  NotificationTypeEnum: {
    Success: "success",
    Error: "error",
  },
}));

describe("useNotification", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("should return isReady and openNotification", () => {
    const { result } = renderHook(() => useNotification());
    expect(result.current.isReady).toBe(true);
    expect(typeof result.current.openNotification).toBe("function");
  });

  it("should send notification via IMC", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.openNotification("Test message", "success" as any);
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-show-notification",
      { text: "Test message", type: "success" }
    );
  });

  it("should not send when not ready", () => {
    mockUseIMC.mockReturnValueOnce({ imc: null, isReady: false });
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.openNotification("Test", "success" as any);
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
