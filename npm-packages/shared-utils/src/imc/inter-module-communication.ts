import {
  IMCMessage,
  IMCMessageTypeEnum,
  ReceiverHandlerMap,
} from "../types/types";
import { messageTimeout } from "../types/constants";
import { MessageReceiver } from "./message-receiver";
import { MessageSender } from "./message-sender";

export class InterModuleCommunication {
  private thisWindow: Window | undefined;
  private otherWindow: Window | undefined;

  private receiver: MessageReceiver | undefined;
  private sender: MessageSender | undefined;

  private thisWindowId: string | undefined;
  private otherWindowId: string | undefined;

  private receiverHandlerMap: ReceiverHandlerMap | undefined;

  private listener: ((event: MessageEvent) => void) | undefined;

  private messageRecords: Map<string, IMCMessage> | undefined;

  /**
   * Initialize a receiver to receive message.
   * @param window The current window.
   * @param otherWindowId The ID of the other window. This is optional and can be undefined.
   * When defined, the receiver will only receive messages from window with the ID.
   */
  public initThisWindow(window: Window, otherWindowId?: string) {
    this.thisWindow = window;
    // @ts-expect-error viewId is injected by the browser
    const thisWindowId = window.viewId as string | undefined;
    if (!thisWindowId) {
      throw new Error("Current window's ID is not defined.");
    }
    this.thisWindowId = thisWindowId;

    this.receiverHandlerMap = new Map();

    const receiver = new MessageReceiver(
      this.receiverHandlerMap,
      this.thisWindowId
    );
    this.receiver = receiver;

    this.messageRecords = new Map<string, IMCMessage>();

    this.listener = (event: MessageEvent<IMCMessage>) => {
      const messageId = event.data.id;
      const type = event.data.type;

      if (
        this.messageRecords?.has(messageId) &&
        type !== IMCMessageTypeEnum.SignalGetWindowId
      ) {
        console.warn(
          `Duplicate message received with ID: ${messageId}. Ignoring this message. Message: ${JSON.stringify(
            event.data
          )}`
        );
        return;
      }
      this.messageRecords?.set(messageId, event.data);

      if (!receiver) {
        throw new Error(
          "Receiver not initialized at module " + this.thisWindowId
        );
      }

      const message = event.data;
      if (process.env.NODE_ENV === "development") {
        console.log(
          `Module ${this.thisWindowId} received message from module ${
            message.from
          }:\n ${JSON.stringify(message)}`
        );
      }

      if (otherWindowId && message.from !== otherWindowId) {
        return;
      }
      const win = event.source as Window;
      receiver.receiveMessage(win, message);
    };
    window.addEventListener("message", this.listener);
    console.log("Adding IMC listener in " + this.thisWindowId);
    // refresh the receiver handler map
    this.setBaseHandler();
  }

  /* Initialize a sender to send message ot the other window. */
  public async initOtherWindow(window: Window) {
    return new Promise<void>((resolve) => {
      if (!this.thisWindow || !this.thisWindowId) {
        throw new Error("You must initialize the current window first.");
      }

      const onReceiveWindowID = (event: MessageEvent) => {
        if (!this.thisWindow || !this.thisWindowId) {
          throw new Error("You must initialize the current window first.");
        }

        const message = event.data;
        const otherWindowId = message.windowId;
        this.otherWindowId = otherWindowId;

        const sender = new MessageSender(
          window,
          messageTimeout,
          this.thisWindowId
        );
        this.sender = sender;

        if (!this.receiverHandlerMap) {
          throw new Error("You must initialize the current window first.");
        }

        this.setBaseHandler();
        resolve();
      };

      // Wait for the other window to send its ID.
      this.thisWindow.addEventListener("message", onReceiveWindowID, {
        once: true,
      });

      this.otherWindow = window;
      this.otherWindow.postMessage(
        {
          type: IMCMessageTypeEnum.SignalGetWindowId,
          from: this.thisWindowId,
        },
        "*"
      );
    });
  }

  public close() {
    if (this.listener) {
      window.removeEventListener("message", this.listener);
    }
  }

  public async sendMessage(
    type: IMCMessageTypeEnum,
    payload?: any,
    abortSignal?: AbortSignal
  ): Promise<any> {
    const sender = this.sender;
    if (!sender) {
      throw new Error("Sender not initialized");
    }

    return await sender.sendMessage(type, payload, abortSignal);
  }

  public updateReceiverHandlerMap(
    receiverHandlerMap: ReceiverHandlerMap
  ): void {
    if (!this.receiver) {
      throw new Error("Receiver not initialized");
    }

    // Clear all existing handlers except the acknowledgement handler.
    this.receiverHandlerMap?.clear();
    this.setBaseHandler();
    receiverHandlerMap.forEach((value, key) => {
      this.receiverHandlerMap?.set(key, value);
    });
  }

  public getThisWindowId(): string {
    if (!this.thisWindowId) {
      throw new Error("This window ID is not defined.");
    }
    return this.thisWindowId;
  }

  public getOtherWindowId(): string {
    if (!this.otherWindowId) {
      throw new Error("Other window ID is not defined.");
    }
    return this.otherWindowId;
  }

  private setBaseHandler() {
    // Add an acknowledgement handler in current window's receiver for results of sent messages.
    // This is to receive the acknowledgement from the other window, so that we know the other
    // window has received the message and finished processing it.
    // The current window must be initialized first. i.e. call initThisWindow() before initOtherWindow().
    this.receiverHandlerMap?.set(
      IMCMessageTypeEnum.SignalAcknowledge,
      async (senderWindow: Window, message: IMCMessage) => {
        const pendingMessage = this.sender?.getPendingMessage(message.id);
        if (pendingMessage) {
          pendingMessage.resolve(message.payload);
          this.sender?.removePendingMessage(message.id);
        }
      }
    );

    // Set get window ID handler in the receiver handler map.
    this.receiverHandlerMap?.set(
      IMCMessageTypeEnum.SignalGetWindowId,
      async (senderWindow: Window, message: IMCMessage) => {
        console.log(
          "Received window ID request. Sending window ID to other window: "
        );
        const id = this.thisWindowId;
        if (!id) {
          throw new Error("This window ID is not defined.");
        }
        const msg: IMCMessage = {
          id: message.id,
          type: IMCMessageTypeEnum.SignalReturnWindowId,
          payload: {
            windowId: id,
          },
          from: id,
        };
        senderWindow.postMessage(msg, "*");
      }
    );
  }
}
