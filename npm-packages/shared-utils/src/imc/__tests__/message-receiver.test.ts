import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageReceiver } from "../message-receiver";
import { IMCMessage, IMCMessageTypeEnum, ReceiverHandlerMap } from "../../types/types";

function makeMessage(overrides: Partial<IMCMessage> = {}): IMCMessage {
  return {
    messageId: "msg-1",
    channelId: "ch-1",
    type: IMCMessageTypeEnum.ModalityLLM,
    payload: "test-payload",
    from: "other-window",
    ...overrides,
  };
}

describe("MessageReceiver", () => {
  let senderWindow: { postMessage: ReturnType<typeof vi.fn> };
  let handlerMap: ReceiverHandlerMap;

  beforeEach(() => {
    senderWindow = { postMessage: vi.fn() };
    handlerMap = new Map();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should ignore messages from self", () => {
    const receiver = new MessageReceiver(handlerMap, "self-id", undefined);
    const message = makeMessage({ from: "self-id" });
    receiver.receiveMessage(senderWindow as unknown as Window, message);
    expect(senderWindow.postMessage).not.toHaveBeenCalled();
  });

  it("should handle SignalAbort for pending task", () => {
    const handler = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 10000);
        })
    );
    handlerMap.set(IMCMessageTypeEnum.ModalityLLM, handler);
    const receiver = new MessageReceiver(handlerMap, "my-id", undefined);

    // First send a normal message to create a pending task
    receiver.receiveMessage(
      senderWindow as unknown as Window,
      makeMessage({ messageId: "task-1" })
    );

    // Now send abort
    receiver.receiveMessage(senderWindow as unknown as Window, {
      messageId: "task-1",
      channelId: "ch-1",
      type: IMCMessageTypeEnum.SignalAbort,
      payload: null,
      from: "other-window",
    });
    // Should have logged abort
    expect(console.log).toHaveBeenCalledWith("Aborting task", "task-1");
  });

  it("should be a no-op for SignalAbort with unknown messageId", () => {
    const receiver = new MessageReceiver(handlerMap, "my-id", undefined);
    receiver.receiveMessage(senderWindow as unknown as Window, {
      messageId: "unknown-id",
      channelId: "ch-1",
      type: IMCMessageTypeEnum.SignalAbort,
      payload: null,
      from: "other-window",
    });
    expect(senderWindow.postMessage).not.toHaveBeenCalled();
  });

  it("should call handler and send acknowledge on success", async () => {
    const handler = vi.fn().mockResolvedValue("result-data");
    handlerMap.set(IMCMessageTypeEnum.ModalityLLM, handler);
    const receiver = new MessageReceiver(handlerMap, "my-id", undefined);

    receiver.receiveMessage(
      senderWindow as unknown as Window,
      makeMessage()
    );

    // Wait for promise to resolve
    await vi.waitFor(() => {
      expect(senderWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: "msg-1",
          type: IMCMessageTypeEnum.SignalAcknowledge,
          payload: "result-data",
          from: "my-id",
        }),
        "*"
      );
    });
  });

  it("should send SignalError on handler rejection", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("handler failed"));
    handlerMap.set(IMCMessageTypeEnum.ModalityLLM, handler);
    const receiver = new MessageReceiver(handlerMap, "my-id", undefined);

    receiver.receiveMessage(
      senderWindow as unknown as Window,
      makeMessage()
    );

    await vi.waitFor(() => {
      expect(senderWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IMCMessageTypeEnum.SignalError,
          payload: "handler failed",
        }),
        "*"
      );
    });
  });

  it("should send SignalIgnore when handler throws 'Message ignored by receiver'", async () => {
    const handler = vi
      .fn()
      .mockRejectedValue(new Error("Message ignored by receiver"));
    handlerMap.set(IMCMessageTypeEnum.ModalityLLM, handler);
    const receiver = new MessageReceiver(handlerMap, "my-id", undefined);

    receiver.receiveMessage(
      senderWindow as unknown as Window,
      makeMessage()
    );

    await vi.waitFor(() => {
      expect(senderWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IMCMessageTypeEnum.SignalIgnore,
        }),
        "*"
      );
    });
  });

  it("should send SignalIgnore when no handler found", () => {
    const receiver = new MessageReceiver(handlerMap, "my-id", undefined);
    receiver.receiveMessage(
      senderWindow as unknown as Window,
      makeMessage()
    );

    expect(senderWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IMCMessageTypeEnum.SignalIgnore,
        messageId: "msg-1",
      }),
      "*"
    );
  });

  it("should silently ignore missing handler for connection-listener intent", () => {
    const receiver = new MessageReceiver(
      handlerMap,
      "my-id",
      "connection-listener"
    );
    receiver.receiveMessage(
      senderWindow as unknown as Window,
      makeMessage()
    );

    expect(senderWindow.postMessage).not.toHaveBeenCalled();
  });

  it("should not acknowledge if signal is aborted before handler resolves", async () => {
    let capturedSignal: AbortSignal | undefined;
    const handler = vi.fn().mockImplementation(
      (_win: Window, _msg: IMCMessage, signal: AbortSignal) => {
        capturedSignal = signal;
        return Promise.resolve("data");
      }
    );
    handlerMap.set(IMCMessageTypeEnum.ModalityLLM, handler);
    const receiver = new MessageReceiver(handlerMap, "my-id", undefined);

    // Create a message, then abort immediately
    const message = makeMessage({ messageId: "abort-test" });
    receiver.receiveMessage(senderWindow as unknown as Window, message);

    // Send abort before handler completes
    receiver.receiveMessage(senderWindow as unknown as Window, {
      messageId: "abort-test",
      channelId: "ch-1",
      type: IMCMessageTypeEnum.SignalAbort,
      payload: null,
      from: "other-window",
    });

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("should not send acknowledge for SignalAcknowledge message type", async () => {
    const handler = vi.fn().mockResolvedValue("ack-result");
    handlerMap.set(IMCMessageTypeEnum.SignalAcknowledge, handler);
    const receiver = new MessageReceiver(handlerMap, "my-id", undefined);

    receiver.receiveMessage(
      senderWindow as unknown as Window,
      makeMessage({ type: IMCMessageTypeEnum.SignalAcknowledge })
    );

    // Wait for handler to complete
    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalled();
    });

    // Should NOT have sent an acknowledge back
    expect(senderWindow.postMessage).not.toHaveBeenCalled();
  });

  it("should pass abort signal to handler", async () => {
    let receivedSignal: AbortSignal | undefined;
    const handler = vi.fn().mockImplementation(
      (_win: Window, _msg: IMCMessage, signal: AbortSignal) => {
        receivedSignal = signal;
        return Promise.resolve();
      }
    );
    handlerMap.set(IMCMessageTypeEnum.ModalityLLM, handler);
    const receiver = new MessageReceiver(handlerMap, "my-id", undefined);

    receiver.receiveMessage(
      senderWindow as unknown as Window,
      makeMessage()
    );

    await vi.waitFor(() => {
      expect(receivedSignal).toBeDefined();
      expect(receivedSignal!.aborted).toBe(false);
    });
  });
});
