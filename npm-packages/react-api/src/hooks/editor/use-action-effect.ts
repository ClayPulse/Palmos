import { createInstance } from "@module-federation/runtime";
import {
  Action,
  IMCMessage,
  IMCMessageTypeEnum,
  ReceiverHandler,
} from "@pulse-editor/shared-utils";
import { DependencyList, useEffect, useRef, useState } from "react";
import useIMC from "../imc/use-imc";

/**
 * Register an app action to listen to IMC messages from the core,
 * and pass to the action to handle.
 * This will attach side effects to the action
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
export default function useActionEffect(
  params: {
    actionName: string;
    beforeAction?: (args: any) => Promise<any>;
    afterAction?: (args: any) => Promise<any>;
  },
  deps: DependencyList,
  isExtReady: boolean = true,
) {
  const { isReady, imc } = useIMC(getReceiverHandlerMap(), "register-action");

  // Queue to hold commands until extension is ready
  const commandQueue = useRef<{ args: any; resolve: (v: any) => void }[]>([]);
  const isCommandExecuting = useRef(false);

  const [remoteOrigin, setRemoteOrigin] = useState<string | undefined>(
    undefined,
  );

  const [beforeAction, setBeforeAction] = useState<
    ((args: any) => Promise<any>) | undefined
  >(params.beforeAction);

  const [afterAction, setAfterAction] = useState<
    ((result: any) => Promise<any>) | undefined
  >(params.afterAction);

  const [actionHandler, setActionHandler] = useState<
    ((args: any) => Promise<any>) | undefined
  >(undefined);

  useEffect(() => {
    async function fetchRemoteOrigin() {
      const origin = await imc?.sendMessage(
        IMCMessageTypeEnum.EditorGetAppOrigin,
        {
          actionName: params.actionName,
        },
      );

      setRemoteOrigin(origin);
    }

    if (isReady) {
      fetchRemoteOrigin();
    }
  }, [isReady]);

  // Flush queued commands when isExtReady becomes true
  useEffect(() => {
    async function runQueuedCommands() {
      const pendingCMDs = [...commandQueue.current];
      commandQueue.current = [];
      for (const cmd of pendingCMDs) {
        const { args, resolve } = cmd;
        if (isCommandExecuting.current) {
          return;
        }
        isCommandExecuting.current = true;
        const res = await executeAction(args);
        isCommandExecuting.current = false;
        resolve(res);
      }
    }

    if (isExtReady && commandQueue.current.length > 0) {
      runQueuedCommands();
    }
  }, [isExtReady]);

  useEffect(() => {
    async function getActionInfo(actionName: string): Promise<{
      appId: string;
      version: string;
      actionInfo: Action;
    }> {
      // Read actions from pulse.config.json
      const pulseConfig = await fetch("/pulse.config.json");
      const config = await pulseConfig.json();
      const actionInfo = config.actions?.find(
        (action: Action) => action.name === actionName,
      );

      if (!actionInfo) {
        console.error(`Action ${actionName} not found in pulse.config.json`);
        throw new Error(`Action ${actionName} not found in pulse.config.json`);
      }

      return {
        appId: config.id,
        version: config.version,
        actionInfo,
      };
    }

    async function updateAction() {
      // Register or update action.
      // This will only pass signature info to the editor.
      // The actual handler is stored in this hook,
      // so the execution happens inside the extension app.
      const { appId, version, actionInfo } = await getActionInfo(
        params.actionName,
      );

      let func: (args: any) => Promise<any>;

      if (remoteOrigin) {
        // Production: load handler from Module Federation remote
        const loadedFunc = await loadAppActionFromMF(
          actionInfo.name,
          appId,
          remoteOrigin,
          version,
        );

        if (!loadedFunc) {
          console.error(
            `Failed to load action handler for ${actionInfo.name}`,
          );
          throw new Error(
            `Failed to load action handler for ${actionInfo.name}`,
          );
        }

        func = loadedFunc;
      } else {
        // Preview mode: no MF server, call the skill endpoint via fetch
        const origin = window.location.origin;
        func = async (args: any) => {
          const response = await fetch(
            `${origin}/skill/${actionInfo.name}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(args),
            },
          );
          return response.json();
        };
      }

      setActionHandler(() => func);

      await imc?.sendMessage(IMCMessageTypeEnum.EditorRegisterAction, {
        name: actionInfo.name,
        description: actionInfo.description,
        parameters: actionInfo.parameters,
        returns: actionInfo.returns,
      });

      // Update receiver
      imc?.updateReceiverHandlerMap(getReceiverHandlerMap(func));
    }

    if (isExtReady) {
      updateAction();
    }
  }, [
    params.actionName,
    imc,
    isExtReady,
    remoteOrigin,
    beforeAction,
    afterAction,
  ]);

  useEffect(() => {
    setBeforeAction(() => params.beforeAction ?? (async () => {}));
    setAfterAction(() => params.afterAction ?? (async () => {}));
  }, [...deps]);

  async function executeAction(
    args: any,
    actionHandlerFunc?: (args: any) => Promise<any>,
  ) {
    const handler = actionHandlerFunc ?? actionHandler;
    if (!handler) {
      throw new Error("Action handler is not set");
    }

    let beforeRes;
    if (beforeAction) {
      beforeRes = await beforeAction(args);
    }

    let res = await handler(beforeRes !== undefined ? beforeRes : args);

    let afterRes;
    if (afterAction) {
      afterRes = await afterAction(res);
    }

    return afterRes !== undefined ? afterRes : res;
  }

  function getReceiverHandlerMap(
    actionHandlerFunc?: (args: any) => Promise<any>,
  ): Map<IMCMessageTypeEnum, ReceiverHandler> {
    const receiverHandlerMap = new Map<IMCMessageTypeEnum, ReceiverHandler>([
      [
        IMCMessageTypeEnum.EditorRunAppAction,
        async (_senderWindow: Window, message: IMCMessage) => {
          const { name: requestedName, args }: { name: string; args: any } =
            message.payload;

          if (params.actionName !== requestedName) {
            throw new Error("Message ignored by receiver");
          }
          /*        This should go to where the action is actually handled   
          // Validate parameters
          const actionParams = actionInfo.parameters ?? {};

          const requiredParamCount = Object.entries(actionParams).filter(
            ([, paramInfo]) => !(paramInfo as TypedVariable).optional,
          ).length;

          if (Object.keys(args).length < requiredParamCount) {
            throw new Error(
              `Invalid number of parameters: expected at least${
                Object.keys(actionParams).length
              }, got ${Object.keys(args).length}`,
            );
          }

          // Check types
          for (const [key, value] of Object.entries(args)) {
            if (actionParams[key] === undefined) {
              throw new Error(`Invalid parameter: ${key}`);
            }
            if (
              typeof value !== actionParams[key].type &&
              // Allow object for "app-instance"
              (actionParams[key].type !== "app-instance" ||
                typeof value !== "object")
            ) {
              throw new Error(
                `Invalid type for parameter ${key}: expected ${
                  actionParams[key].type
                }, got ${typeof value}. Value received: ${value}`,
              );
            }
          } */

          // If extension is ready, execute immediately
          if (isExtReady) {
            const result = await executeAction(args, actionHandlerFunc);
            return result;
          }

          // Otherwise, queue the command and return when executed
          return new Promise((resolve) => {
            commandQueue.current.push({ args, resolve });
          });
        },
      ],
    ]);
    return receiverHandlerMap;
  }

  async function loadAppActionFromMF(
    func: string,
    appId: string,
    remoteOrigin: string,
    version: string,
  ) {
    // here we assign the return value of the init() function, which can be used to do some more complex
    // things with the module federation runtime
    const instance = createInstance({
      name: appId + "_client",
      remotes: [
        {
          name: appId + "_client",
          entry: `${remoteOrigin}/${appId}/${version}/client/remoteEntry.js`,
        },
      ],
    });

    const loadedFunc =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await instance.loadRemote<any>(`${appId}_client/skill/${func}`)).default;

    return loadedFunc;
  }

  return {
    isReady,
    runAppAction: actionHandler,
  };
}
