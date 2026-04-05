import { describe, it, expect, vi, beforeEach } from "vitest";
import { InterModuleCommunication } from "../inter-module-communication";
import { IMCMessageTypeEnum } from "../../types/types";

describe("InterModuleCommunication", () => {
  let imc: InterModuleCommunication;
  let mockWindow: any;
  let messageListeners: ((event: any) => void)[];

  beforeEach(() => {
    messageListeners = [];
    mockWindow = {
      viewId: "window-1",
      addEventListener: vi.fn((type: string, listener: any, opts?: any) => {
        if (type === "message") {
          messageListeners.push(listener);
        }
      }),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };

    // Set global window for close()
    (globalThis as any).window = mockWindow;

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    imc = new InterModuleCommunication("test-intent", "ch-1");
  });

  it("should set intent and channelId in constructor", () => {
    expect(imc.intent).toBe("test-intent");
    expect(imc.channelId).toBe("ch-1");
  });

  it("should throw if window has no viewId", () => {
    const noViewIdWindow = { ...mockWindow, viewId: undefined };
    expect(() => imc.initThisWindow(noViewIdWindow)).toThrow(
      "Current window's ID is not defined."
    );
  });

  it("should initialize receiver and add message listener", () => {
    imc.initThisWindow(mockWindow);
    expect(mockWindow.addEventListener).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  it("should get thisWindowId after init", () => {
    imc.initThisWindow(mockWindow);
    expect(imc.getThisWindowId()).toBe("window-1");
  });

  it("should throw getThisWindowId before init", () => {
    expect(() => imc.getThisWindowId()).toThrow(
      "This window ID is not defined."
    );
  });

  it("should throw getOtherWindowId before init", () => {
    expect(() => imc.getOtherWindowId()).toThrow(
      "Other window ID is not defined."
    );
  });

  it("should filter messages with mismatched channelId", () => {
    imc.initThisWindow(mockWindow);
    const listener = messageListeners[0];

    // Send message with wrong channelId
    listener({
      data: {
        messageId: "msg-1",
        channelId: "wrong-channel",
        type: IMCMessageTypeEnum.ModalityLLM,
        payload: "test",
        from: "other-window",
      },
      source: mockWindow,
    });

    // No postMessage should happen (no handler response)
    // The message should just be silently ignored
  });

  it("should ignore duplicate messages", () => {
    imc.initThisWindow(mockWindow);
    const listener = messageListeners[0];

    const msg = {
      data: {
        messageId: "dup-1",
        channelId: "ch-1",
        type: IMCMessageTypeEnum.ModalityLLM,
        payload: "test",
        from: "other-window",
      },
      source: mockWindow,
    };

    listener(msg);
    listener(msg); // Duplicate

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Duplicate message")
    );
  });

  it("should filter messages from wrong otherWindowId", () => {
    imc.initThisWindow(mockWindow, "expected-window");
    const listener = messageListeners[0];

    listener({
      data: {
        messageId: "msg-1",
        channelId: "ch-1",
        type: IMCMessageTypeEnum.ModalityLLM,
        payload: "test",
        from: "wrong-window",
      },
      source: mockWindow,
    });

    // Message from wrong window should be filtered
  });

  it("should throw initOtherWindow before initThisWindow", () => {
    const otherWindow = { postMessage: vi.fn() };
    expect(() =>
      imc.initOtherWindow(otherWindow as unknown as Window)
    ).rejects.toThrow("You must initialize the current window first.");
  });

  it("should initOtherWindow and resolve after receiving window ID", async () => {
    imc.initThisWindow(mockWindow);

    const otherWindow = { postMessage: vi.fn() } as any;
    const initPromise = imc.initOtherWindow(otherWindow as Window);

    // Simulate receiving window ID response
    // initOtherWindow registers a once listener
    const onceListener =
      mockWindow.addEventListener.mock.calls[
        mockWindow.addEventListener.mock.calls.length - 1
      ][1];
    onceListener({
      data: {
        payload: "other-window-id",
      },
    });

    await initPromise;
    expect(imc.getOtherWindowId()).toBe("other-window-id");
    expect(otherWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IMCMessageTypeEnum.SignalRequestOtherWindowId,
        from: "window-1",
      }),
      "*"
    );
  });

  it("should throw sendMessage before sender is initialized", async () => {
    await expect(
      imc.sendMessage(IMCMessageTypeEnum.ModalityLLM)
    ).rejects.toThrow("Sender not initialized");
  });

  it("should delegate sendMessage to sender after init", async () => {
    imc.initThisWindow(mockWindow);
    const otherWindow = { postMessage: vi.fn() } as any;
    const initPromise = imc.initOtherWindow(otherWindow as Window);

    const onceListener =
      mockWindow.addEventListener.mock.calls[
        mockWindow.addEventListener.mock.calls.length - 1
      ][1];
    onceListener({ data: { payload: "other-id" } });
    await initPromise;

    // sendMessage should now delegate to sender (which posts to otherWindow)
    const sendPromise = imc.sendMessage(IMCMessageTypeEnum.ModalityLLM, "data");
    expect(otherWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IMCMessageTypeEnum.ModalityLLM,
        payload: "data",
      }),
      "*"
    );

    // Clean up - resolve the pending message
    const messageId =
      otherWindow.postMessage.mock.calls[
        otherWindow.postMessage.mock.calls.length - 1
      ][0].messageId;

    // Simulate acknowledge via the main listener
    const mainListener = messageListeners[0];
    mainListener({
      data: {
        messageId,
        channelId: "ch-1",
        type: IMCMessageTypeEnum.SignalAcknowledge,
        payload: "ack-result",
        from: "other-id",
      },
      source: otherWindow,
    });

    const result = await sendPromise;
    expect(result).toBe("ack-result");
  });

  it("should handle SignalError from other window", async () => {
    imc.initThisWindow(mockWindow);
    const otherWindow = { postMessage: vi.fn() } as any;
    const initPromise = imc.initOtherWindow(otherWindow as Window);
    const onceListener =
      mockWindow.addEventListener.mock.calls[
        mockWindow.addEventListener.mock.calls.length - 1
      ][1];
    onceListener({ data: { payload: "other-id" } });
    await initPromise;

    const sendPromise = imc.sendMessage(IMCMessageTypeEnum.ModalityLLM);
    const messageId =
      otherWindow.postMessage.mock.calls[
        otherWindow.postMessage.mock.calls.length - 1
      ][0].messageId;

    const mainListener = messageListeners[0];
    mainListener({
      data: {
        messageId,
        channelId: "ch-1",
        type: IMCMessageTypeEnum.SignalError,
        payload: "remote error",
        from: "other-id",
      },
      source: otherWindow,
    });

    await expect(sendPromise).rejects.toThrow("remote error");
  });

  it("should handle SignalIgnore from other window", async () => {
    imc.initThisWindow(mockWindow);
    const otherWindow = { postMessage: vi.fn() } as any;
    const initPromise = imc.initOtherWindow(otherWindow as Window);
    const onceListener =
      mockWindow.addEventListener.mock.calls[
        mockWindow.addEventListener.mock.calls.length - 1
      ][1];
    onceListener({ data: { payload: "other-id" } });
    await initPromise;

    const sendPromise = imc.sendMessage(IMCMessageTypeEnum.ModalityLLM);
    const messageId =
      otherWindow.postMessage.mock.calls[
        otherWindow.postMessage.mock.calls.length - 1
      ][0].messageId;

    const mainListener = messageListeners[0];
    mainListener({
      data: {
        messageId,
        channelId: "ch-1",
        type: IMCMessageTypeEnum.SignalIgnore,
        payload: "No handler",
        from: "other-id",
      },
      source: otherWindow,
    });

    await expect(sendPromise).rejects.toThrow("Message ignored by receiver");
  });

  it("should close and remove event listener", () => {
    imc.initThisWindow(mockWindow);
    imc.close();
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  it("should updateReceiverHandlerMap", () => {
    imc.initThisWindow(mockWindow);
    const newMap = new Map();
    const handler = vi.fn().mockResolvedValue(undefined);
    newMap.set(IMCMessageTypeEnum.ModalityLLM, handler);
    imc.updateReceiverHandlerMap(newMap);

    // Verify handler is called when message arrives
    const listener = messageListeners[0];
    listener({
      data: {
        messageId: "msg-update",
        channelId: "ch-1",
        type: IMCMessageTypeEnum.ModalityLLM,
        payload: "test",
        from: "other-window",
      },
      source: mockWindow,
    });

    expect(handler).toHaveBeenCalled();
  });

  it("should throw updateReceiverHandlerMap before init", () => {
    expect(() => imc.updateReceiverHandlerMap(new Map())).toThrow(
      "Receiver not initialized"
    );
  });

  it("should respond to SignalRequestOtherWindowId with thisWindowId", async () => {
    imc.initThisWindow(mockWindow);
    const listener = messageListeners[0];

    const otherWin = { postMessage: vi.fn() };
    listener({
      data: {
        messageId: "req-id",
        channelId: "ch-1",
        type: IMCMessageTypeEnum.SignalRequestOtherWindowId,
        payload: undefined,
        from: "requester",
      },
      source: otherWin,
    });

    // The handler should acknowledge with thisWindowId
    await vi.waitFor(() => {
      expect(otherWin.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IMCMessageTypeEnum.SignalAcknowledge,
          payload: "window-1",
        }),
        "*"
      );
    });
  });

  it("should allow undefined channelId during handshake", () => {
    const imcNoChannel = new InterModuleCommunication("test", undefined);
    imcNoChannel.initThisWindow(mockWindow);
    const listener = messageListeners[messageListeners.length - 1];

    // Message with undefined channelId should pass through
    listener({
      data: {
        messageId: "handshake-1",
        channelId: undefined,
        type: IMCMessageTypeEnum.SignalRequestOtherWindowId,
        payload: undefined,
        from: "other",
      },
      source: mockWindow,
    });

    // Should not be filtered
  });

  it("should not log for SignalIgnore messages", () => {
    imc.initThisWindow(mockWindow);
    const listener = messageListeners[0];

    // Clear any prior log calls
    (console.log as any).mockClear();

    listener({
      data: {
        messageId: "ignore-1",
        channelId: "ch-1",
        type: IMCMessageTypeEnum.SignalIgnore,
        payload: "ignored",
        from: "other-window",
      },
      source: mockWindow,
    });

    const logCalls = (console.log as any).mock.calls.filter((c: any) =>
      String(c[0]).includes("received message from module")
    );
    expect(logCalls).toHaveLength(0);
  });

  it("should not log for messages without from field", () => {
    imc.initThisWindow(mockWindow);
    const listener = messageListeners[0];

    (console.log as any).mockClear();

    listener({
      data: {
        messageId: "no-from-1",
        channelId: "ch-1",
        type: IMCMessageTypeEnum.ModalityLLM,
        payload: "test",
        from: undefined,
      },
      source: mockWindow,
    });

    const logCalls = (console.log as any).mock.calls.filter((c: any) =>
      String(c[0]).includes("received message from module")
    );
    expect(logCalls).toHaveLength(0);
  });

  it("should close without error when no listener was set", () => {
    expect(() => imc.close()).not.toThrow();
  });

  it("should allow duplicate SignalRequestOtherWindowId messages", () => {
    imc.initThisWindow(mockWindow);
    const listener = messageListeners[0];

    (console.warn as any).mockClear();

    const msg1 = {
      data: {
        messageId: "req-dup",
        channelId: "ch-1",
        type: IMCMessageTypeEnum.SignalRequestOtherWindowId,
        payload: undefined,
        from: "other",
      },
      source: mockWindow,
    };

    listener(msg1);
    // Same messageId, same type SignalRequestOtherWindowId — should NOT be treated as duplicate
    listener(msg1);

    const warnCalls = (console.warn as any).mock.calls.filter((c: any) =>
      String(c[0]).includes("Duplicate message")
    );
    // SignalRequestOtherWindowId is excluded from dedup
    expect(warnCalls).toHaveLength(0);
  });

  it("should log when receiving message with defined from and non-ignore type", () => {
    imc.initThisWindow(mockWindow);
    const listener = messageListeners[0];

    (console.log as any).mockClear();

    listener({
      data: {
        messageId: "log-test-1",
        channelId: "ch-1",
        type: IMCMessageTypeEnum.ModalityLLM,
        payload: "test",
        from: "sender-window",
      },
      source: mockWindow,
    });

    const logCalls = (console.log as any).mock.calls.filter((c: any) =>
      String(c[0]).includes("received message from module")
    );
    expect(logCalls.length).toBeGreaterThan(0);
  });
});
