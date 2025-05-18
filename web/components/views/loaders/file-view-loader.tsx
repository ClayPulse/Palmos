import { Extension } from "@/lib/types";
import { use, useContext, useEffect, useRef, useState } from "react";
import { EditorContext } from "../../providers/editor-context-provider";
import ExtensionViewLayout from "../layout";
import ExtensionLoader from "../../extension/extension-loader";
import {
  ConnectionListener,
  ViewModel,
  IMCMessage,
  IMCMessageTypeEnum,
} from "@pulse-editor/shared-utils";
import Loading from "../../interface/loading";
import { useTheme } from "next-themes";
import { IMCContext } from "@/components/providers/imc-provider";

export default function FileViewLoader({
  model,
  updateViewModel,
}: {
  model: ViewModel;
  updateViewModel: (model: ViewModel) => void;
}) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const [usedExtension, setUsedExtension] = useState<Extension | undefined>(
    undefined,
  );
  const [hasExtension, setHasExtension] = useState(true);

  const [isExtensionLoaded, setIsExtensionLoaded] = useState(false);
  const [isExtensionWindowReady, setIsExtensionWindowReady] = useState(false);

  const { resolvedTheme } = useTheme();

  const [fileUri, setFileUri] = useState<string | undefined>(undefined);

  const [remoteWindowId, setRemoteWindowId] = useState<string | undefined>(
    undefined,
  );

  const clRef = useRef<ConnectionListener | null>(null);

  useEffect(() => {
    if (remoteWindowId && clRef.current) {
      clRef.current.close();
      clRef.current = null;
    }
  }, [remoteWindowId]);

  useEffect(() => {
    if (fileUri !== model.file?.path) {
      setFileUri(model.file?.path);
    }
  }, [model]);

  useEffect(() => {
    function getAndLoadExtension() {
      // Get the filename from the file path
      const fileName = fileUri!.split("/").pop();
      // Remove the first part of the filename -- remove front part of the filename
      const fileType = fileName?.split(".").slice(1).join(".") ?? "";

      // Get the extension config from the file type
      const map = editorContext?.persistSettings?.defaultFileTypeExtensionMap;

      if (map) {
        const extension = map[fileType];
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
              setRemoteWindowId((prev) => moduleId);
            },
          );
          clRef.current = cl;
        }
      }
    }

    if (fileUri) {
      // Reset the extension and IMC when the file URI changes
      if (imcContext?.polyIMC && remoteWindowId) {
        // Remove the channel from the IMC provider
        imcContext.polyIMC.removeChannel(remoteWindowId);
        setRemoteWindowId(undefined);

        setIsExtensionWindowReady(false);
        setIsExtensionLoaded(false);
        setUsedExtension(undefined);
      }
      getAndLoadExtension();
    }
  }, [fileUri]);

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
    if (usedExtension) {
      updateViewModel({
        ...model,
        extensionConfig: usedExtension.config,
      });
    }
  }, [usedExtension]);

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
      [
        IMCMessageTypeEnum.WriteViewFile,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          if (message.payload) {
            const payload: ViewModel = message.payload;
            updateViewModel(payload);
          }
        },
      ],
      [
        IMCMessageTypeEnum.RequestViewFile,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          return model;
        },
      ],
    ]);
    return newMap;
  }

  return (
    <ExtensionViewLayout height="100%" width="100%">
      {usedExtension ? (
        <div className="relative h-full w-full">
          {!isExtensionLoaded && (
            <div className="absolute top-0 left-0 h-full w-full">
              <Loading />
            </div>
          )}

          <ExtensionLoader
            key={fileUri}
            viewId={model.viewId}
            remoteOrigin={usedExtension.remoteOrigin}
            moduleId={usedExtension.config.id}
            moduleVersion={usedExtension.config.version}
          />
        </div>
      ) : hasExtension ? (
        <div className="absolute top-0 left-0 h-full w-full">
          <Loading />
        </div>
      ) : (
        <div>
          No default view found for this file type. Find a compatible extension
          in marketplace, and enable it in settings as the default method to
          open this file.
        </div>
      )}
    </ExtensionViewLayout>
  );
}
