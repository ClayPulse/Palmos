import { describe, it, expect, vi, beforeEach } from "vitest";
import { PolyIMC, ConnectionListener } from "../poly-imc";
import { IMCMessageTypeEnum, ReceiverHandlerMap } from "../../types/types";

// Track all created mock instances
let mockInstances: any[] = [];

vi.mock("../inter-module-communication", () => {
  class MockIMC {
    intent: string | undefined;
    channelId: string | undefined;
    initThisWindow = vi.fn();
    initOtherWindow = vi.fn().mockResolvedValue(undefined);
    sendMessage = vi.fn().mockResolvedValue("result");
    updateReceiverHandlerMap = vi.fn();
    close = vi.fn();
    getThisWindowId = vi.fn().mockReturnValue("this-window");
    constructor(intent: string | undefined, channelId: string | undefined) {
      this.intent = intent;
      this.channelId = channelId;
      mockInstances.push(this);
    }
  }
  return { InterModuleCommunication: MockIMC };
});

describe("PolyIMC", () => {
  let polyIMC: PolyIMC;
  let baseHandlerMap: ReceiverHandlerMap;

  beforeEach(() => {
    mockInstances = [];
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    baseHandlerMap = new Map();
    polyIMC = new PolyIMC(baseHandlerMap);

    (globalThis as any).window = {
      viewId: "host-window",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
  });

  it("should throw sendMessage for unknown targetWindowId", async () => {
    await expect(
      polyIMC.sendMessage("unknown", IMCMessageTypeEnum.ModalityLLM)
    ).rejects.toThrow("Channel not found for window ID unknown");
  });

  it("should create channel and send messages", async () => {
    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1");

    expect(polyIMC.hasChannel("target-1")).toBe(true);

    const results = await polyIMC.sendMessage(
      "target-1",
      IMCMessageTypeEnum.ModalityLLM,
      "payload"
    );
    expect(results).toEqual(["result"]);
  });

  it("should fan out to all channels for a window", async () => {
    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1");
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-2");

    const results = await polyIMC.sendMessage(
      "target-1",
      IMCMessageTypeEnum.ModalityLLM
    );
    expect(results).toEqual(["result", "result"]);
  });

  it("should skip 'Message ignored by receiver' errors", async () => {
    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1");
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-2");

    mockInstances[0].sendMessage.mockRejectedValueOnce(
      new Error("Message ignored by receiver")
    );

    const results = await polyIMC.sendMessage(
      "target-1",
      IMCMessageTypeEnum.ModalityLLM
    );
    expect(results).toEqual(["result"]);
  });

  it("should rethrow real errors from channels", async () => {
    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1");

    mockInstances[0].sendMessage.mockRejectedValueOnce(new Error("Real error"));

    await expect(
      polyIMC.sendMessage("target-1", IMCMessageTypeEnum.ModalityLLM)
    ).rejects.toThrow("Real error");
  });

  it("should updateBaseReceiverHandlerMap on all channels", async () => {
    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1");

    const newMap: ReceiverHandlerMap = new Map();
    newMap.set(IMCMessageTypeEnum.ModalityLLM, vi.fn().mockResolvedValue(undefined));
    polyIMC.updateBaseReceiverHandlerMap(newMap);

    expect(mockInstances[0].updateReceiverHandlerMap).toHaveBeenCalled();
  });

  it("should updateChannelReceiverHandlerMap combining base and channel maps", async () => {
    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1");

    const channelMap: ReceiverHandlerMap = new Map();
    channelMap.set(IMCMessageTypeEnum.ModalityTTS, vi.fn().mockResolvedValue(undefined));
    polyIMC.updateChannelReceiverHandlerMap("target-1", channelMap);

    expect(mockInstances[0].updateReceiverHandlerMap).toHaveBeenCalled();
  });

  it("should throw updateChannelReceiverHandlerMap for unknown window", () => {
    expect(() =>
      polyIMC.updateChannelReceiverHandlerMap("unknown", new Map())
    ).toThrow("Channel not found for window ID unknown");
  });

  it("should removeWindowChannels", async () => {
    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1");

    polyIMC.removeWindowChannels("target-1");
    expect(polyIMC.hasChannel("target-1")).toBe(false);
    expect(mockInstances[0].close).toHaveBeenCalled();
  });

  it("should throw removeWindowChannels for unknown window", () => {
    expect(() => polyIMC.removeWindowChannels("unknown")).toThrow(
      "Channel not found for window ID unknown"
    );
  });

  it("should hasChannel return false for unknown", () => {
    expect(polyIMC.hasChannel("unknown")).toBe(false);
  });

  it("should close all channels", async () => {
    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1");
    await polyIMC.createChannel(targetWindow, "target-2", "app", "ch-2");

    polyIMC.close();
    expect(polyIMC.hasChannel("target-1")).toBe(false);
    expect(polyIMC.hasChannel("target-2")).toBe(false);
  });

  it("should apply base handler map when no channel-specific map", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    baseHandlerMap.set(IMCMessageTypeEnum.ModalityLLM, handler);

    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1");

    expect(mockInstances[0].updateReceiverHandlerMap).toHaveBeenCalledWith(
      baseHandlerMap
    );
  });

  it("should apply channel-specific receiver handler map on createChannel", async () => {
    const targetWindow = { postMessage: vi.fn() } as unknown as Window;
    const channelMap: ReceiverHandlerMap = new Map();
    channelMap.set(IMCMessageTypeEnum.ModalityTTS, vi.fn().mockResolvedValue(undefined));

    await polyIMC.createChannel(targetWindow, "target-1", "app", "ch-1", channelMap);

    expect(mockInstances[0].updateReceiverHandlerMap).toHaveBeenCalled();
  });
});

describe("ConnectionListener", () => {
  let polyIMC: PolyIMC;
  let handlerMap: ReceiverHandlerMap;

  beforeEach(() => {
    mockInstances = [];
    vi.spyOn(console, "log").mockImplementation(() => {});
    handlerMap = new Map();
    polyIMC = new PolyIMC(new Map());

    (globalThis as any).window = {
      viewId: "host-window",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
  });

  it("should create listener with connection-listener intent", () => {
    new ConnectionListener(polyIMC, handlerMap);

    // The ConnectionListener creates an IMC instance
    const listenerInstance = mockInstances[0];
    expect(listenerInstance.intent).toBe("connection-listener");
    expect(listenerInstance.initThisWindow).toHaveBeenCalled();
    expect(listenerInstance.updateReceiverHandlerMap).toHaveBeenCalled();
  });

  it("should close the listener", () => {
    const listener = new ConnectionListener(polyIMC, handlerMap);
    listener.close();

    expect(mockInstances[0].close).toHaveBeenCalled();
  });

  it("should update receiver handler map", () => {
    const listener = new ConnectionListener(polyIMC, handlerMap);
    const newMap: ReceiverHandlerMap = new Map();
    listener.updateReceiverHandlerMap(newMap);
    // No error thrown = success
  });

  it("should handle AppReady and create channel on polyIMC", async () => {
    const onConnection = vi.fn();
    new ConnectionListener(polyIMC, handlerMap, onConnection);

    const listenerInstance = mockInstances[0];
    const handlerMapArg =
      listenerInstance.updateReceiverHandlerMap.mock.calls[0][0] as ReceiverHandlerMap;
    const appReadyHandler = handlerMapArg.get(IMCMessageTypeEnum.AppReady);

    expect(appReadyHandler).toBeDefined();

    const senderWindow = { postMessage: vi.fn() } as unknown as Window;
    const message = {
      messageId: "ready-1",
      channelId: undefined,
      type: IMCMessageTypeEnum.AppReady,
      payload: { intent: "app", channelId: "new-ch" },
      from: "ext-window",
    };

    await appReadyHandler!(senderWindow, message);
    expect(onConnection).toHaveBeenCalledWith(senderWindow, message);
  });

  it("should throw if AppReady message has no channelId", async () => {
    new ConnectionListener(polyIMC, handlerMap);

    const listenerInstance = mockInstances[0];
    const handlerMapArg =
      listenerInstance.updateReceiverHandlerMap.mock.calls[0][0] as ReceiverHandlerMap;
    const appReadyHandler = handlerMapArg.get(IMCMessageTypeEnum.AppReady);

    const senderWindow = { postMessage: vi.fn() } as unknown as Window;
    const message = {
      messageId: "ready-1",
      channelId: undefined,
      type: IMCMessageTypeEnum.AppReady,
      payload: { intent: "app", channelId: undefined },
      from: "ext-window",
    };

    await expect(appReadyHandler!(senderWindow, message)).rejects.toThrow(
      "Channel ID is missing in AppReady message."
    );
  });
});
