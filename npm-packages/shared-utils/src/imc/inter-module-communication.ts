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

  /* Wait current module to finish tasks to return a response or acknowledgement. */
  private thisPendingTasks:
    | Map<
        string,
        {
          controller: AbortController;
        }
      >
    | undefined;

  /* Wait the other module to return a response or acknowledgement. */
  private otherPendingMessages:
    | Map<
        string,
        {
          resolve: (result: any) => void;
          reject: () => void;
        }
      >
    | undefined;

  private receiver: MessageReceiver | undefined;
  private sender: MessageSender | undefined;

  private id: string;

  private receiverHandlerMap: ReceiverHandlerMap | undefined;

  private listener: ((event: MessageEvent) => void) | undefined;

  constructor(id?: string) {
    if (!id) {
      // @ts-expect-error viewId is injected by the browser
      const windowId = window.viewId as string | undefined;
      // @ts-expect-error viewId is injected by the browser
      console.log("Window ID: " + window.viewId);

      if (!windowId) {
        throw new Error("View ID is not defined.");
      }

      id = windowId;
    }
    this.id = id;
  }

  /* Initialize a receiver to receive message. */
  public initThisWindow(window: Window) {
    this.thisWindow = window;
    this.receiverHandlerMap = new Map();
    this.thisPendingTasks = new Map();

    const receiver = new MessageReceiver(
      this.receiverHandlerMap,
      this.thisPendingTasks,
      this.id
    );
    this.receiver = receiver;

    this.listener = (event: MessageEvent<IMCMessage>) => {
      if (!receiver) {
        throw new Error("Receiver not initialized at module " + this.id);
      }

      const message = event.data;
      const win = event.source as Window;
      receiver.receiveMessage(win, message);
    };
    window.addEventListener("message", this.listener);
    console.log("Adding IMC listener in " + this.id);
  }

  /* Initialize a sender to send message ot the other window. */
  public initOtherWindow(window: Window) {
    this.otherWindow = window;
    this.otherPendingMessages = new Map();

    const sender = new MessageSender(
      window,
      messageTimeout,
      this.otherPendingMessages,
      this.id
    );
    this.sender = sender;

    if (!this.receiverHandlerMap) {
      throw new Error("You must initialize the current window first.");
    }

    // Add an acknowledgement handler in current window's receiver for results of sent messages.
    // The current window must be initialized first. i.e. call initThisWindow() before initOtherWindow().
    this.receiverHandlerMap.set(
      IMCMessageTypeEnum.Acknowledge,
      async (senderWindow: Window, message: IMCMessage) => {
        const pendingMessage = this.otherPendingMessages?.get(message.id);
        if (pendingMessage) {
          pendingMessage.resolve(message.payload);
          this.otherPendingMessages?.delete(message.id);
        }
      }
    );
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
    if (!this.sender) {
      throw new Error("Sender not initialized");
    }

    return await this.sender.sendMessage(type, payload, abortSignal);
  }

  public updateReceiverHandlerMap(
    receiverHandlerMap: ReceiverHandlerMap
  ): void {
    if (!this.receiver) {
      throw new Error("Receiver not initialized");
    }

    this.receiverHandlerMap?.clear();
    receiverHandlerMap.forEach((value, key) => {
      this.receiverHandlerMap?.set(key, value);
    });
  }
}
