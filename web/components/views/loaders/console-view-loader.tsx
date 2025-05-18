import { Extension } from "@/lib/types";
import { useContext, useEffect, useRef, useState } from "react";
import { EditorContext } from "../../providers/editor-context-provider";
import ExtensionLoader from "../../extension/extension-loader";
import {
  ConnectionListener,
  IMCMessage,
  IMCMessageTypeEnum,
  ViewModel,
} from "@pulse-editor/shared-utils";
import Loading from "../../interface/loading";
import { useTheme } from "next-themes";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";
import { IMCContext } from "@/components/providers/imc-provider";
import { v4 } from "uuid";

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

  const [isExtensionLoaded, setIsExtensionLoaded] = useState(false);
  const [isExtensionWindowReady, setIsExtensionWindowReady] = useState(false);

  const { resolvedTheme } = useTheme();

  const { platformApi } = usePlatformApi();

  const [remoteWindowId, setRemoteWindowId] = useState<string | undefined>(
    undefined,
  );

  const [model, setModel] = useState<ViewModel | undefined>(undefined);

  const clRef = useRef<ConnectionListener | null>(null);

  useEffect(() => {
    if (remoteWindowId && clRef.current) {
      clRef.current.close();
      clRef.current = null;
    }
  }, [remoteWindowId]);

  useEffect(() => {
    const newModel: ViewModel = {
      viewId: v4(),
      isFocused: false,
      extensionConfig: usedExtension?.config,
    };

    setModel(newModel);

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      openedViewModels: [...prev.openedViewModels, newModel],
    }));

    return () => {
      // Remove the view model from the editor context
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        openedViewModels: prev.openedViewModels.filter(
          (view) => view.viewId !== newModel.viewId,
        ),
      }));
      // Reset the extension and IMC
      if (imcContext?.polyIMC && remoteWindowId) {
        imcContext?.polyIMC.removeChannel(remoteWindowId);
      }
    };
  }, []);

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
            setIsExtensionWindowReady((prev) => true);
            setIsExtensionLoaded((prev) => false);

            const moduleId = message.from;
            setRemoteWindowId(() => moduleId);
          },
        );
        clRef.current = cl;
      }
    }

    if (consoleExt) {
      getAndLoadExtension();
    }
  }, [consoleExt]);

  useEffect(() => {
    // Send theme update to the extension
    if (isExtensionWindowReady && remoteWindowId) {
      imcContext?.polyIMC?.sendMessage(
        remoteWindowId,
        IMCMessageTypeEnum.ThemeChange,
        resolvedTheme,
      );
    }
  }, [isExtensionWindowReady, remoteWindowId, resolvedTheme]);

  // When the editor context changes, update the IMC receiver handler map
  // to include the new handlers for the extension
  useEffect(() => {
    if (remoteWindowId) {
      imcContext?.polyIMC?.updateChannelReceiverHandlerMap(
        remoteWindowId,
        getHandlerMap(),
      );
    }
  }, [editorContext, imcContext, remoteWindowId]);

  useEffect(() => {
    if (usedExtension && model) {
      if (model.extensionConfig !== usedExtension.config) {
        setModel({
          ...model,
          extensionConfig: usedExtension.config,
        });
      }
    }
  }, [usedExtension, model]);

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
          setIsExtensionLoaded((prev) => true);
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
          {model && (
            <ExtensionLoader
              key={usedExtension.config.id}
              viewId={model.viewId}
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
