import { Extension, InstalledAgent } from "@/lib/types";
import { useContext, useEffect, useState } from "react";
import { EditorContext } from "../../providers/editor-context-provider";
import ExtensionLoader from "../../misc/extension-loader";
import {
  Agent,
  IMCMessage,
  IMCMessageTypeEnum,
} from "@pulse-editor/shared-utils";
import Loading from "../../interface/loading";
import { useTheme } from "next-themes";
import { InterModuleCommunication } from "@pulse-editor/shared-utils";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";

export default function ConsoleViewLoader({
  consoleExt,
}: {
  consoleExt: Extension | undefined;
}) {
  const editorContext = useContext(EditorContext);
  const [usedExtension, setUsedExtension] = useState<Extension | undefined>(
    undefined,
  );
  const [hasExtension, setHasExtension] = useState(false);

  const [isExtensionWindowReady, setIsExtensionWindowReady] = useState(false);
  const [isExtensionLoaded, setIsExtensionLoaded] = useState(false);

  const [imc, setImc] = useState<InterModuleCommunication | undefined>(
    undefined,
  );

  const { resolvedTheme } = useTheme();

  const { platformApi } = usePlatformApi();

  useEffect(() => {
    function getAndLoadExtension() {
      const extension = consoleExt;
      if (extension === undefined) {
        setHasExtension(false);
        setUsedExtension(undefined);
        return;
      }

      // Create IMC
      const newImc = new InterModuleCommunication("Pulse Editor Main");
      newImc.initThisWindow(window);
      newImc.updateReceiverHandlerMap(getHandlerMap());
      setImc(newImc);

      setUsedExtension(extension);
      setHasExtension(true);
    }

    if (consoleExt) {
      // Reset the extension and IMC
      if (imc) {
        imc.close();
        setImc(undefined);

        setIsExtensionWindowReady(false);
        setIsExtensionLoaded(false);
        setUsedExtension(undefined);
      }
      getAndLoadExtension();
    }
  }, [consoleExt]);

  useEffect(() => {
    // Send theme update to the extension
    if (isExtensionWindowReady && imc) {
      imc.sendMessage(IMCMessageTypeEnum.ThemeChange, resolvedTheme);
    }
  }, [isExtensionWindowReady, imc, resolvedTheme]);

  useEffect(() => {
    imc?.updateReceiverHandlerMap(getHandlerMap());
  }, [editorContext, imc]);

  function getHandlerMap() {
    const newMap = new Map<
      IMCMessageTypeEnum,
      {
        (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ): Promise<any>;
      }
    >([
      [
        IMCMessageTypeEnum.Ready,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          console.log("Extension window ready.");
          if (!imc) {
            throw new Error("IMC not initialized.");
          }
          imc.initOtherWindow(senderWindow);
          setIsExtensionWindowReady((prev) => true);
          setIsExtensionLoaded((prev) => false);
        },
      ],
      [
        IMCMessageTypeEnum.Loaded,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          console.log("Extension loaded.");
          setIsExtensionLoaded((prev) => true);
        },
      ],
      // [
      //   IMCMessageTypeEnum.RunAgentMethod,
      //   async (
      //     senderWindow: Window,
      //     message: IMCMessage,
      //     abortSignal?: AbortSignal,
      //   ) => {
      //     if (!message.payload) {
      //       throw new Error("No agent method config provided.");
      //     }

      //     const {
      //       agentName,
      //       methodName,
      //       parameters,
      //     }: {
      //       agentName: string;
      //       methodName: string;
      //       parameters: Record<string, any>;
      //     } = message.payload;

      //     const agent = editorContext?.persistSettings?.installedAgents?.find(
      //       (agent) => agent.name === agentName,
      //     );

      //     if (!agent) {
      //       throw new Error("Agent not found.");
      //     }

      //     const result = await runAgentMethod(
      //       agent,
      //       methodName,
      //       parameters,
      //       abortSignal,
      //     );

      //     return result;
      //   },
      // ],
      [
        IMCMessageTypeEnum.RequestTerminal,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const platform = getPlatform();
          // Get a shell terminal from native platform APIs
          if (platform === PlatformEnum.Capacitor) {
            return {
              websocketUrl: editorContext?.persistSettings?.mobileHost,
            };
          } else {
            const wsUrl = await platformApi?.createTerminal();
            return {
              websocketUrl: wsUrl,
            };
          }
        },
      ],
    ]);
    return newMap;
  }

  return (
    <div className="relative h-full w-full">
      {usedExtension ? (
        <div className="relative h-full w-full">
          {!isExtensionLoaded && (
            <div className="absolute top-0 left-0 h-full w-full">
              <Loading />
            </div>
          )}
          {imc && (
            <ExtensionLoader
              key={usedExtension.config.id}
              remoteOrigin={usedExtension.remoteOrigin}
              moduleId={usedExtension.config.id}
              moduleVersion={usedExtension.config.version}
            />
          )}
        </div>
      ) : hasExtension ? (
        <div className="absolute top-0 left-0 h-full w-full">
          <Loading />
        </div>
      ) : (
        <div>Select a tab to view console.</div>
      )}
    </div>
  );
}
