import {
  IMCMessage,
  IMCMessageTypeEnum,
  ReceiverHandlerMap,
} from "../types/types";

export class MessageReceiver {
  private handlerMap: ReceiverHandlerMap;
  private pendingTasks: Map<
    string,
    {
      controller: AbortController;
    }
  >;
  private windowId: string;
  private intent: string | undefined;

  constructor(
    listenerMap: ReceiverHandlerMap,
    windowId: string,
    intent: string | undefined
  ) {
    this.handlerMap = listenerMap;
    this.pendingTasks = new Map();
    this.windowId = windowId;
    this.intent = intent;
  }

  public receiveMessage(senderWindow: Window, message: IMCMessage) {
    // Not handling messages from self
    if (this.windowId === message.from) return;

    // Abort the task if the message type is Abort
    if (message.type === IMCMessageTypeEnum.SignalAbort) {
      const id = message.messageId;
      const pendingTask = this.pendingTasks.get(id);

      if (pendingTask) {
        console.log("Aborting task", id);
        pendingTask.controller.abort();
        this.pendingTasks.delete(id);
      }

      return;
    }

    const handler = this.handlerMap.get(message.type);

    if (!handler) {
      if (this.intent === "connection-listener") {
        // Ignore missing handler for connection listener,
        // as it handles connection related messages only.
        // There should be another channel created to handle other messages.
        return;
      }

      console.warn(`No handler found for message type: ${message.type}`);

      // Ignore the message if no handler is found
      this.ignoreSender(senderWindow, message);

      return;
    }

    // Create abort controller to listen for abort signal from sender.
    // Then save the message id and abort controller to the pending tasks.
    const controller = new AbortController();
    const signal = controller.signal;
    this.pendingTasks.set(message.messageId, {
      controller,
    });

    const promise = handler(senderWindow, message, signal);
    promise
      .then((result) => {
        // Don't send the result if the task has been aborted
        if (signal.aborted) return;

        // Acknowledge the sender with the result if the message type is not Acknowledge
        if (message.type !== IMCMessageTypeEnum.SignalAcknowledge) {
          this.acknowledgeSender(
            senderWindow,
            message.messageId,
            message.channelId,
            result
          );
        }
      })
      .catch((error) => {
        if (error.message === "Message ignored by receiver") {
          // Ignore the message if no handler is found
          this.ignoreSender(senderWindow, message);
          return;
        }

        // Send the error message to the sender
        const errMsg: IMCMessage = {
          messageId: message.messageId,
          channelId: message.channelId,
          type: IMCMessageTypeEnum.SignalError,
          payload: error.message,
          from: this.windowId,
        };

        console.error("Error handling message:", error);

        senderWindow.postMessage(errMsg, "*");
      })
      .finally(() => {
        this.pendingTasks.delete(message.messageId);
      });
  }

  private acknowledgeSender(
    senderWindow: Window,
    messageId: string,
    channelId: string | undefined,
    payload: any
  ): void {
    const message: IMCMessage = {
      messageId: messageId,
      channelId: channelId,
      type: IMCMessageTypeEnum.SignalAcknowledge,
      payload: payload,
      from: this.windowId,
    };
    senderWindow.postMessage(message, "*");
  }

  private ignoreSender(senderWindow: Window, message: IMCMessage) {
    // Ignore the message if no handler is found
    senderWindow.postMessage(
      {
        messageId: message.messageId,
        channelId: message.channelId,
        type: IMCMessageTypeEnum.SignalIgnore,
        payload: `No handler for message type: ${message.type}`,
        from: this.windowId,
      } as IMCMessage,
      "*"
    );
  }
}
