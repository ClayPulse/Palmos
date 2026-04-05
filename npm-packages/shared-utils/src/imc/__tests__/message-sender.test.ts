import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageSender } from "../message-sender";
import { IMCMessageTypeEnum } from "../../types/types";

vi.mock("uuid", () => ({
  v4: () => "test-uuid",
}));

describe("MessageSender", () => {
  let targetWindow: { postMessage: ReturnType<typeof vi.fn> };
  let sender: MessageSender;

  beforeEach(() => {
    vi.useFakeTimers();
    targetWindow = { postMessage: vi.fn() };
    sender = new MessageSender(
      targetWindow as unknown as Window,
      1000,
      "module-1",
      "channel-1"
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should post message with correct shape", () => {
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const promise = sender.sendMessage(
      IMCMessageTypeEnum.ModalityLLM,
      "hello"
    );

    expect(targetWindow.postMessage).toHaveBeenCalledWith(
      {
        messageId: expect.stringContaining("test-uuid"),
        channelId: "channel-1",
        type: IMCMessageTypeEnum.ModalityLLM,
        payload: "hello",
        from: "module-1",
      },
      "*"
    );

    // Clean up by advancing timer to trigger timeout rejection
    vi.advanceTimersByTime(1001);
    return promise.catch(() => {});
  });

  it("should reject on timeout", async () => {
    const promise = sender.sendMessage(IMCMessageTypeEnum.ModalityLLM);
    vi.advanceTimersByTime(1001);
    await expect(promise).rejects.toThrow(
      "Communication with Pulse Editor timeout."
    );
  });

  it("should reject immediately if AbortSignal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const promise = sender.sendMessage(
      IMCMessageTypeEnum.ModalityLLM,
      undefined,
      controller.signal
    );
    await expect(promise).rejects.toThrow("Request aborted");
  });

  it("should reject and send SignalAbort when aborted mid-flight", async () => {
    const controller = new AbortController();
    const promise = sender.sendMessage(
      IMCMessageTypeEnum.ModalityLLM,
      undefined,
      controller.signal
    );

    controller.abort();

    await expect(promise).rejects.toThrow("Request aborted");
    expect(targetWindow.postMessage).toHaveBeenCalledTimes(2);
    const abortCall = targetWindow.postMessage.mock.calls[1][0];
    expect(abortCall.type).toBe(IMCMessageTypeEnum.SignalAbort);
  });

  it("should resolve via getPendingMessage", async () => {
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const promise = sender.sendMessage(IMCMessageTypeEnum.ModalityLLM);

    const messageId = targetWindow.postMessage.mock.calls[0][0].messageId;
    const pending = sender.getPendingMessage(messageId);
    expect(pending).toBeDefined();
    pending!.resolve("result-value");

    const result = await promise;
    expect(result).toBe("result-value");
    expect(sender.getPendingMessage(messageId)).toBeUndefined();
  });

  it("should reject via getPendingMessage", async () => {
    const promise = sender.sendMessage(IMCMessageTypeEnum.ModalityLLM);

    const messageId = targetWindow.postMessage.mock.calls[0][0].messageId;
    const pending = sender.getPendingMessage(messageId);
    pending!.reject(new Error("test error"));

    await expect(promise).rejects.toThrow("test error");
    expect(sender.getPendingMessage(messageId)).toBeUndefined();
  });

  it("should return undefined for unknown pending message", () => {
    expect(sender.getPendingMessage("nonexistent")).toBeUndefined();
  });

  it("should work without channelId", () => {
    const senderNoChannel = new MessageSender(
      targetWindow as unknown as Window,
      1000,
      "module-1"
    );
    const promise = senderNoChannel.sendMessage(IMCMessageTypeEnum.ModalityLLM);

    expect(targetWindow.postMessage.mock.calls[0][0].channelId).toBeUndefined();

    vi.advanceTimersByTime(1001);
    return promise.catch(() => {});
  });
});
