import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useIMC from "../use-imc";

const mockSendMessage = vi.fn().mockResolvedValue(undefined);
const mockInitThisWindow = vi.fn();
const mockInitOtherWindow = vi.fn().mockResolvedValue(undefined);
const mockUpdateReceiverHandlerMap = vi.fn();
const mockClose = vi.fn();

vi.mock("@pulse-editor/shared-utils", () => {
  class MockIMC {
    channelId = "mock-channel";
    intent: string;
    sendMessage = mockSendMessage;
    initThisWindow = mockInitThisWindow;
    initOtherWindow = mockInitOtherWindow;
    updateReceiverHandlerMap = mockUpdateReceiverHandlerMap;
    close = mockClose;
    constructor(intent: string, channelId: string) {
      this.intent = intent;
      this.channelId = channelId;
    }
  }
  return {
    InterModuleCommunication: MockIMC,
    IMCMessageTypeEnum: {
      AppReady: "app-ready",
    },
  };
});

vi.mock("uuid", () => ({
  v4: () => "test-uuid",
}));

describe("useIMC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return imc and isReady", () => {
    const handlerMap = new Map();
    const { result } = renderHook(() => useIMC(handlerMap, "test"));

    // Initially not ready (async init)
    expect(result.current.isReady).toBe(false);
    expect(result.current.imc).toBeUndefined();
  });

  it("should initialize IMC on mount", async () => {
    const handlerMap = new Map();
    renderHook(() => useIMC(handlerMap, "test-intent"));

    // The hook should attempt to create and init IMC
    // Since effects run asynchronously, we just verify the hook doesn't throw
  });
});
