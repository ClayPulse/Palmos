import { v4 } from "uuid";
import { IMCMessage, IMCMessageTypeEnum } from "../types/types";

export class MessageSender {
  private targetWindow: Window;
  private timeout: number;

  private pendingMessages: Map<
    string,
    { resolve: (value: any) => void; reject: (reason: any) => void }
  >;

  private moduleId: string;

  constructor(targetWindow: Window, timeout: number, moduleId: string) {
    this.targetWindow = targetWindow;
    this.timeout = timeout;

    this.pendingMessages = new Map();
    this.moduleId = moduleId;
  }

  public async sendMessage(
    handlingType: IMCMessageTypeEnum,
    payload?: any,
    abortSignal?: AbortSignal
  ): Promise<any> {
    // Generate a unique id for the message using timestamp
    const id = v4() + new Date().getTime().toString();
    const message: IMCMessage = {
      id,
      type: handlingType,
      payload: payload,
      from: this.moduleId,
    };

    return new Promise((resolve, reject) => {
      // If the signal is already aborted, reject immediately
      if (abortSignal?.aborted) {
        return reject(new Error("Request aborted"));
      }

      const abortHandler = () => {
        this.pendingMessages.delete(id);
        // Notify the target window that the request has been aborted
        this.targetWindow.postMessage(
          {
            id,
            type: IMCMessageTypeEnum.SignalAbort,
            payload: JSON.stringify({
              status: "Task aborted",
              data: null,
            }),
          },
          "*"
        );
        reject(new Error("Request aborted"));
      };
      // Attach abort listener
      abortSignal?.addEventListener("abort", abortHandler);

      // Check timeout
      const timeoutId = setTimeout(() => {
        this.pendingMessages.delete(id);
        abortSignal?.removeEventListener("abort", abortHandler);
        reject(new Error("Communication with Pulse Editor timeout."));
      }, this.timeout);
      // Ensure cleanup on resolution
      const onResolve = (value: any) => {
        clearTimeout(timeoutId);
        abortSignal?.removeEventListener("abort", abortHandler);
        this.pendingMessages.delete(id);
        resolve(value);
      };

      const onReject = (reason: any) => {
        clearTimeout(timeoutId);
        abortSignal?.removeEventListener("abort", abortHandler);
        this.pendingMessages.delete(id);
        reject(reason);
      };
      this.pendingMessages.set(id, {
        resolve: onResolve,
        reject: onReject,
      });

      // Send message
      this.targetWindow.postMessage(message, "*");
    });
  }

  public getPendingMessage(id: string) {
    return this.pendingMessages.get(id);
  }
}
