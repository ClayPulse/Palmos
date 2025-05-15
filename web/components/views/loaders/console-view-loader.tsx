import { Extension, InstalledAgent } from "@/lib/types";
import { useContext, useEffect, useState } from "react";
import { EditorContext } from "../../providers/editor-context-provider";
import ExtensionLoader from "../../misc/extension-loader";
import {
  Agent,
  ConnectionListener,
  IMCMessage,
  IMCMessageTypeEnum,
} from "@pulse-editor/shared-utils";
import Loading from "../../interface/loading";
import { useTheme } from "next-themes";
import { InterModuleCommunication } from "@pulse-editor/shared-utils";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";
import { IMCContext } from "@/components/providers/imc-provider";

export default function ConsoleViewLoader({
  consoleExt,
}: {
  consoleExt: Extension | undefined;
}) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const [usedExtension, setUsedExtension] = useState<Extension | undefined>(
    undefined,
  );
  const [hasExtension, setHasExtension] = useState(false);

  const [isExtensionWindowReady, setIsExtensionWindowReady] = useState(false);
  const [isExtensionLoaded, setIsExtensionLoaded] = useState(false);

  const { resolvedTheme } = useTheme();

  const { platformApi } = usePlatformApi();

  const [connectionListener, setConnectionListener] = useState<
    ConnectionListener | undefined
  >(undefined);

  const [remoteModuleId, setRemoteModuleId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    function getAndLoadExtension() {
      const extension = consoleExt;
      if (extension === undefined) {
        setHasExtension(false);
        setUsedExtension(undefined);
        return;
      }
      setUsedExtension(extension);
      setHasExtension(true);

      // Create IMC channel
      if (imcContext?.polyIMC) {
        const cl = new ConnectionListener(
          imcContext.polyIMC,
          getHandlerMap(),
          (senderWindow: Window, message: IMCMessage) => {
            console.log("Extension window ready.");
            setIsExtensionWindowReady((prev) => true);
            setIsExtensionLoaded((prev) => false);

            const moduleId = message.from;
            setRemoteModuleId(moduleId);

            // Close the connection listener
            if (connectionListener) {
              connectionListener.close();
              setConnectionListener(undefined);
            }
          },
        );

        setConnectionListener(cl);
      }
    }

    if (consoleExt) {
      // Reset the extension and IMC
      if (imcContext?.polyIMC && remoteModuleId) {
        imcContext?.polyIMC.removeChannel(remoteModuleId);

        setIsExtensionWindowReady(false);
        setIsExtensionLoaded(false);
        setUsedExtension(undefined);
      }
      getAndLoadExtension();
    }
  }, [consoleExt]);

  useEffect(() => {
    // Send theme update to the extension
    if (isExtensionWindowReady && remoteModuleId) {
      imcContext?.polyIMC?.sendMessage(
        remoteModuleId,
        IMCMessageTypeEnum.ThemeChange,
        resolvedTheme,
      );
    }
  }, [isExtensionWindowReady, remoteModuleId, resolvedTheme]);

  // When the editor context changes, update the IMC receiver handler map
  // to include the new handlers for the extension
  useEffect(() => {
    if (remoteModuleId) {
      imcContext?.polyIMC?.updateChannelReceiverHandlerMap(
        remoteModuleId,
        getHandlerMap(),
      );
    }
  }, [editorContext, imcContext]);

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
          {connectionListener && (
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
