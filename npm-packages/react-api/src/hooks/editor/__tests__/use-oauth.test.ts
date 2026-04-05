import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useOAuth from "../use-oauth";
import {
  mockUseIMC,
  mockSendMessage,
  resetMocks,
} from "../../../__mocks__/use-imc-mock";

// Mock useAppSettings
vi.mock("../use-app-settings", () => ({
  default: vi.fn(() => ({
    isReady: true,
    isLoaded: true,
    settings: {},
    refetch: vi.fn(),
    updateSettings: vi.fn(),
    deleteSetting: vi.fn(),
  })),
}));

vi.mock("../../imc/use-imc", () => ({
  default: (...args: any[]) => mockUseIMC(...args),
}));

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {
    EditorOAuthCheckStatus: "editor-oauth-check-status",
    EditorOAuthConnect: "editor-oauth-connect",
    EditorOAuthDisconnect: "editor-oauth-disconnect",
    EditorOAuthRefreshToken: "editor-oauth-refresh-token",
    EditorGetAppSettings: "editor-get-app-settings",
    EditorSetAppSettings: "editor-set-app-settings",
    EditorDeleteAppSetting: "editor-delete-app-setting",
  },
  OAuthStatusEnum: {
    Authenticated: "authenticated",
    Unauthenticated: "unauthenticated",
  },
}));

describe("useOAuth", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue("unauthenticated");
    // Mock crypto.getRandomValues
    vi.spyOn(crypto, "getRandomValues").mockImplementation((arr: any) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
      return arr;
    });
  });

  it("should return isReady and auth functions", () => {
    const { result } = renderHook(() => useOAuth("test-app"));
    expect(result.current.isReady).toBe(true);
    expect(typeof result.current.connect).toBe("function");
    expect(typeof result.current.disconnect).toBe("function");
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should check auth status on ready", () => {
    renderHook(() => useOAuth("test-app", "github"));
    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-oauth-check-status",
      { appId: "test-app", provider: "github" }
    );
  });

  it("should set isAuthenticated when status is authenticated", async () => {
    mockSendMessage.mockResolvedValue("authenticated");
    const { result } = renderHook(() => useOAuth("test-app"));

    await act(async () => {
      // Wait for effects
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should send connect with auto-generated PKCE", async () => {
    const { result } = renderHook(() => useOAuth("test-app"));

    await act(async () => {
      await result.current.connect({
        authorizationEndpoint: "https://auth.example.com",
        tokenEndpoint: "https://token.example.com",
        clientId: "client-123",
        scopes: ["read"],
      } as any);
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-oauth-connect",
      expect.objectContaining({
        appId: "test-app",
        config: expect.objectContaining({
          codeVerifier: expect.any(String),
          codeChallengeMethod: "S256",
        }),
      })
    );
  });

  it("should send disconnect and set isAuthenticated to false", async () => {
    mockSendMessage.mockResolvedValue("authenticated");
    const { result } = renderHook(() => useOAuth("test-app"));

    await act(async () => {
      await result.current.disconnect();
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-oauth-disconnect",
      { appId: "test-app", provider: "default" }
    );
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should throw connect when not ready", async () => {
    mockUseIMC.mockReturnValue({ imc: null, isReady: false });
    const { result } = renderHook(() => useOAuth("test-app"));

    await expect(
      act(async () => {
        await result.current.connect({} as any);
      })
    ).rejects.toThrow("IMC is not ready");
  });

  it("should throw disconnect when not ready", async () => {
    mockUseIMC.mockReturnValue({ imc: null, isReady: false });
    const { result } = renderHook(() => useOAuth("test-app"));

    await expect(
      act(async () => {
        await result.current.disconnect();
      })
    ).rejects.toThrow("IMC is not ready");
  });

  it("should return isLoading based on settings loaded state", () => {
    const { result } = renderHook(() => useOAuth("test-app"));
    expect(result.current.isLoading).toBe(false);
  });
});
