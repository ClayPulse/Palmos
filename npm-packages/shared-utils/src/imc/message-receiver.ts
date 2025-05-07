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
  private moduleId: string;

  constructor(
    listenerMap: ReceiverHandlerMap,
    pendingTasks: Map<
      string,
      {
        controller: AbortController;
      }
    >,
    moduleId: string
  ) {
    this.handlerMap = listenerMap;
    this.pendingTasks = pendingTasks;
    this.moduleId = moduleId;
  }

  public receiveMessage(senderWindow: Window, message: IMCMessage) {
    // Not handling messages from self
    if (this.moduleId === message.from) return;

    // Log the message in dev mode
    if (process.env.NODE_ENV === "development") {
      console.log(
        `Module ${this.moduleId} received message from module ${message.from}:\n ${JSON.stringify(
          message
        )}`
      );
    }

    // Abort the task if the message type is Abort
    if (message.type === IMCMessageTypeEnum.Abort) {
      const id = message.id;
      const pendingTask = this.pendingTasks.get(id);

      if (pendingTask) {
        console.log("Aborting task", id);
        pendingTask.controller.abort();
        this.pendingTasks.delete(id);
      }

      return;
    }

    const handler = this.handlerMap.get(message.type);
    if (handler) {
      // Create abort controller to listen for abort signal from sender.
      // Then save the message id and abort controller to the pending tasks.
      const controller = new AbortController();
      const signal = controller.signal;
      this.pendingTasks.set(message.id, {
        controller,
      });

      const promise = handler(senderWindow, message, signal);
      promise
        .then((result) => {
          // Don't send the result if the task has been aborted
          if (signal.aborted) return;

          // Acknowledge the sender with the result if the message type is not Acknowledge
          if (message.type !== IMCMessageTypeEnum.Acknowledge) {
            this.acknowledgeSender(senderWindow, message.id, result);
          }
        })
        .catch((error) => {
          // Send the error message to the sender
          const errMsg: IMCMessage = {
            id: message.id,
            type: IMCMessageTypeEnum.Error,
            payload: error.message,
            from: this.moduleId,
          };

          senderWindow.postMessage(errMsg, "*");
        })
        .finally(() => {
          this.pendingTasks.delete(message.id);
        });
    }
  }

  private acknowledgeSender(
    senderWindow: Window,
    id: string,
    payload: any
  ): void {
    const message: IMCMessage = {
      id,
      type: IMCMessageTypeEnum.Acknowledge,
      payload: payload,
      from: this.moduleId,
    };
    senderWindow.postMessage(message, "*");
  }
}
