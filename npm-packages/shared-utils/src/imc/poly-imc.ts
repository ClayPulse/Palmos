import {
  IMCMessage,
  IMCMessageTypeEnum,
  ReceiverHandler,
  ReceiverHandlerMap,
} from "../types/types";
import { InterModuleCommunication } from "./inter-module-communication";

/**
 * Poly IMC establishes two-way inter-module communication channels,
 * where each channel consists of a sender and a receiver to send and
 * receive messages between host window and the other module's window.
 *
 * This assumes the other window has IMC or Poly-IMC setup.
 */
export class PolyIMC {
  // A map that maps the other window ID,
  // and IMC between current window and the other window.
  private channels: Map<string, InterModuleCommunication>;
  private baseReceiverHandlerMap: ReceiverHandlerMap;
  private channelReceiverHandlerMapMap: Map<string, ReceiverHandlerMap>;

  /**
   *
   * @param baseReceiverHandlerMap A base receiver handler map for universal handlers.
   * E.g. Pulse Editor API handler
   */
  constructor(baseReceiverHandlerMap: ReceiverHandlerMap) {
    this.channels = new Map();
    this.baseReceiverHandlerMap = baseReceiverHandlerMap;
    this.channelReceiverHandlerMapMap = new Map();
  }

  public async sendMessage(
    targetWindowId: string,
    handlingType: IMCMessageTypeEnum,
    payload?: any,
    abortSignal?: AbortSignal
  ) {
    const channel = this.channels.get(targetWindowId);
    if (!channel) {
      throw new Error("Channel not found for window ID " + targetWindowId);
    }

    return await channel.sendMessage(handlingType, payload, abortSignal);
  }

  public updateBaseReceiverHandlerMap(handlerMap: ReceiverHandlerMap) {
    this.baseReceiverHandlerMap = handlerMap;
    this.channels.forEach((channel, key) => {
      const combinedMap = this.getCombinedHandlerMap(
        this.baseReceiverHandlerMap,
        this.channelReceiverHandlerMapMap.get(key)
      );
      channel.updateReceiverHandlerMap(combinedMap);
    });
  }

  public updateChannelReceiverHandlerMap(
    targetWindowId: string,
    handlerMap: ReceiverHandlerMap
  ) {
    const channel = this.channels.get(targetWindowId);
    if (!channel) {
      throw new Error("Channel not found for window ID " + targetWindowId);
    }

    const combinedMap = this.getCombinedHandlerMap(
      this.baseReceiverHandlerMap,
      handlerMap
    );

    channel.updateReceiverHandlerMap(combinedMap);

    this.channelReceiverHandlerMapMap.set(targetWindowId, handlerMap);
  }

  public async createChannel(
    targetWindow: Window,
    targetWindowId: string,
    receiverHandlerMap?: ReceiverHandlerMap
  ) {
    console.log("Creating channel for window ID: " + targetWindowId);
    const channel = new InterModuleCommunication();
    channel.initThisWindow(window, targetWindowId);
    await channel.initOtherWindow(targetWindow);

    this.channels.set(targetWindowId, channel);

    // If there is a channel specific receiver handler map,
    // combine it with the base receiver handler map.
    if (receiverHandlerMap) {
      this.updateChannelReceiverHandlerMap(targetWindowId, receiverHandlerMap);
    } else {
      channel.updateReceiverHandlerMap(this.baseReceiverHandlerMap);
    }
  }

  public removeChannel(targetWindowId: string) {
    const channel = this.channels.get(targetWindowId);
    if (!channel) {
      throw new Error("Channel not found for window ID " + targetWindowId);
    }

    channel.close();
    this.channels.delete(targetWindowId);
    this.channelReceiverHandlerMapMap.delete(targetWindowId);
  }

  public hasChannel(targetWindowId: string): boolean {
    return this.channels.has(targetWindowId);
  }

  public close() {
    this.channels.forEach((channel) => {
      channel.close();
    });
    this.channels.clear();
    this.channelReceiverHandlerMapMap.clear();
  }

  private getCombinedHandlerMap(
    map1?: ReceiverHandlerMap,
    map2?: ReceiverHandlerMap
  ): ReceiverHandlerMap {
    if (map1 && map2) {
      // Combine two maps
      const combinedMap = new Map([...map1, ...map2]);

      return combinedMap;
    } else if (map1) {
      return map1;
    } else if (map2) {
      return map2;
    } else {
      return new Map();
    }
  }
}

export class ConnectionListener {
  private polyIMC: PolyIMC;
  private newConnectionReceiverHandlerMap: ReceiverHandlerMap;
  private onConnection?: (senderWindow: Window, message: IMCMessage) => void;

  private listener: InterModuleCommunication;

  constructor(
    polyIMC: PolyIMC,
    newConnectionReceiverHandlerMap: ReceiverHandlerMap,
    onConnection?: (senderWindow: Window, message: IMCMessage) => void
  ) {
    this.polyIMC = polyIMC;
    this.newConnectionReceiverHandlerMap = newConnectionReceiverHandlerMap;
    this.onConnection = onConnection;

    const listener = new InterModuleCommunication();
    this.listener = listener;
    listener.initThisWindow(window);

    listener.updateReceiverHandlerMap(
      new Map<IMCMessageTypeEnum, ReceiverHandler>([
        [
          IMCMessageTypeEnum.ExtReady,
          async (
            senderWindow: Window,
            message: IMCMessage,
            abortSignal?: AbortSignal
          ) => {
            this.handleExtReady(senderWindow, message, abortSignal);
          },
        ],
      ])
    );
  }

  public close() {
    this.listener?.close();
  }

  public updateReceiverHandlerMap(
    newReceiverHandlerMap: ReceiverHandlerMap
  ): void {
    this.newConnectionReceiverHandlerMap = newReceiverHandlerMap;
  }

  private async handleExtReady(
    senderWindow: Window,
    message: IMCMessage,
    abortSignal?: AbortSignal
  ) {
    const targetWindowId = message.from;

    if (this.polyIMC.hasChannel(targetWindowId)) {
      // Channel already exists for the target window ID,
      // so we don't need to create a new one.
      console.log(
        "Channel already exists for window ID " +
          targetWindowId +
          ". Re-using the existing channel."
      );
      return;
    }

    // Create a new channel for the incoming connection
    await this.polyIMC.createChannel(
      senderWindow,
      targetWindowId,
      this.newConnectionReceiverHandlerMap
    );

    if (this.onConnection) {
      this.onConnection(senderWindow, message);
    }
  }
}
