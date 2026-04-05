import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useAppSettings from "../use-app-settings";
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
    EditorGetAppSettings: "editor-get-app-settings",
    EditorSetAppSettings: "editor-set-app-settings",
    EditorDeleteAppSetting: "editor-delete-app-setting",
  },
}));

describe("useAppSettings", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue({ theme: "dark" });
  });

  it("should fetch settings on ready", async () => {
    const { result } = renderHook(() => useAppSettings("test-app"));

    await act(async () => {
      // Wait for effects
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-get-app-settings",
      { appId: "test-app" }
    );
  });

  it("should update settings", async () => {
    mockSendMessage.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAppSettings("test-app"));

    await act(async () => {
      await result.current.updateSettings({ color: "blue" });
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-set-app-settings",
      { appId: "test-app", settings: { color: "blue" } }
    );
  });

  it("should delete setting", async () => {
    mockSendMessage.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAppSettings("test-app"));

    await act(async () => {
      await result.current.deleteSetting("theme");
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-delete-app-setting",
      { appId: "test-app", key: "theme" }
    );
  });

  it("should return isReady and isLoaded", () => {
    const { result } = renderHook(() => useAppSettings("test-app"));
    expect(result.current.isReady).toBe(true);
  });

});
