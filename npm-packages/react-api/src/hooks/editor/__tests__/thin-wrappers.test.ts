import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useLoading from "../use-loading";
import useOpenLink from "../use-open-link";
import useOpenApp from "../use-open-app";
import { useArtifact } from "../use-artifact";
import useEditorEnv from "../use-editor-env";
import useMic from "../use-mic";
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
    EditorLoadingApp: "editor-loading-app",
    EditorOpenLink: "editor-open-link",
    EditorOpenApp: "editor-open-app",
    EditorArtifactUpdate: "editor-artifact-update",
    EditorGetEnv: "editor-get-env",
  },
}));

describe("useLoading", () => {
  beforeEach(() => resetMocks());

  it("should return toggleLoading and isReady", () => {
    const { result } = renderHook(() => useLoading());
    expect(result.current.isReady).toBe(true);
    expect(typeof result.current.toggleLoading).toBe("function");
  });

  it("should send loading state on toggle", () => {
    const { result } = renderHook(() => useLoading());

    act(() => {
      result.current.toggleLoading(false);
    });

    expect(mockSendMessage).toHaveBeenCalledWith("editor-loading-app", {
      isLoading: false,
    });
  });

});

describe("useOpenLink", () => {
  beforeEach(() => resetMocks());

  it("should send link via IMC", async () => {
    const { result } = renderHook(() => useOpenLink());

    await act(async () => {
      await result.current.openLink(new URL("https://example.com"));
    });

    expect(mockSendMessage).toHaveBeenCalledWith("editor-open-link", {
      url: "https://example.com/",
    });
  });

  it("should throw when not ready", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: null, isReady: false });
    const { result } = renderHook(() => useOpenLink());

    await expect(
      act(async () => {
        await result.current.openLink(new URL("https://example.com"));
      })
    ).rejects.toThrow("IMC is not ready");
  });
});

describe("useOpenApp", () => {
  beforeEach(() => resetMocks());

  it("should send open app request via IMC", async () => {
    const { result } = renderHook(() => useOpenApp());

    await act(async () => {
      await result.current.openApp("app-123", "canvas", "1.0.0");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("editor-open-app", {
      appId: "app-123",
      version: "1.0.0",
      location: "canvas",
    });
  });

  it("should throw when not ready", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: null, isReady: false });
    const { result } = renderHook(() => useOpenApp());

    await expect(
      act(async () => {
        await result.current.openApp("app-123", "canvas");
      })
    ).rejects.toThrow("IMC is not ready");
  });
});

describe("useArtifact", () => {
  beforeEach(() => resetMocks());

  it("should send artifact via IMC", () => {
    const { result } = renderHook(() => useArtifact());
    const artifact = { type: "text" as any, content: "hello" };

    act(() => {
      result.current.sendArtifact(artifact as any);
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-artifact-update",
      artifact
    );
  });

  it("should not send when not ready", () => {
    mockUseIMC.mockReturnValueOnce({ imc: null, isReady: false });
    const { result } = renderHook(() => useArtifact());

    act(() => {
      result.current.sendArtifact({} as any);
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

describe("useEditorEnv", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue({ API_KEY: "test" });
  });

  it("should request env on ready", () => {
    renderHook(() => useEditorEnv());
    expect(mockSendMessage).toHaveBeenCalledWith("editor-get-env");
  });

  it("should return isReady and envs", () => {
    const { result } = renderHook(() => useEditorEnv());
    expect(result.current.isReady).toBe(true);
    expect(result.current.envs).toBeDefined();
  });

});

describe("useMic", () => {
  it("should throw not implemented error", () => {
    expect(() => {
      renderHook(() => useMic());
    }).toThrow("not implemented yet");
  });
});
