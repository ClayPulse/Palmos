import {
  Action,
  IMCMessage,
  IMCMessageTypeEnum,
  ReceiverHandler,
  TypedVariable,
} from "@pulse-editor/shared-utils";
import { DependencyList, useEffect, useRef, useState } from "react";
import useIMC from "../../lib/use-imc";

/**
 * Register an app action to listen to IMC messages from the core,
 * and pass to the action to handle.
 *
 * @param name Name of the command.
 * @param description Description of the command.
 * @param parameters Parameters of the command.
 * @param returns Return values of the command.
 * @param callbackHandler Callback handler function to handle the command.
 * @param deps Dependency list to re-register the action when changed.
 * @param isExtReady Whether the extension is ready to receive commands.
 * Useful for actions that need to wait for some certain app state to be ready.
 *
 */
export default function useRegisterAction(
  actionInfo: {
    name: string;
    description: string;
    parameters?: Record<string, TypedVariable>;
    returns?: Record<string, TypedVariable>;
  },
  callbackHandler: (args: any) => Promise<string | void>,
  deps: DependencyList,
  isExtReady: boolean = true
) {
  const { isReady, imc } = useIMC(getReceiverHandlerMap());

  // Queue to hold commands until extension is ready
  const commandQueue = useRef<{ args: any; resolve: (v: any) => void }[]>([]);

  const [action, setAction] = useState<Action>({
    name: actionInfo.name,
    description: actionInfo.description,
    parameters: actionInfo.parameters ?? {},
    returns: actionInfo.returns ?? {},
    handler: callbackHandler,
  });

  // Flush queued commands when isExtReady becomes true
  useEffect(() => {
    if (isExtReady && commandQueue.current.length > 0) {
      const pending = [...commandQueue.current];
      commandQueue.current = [];
      pending.forEach(async ({ args, resolve }) => {
        const res = await executeAction(args);
        resolve(res);
      });
    }
  }, [isExtReady]);

  useEffect(() => {
    async function updateAction() {
      // Register or update action.
      // This will only pass signature info to the editor.
      // The actual handler is stored in this hook,
      // so the execution happens inside the extension app.
      await imc?.sendMessage(IMCMessageTypeEnum.EditorRegisterAction, {
        name: action.name,
        description: action.description,
        parameters: action.parameters,
        returns: action.returns,
      });

      // Update receiver
      imc?.updateReceiverHandlerMap(getReceiverHandlerMap());
    }

    if (isExtReady) {
      updateAction();
    }
  }, [action, imc, isExtReady]);

  useEffect(() => {
    setAction((prev) => ({
      ...prev,
      name: actionInfo.name,
      description: actionInfo.description,
      parameters: actionInfo.parameters ?? {},
      returns: actionInfo.returns ?? {},
      handler: callbackHandler,
    }));
  }, [...deps]);

  async function executeAction(args: any) {
    if (!action.handler) return;

    const res = await action.handler(args);
    return res;
  }

  function getReceiverHandlerMap() {
    const receiverHandlerMap = new Map<IMCMessageTypeEnum, ReceiverHandler>([
      [
        IMCMessageTypeEnum.EditorRunAppAction,
        async (_senderWindow: Window, message: IMCMessage) => {
          const { name: requestedName, args }: { name: string; args: any } =
            message.payload;

          if (actionInfo.name === requestedName) {
            // Validate parameters
            const actionParams = actionInfo.parameters ?? {};
            if (Object.keys(args).length !== Object.keys(actionParams).length) {
              throw new Error(
                `Invalid number of parameters: expected ${
                  Object.keys(actionParams).length
                }, got ${Object.keys(args).length}`
              );
            }

            for (const [key, value] of Object.entries(args)) {
              if (actionParams[key] === undefined) {
                throw new Error(`Invalid parameter: ${key}`);
              }
              if (typeof value !== actionParams[key].type) {
                throw new Error(
                  `Invalid type for parameter ${key}: expected ${
                    actionParams[key].type
                  }, got ${typeof value}. Value received: ${value}`
                );
              }
            }

            // If extension is ready, execute immediately
            if (isExtReady) {
              return await executeAction(args);
            }

            // Otherwise, queue the command and return when executed
            return new Promise((resolve) => {
              commandQueue.current.push({ args, resolve });
            });
          }
        },
      ],
    ]);
    return receiverHandlerMap;
  }

  return {
    isReady,
  };
}
