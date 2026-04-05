import { vi } from "vitest";

export const mockSendMessage = vi.fn().mockResolvedValue(undefined);
export const mockImc = {
  sendMessage: mockSendMessage,
  close: vi.fn(),
  initThisWindow: vi.fn(),
  initOtherWindow: vi.fn().mockResolvedValue(undefined),
  updateReceiverHandlerMap: vi.fn(),
  channelId: "mock-channel-id",
};

let capturedHandlerMap: Map<string, any> | null = null;

export function getCapturedHandlerMap() {
  return capturedHandlerMap;
}

export function resetMocks() {
  mockSendMessage.mockReset().mockResolvedValue(undefined);
  capturedHandlerMap = null;
}

export const mockUseIMC = vi.fn((handlerMap: Map<string, any>, _intent: string) => {
  capturedHandlerMap = handlerMap;
  return {
    imc: mockImc,
    isReady: true,
  };
});
