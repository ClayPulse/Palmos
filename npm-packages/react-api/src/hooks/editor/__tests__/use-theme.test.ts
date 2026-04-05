import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useTheme from "../use-theme";
import {
  mockUseIMC,
  mockSendMessage,
  getCapturedHandlerMap,
  resetMocks,
} from "../../../__mocks__/use-imc-mock";

vi.mock("../../imc/use-imc", () => ({
  default: (...args: any[]) => mockUseIMC(...args),
}));

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {
    EditorThemeUpdate: "editor-theme-update",
    EditorAppRequestTheme: "editor-app-request-theme",
  },
}));

describe("useTheme", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue("light");
  });

  it("should default to light theme", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("should request theme on ready", () => {
    renderHook(() => useTheme());
    expect(mockSendMessage).toHaveBeenCalledWith("editor-app-request-theme");
  });

  it("should register EditorThemeUpdate handler", () => {
    renderHook(() => useTheme());

    const handlerMap = getCapturedHandlerMap();
    expect(handlerMap?.has("editor-theme-update")).toBe(true);
  });

  it("should not request theme when not ready", () => {
    mockUseIMC.mockReturnValueOnce({ imc: null, isReady: false });
    renderHook(() => useTheme());
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
