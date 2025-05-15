import { Extension } from "@/lib/types";
import { useContext, useEffect, useState } from "react";
import { EditorContext } from "../../providers/editor-context-provider";
import FileViewLayout from "../layout";
import ExtensionLoader from "../../misc/extension-loader";
import {
  ConnectionListener,
  FileViewModel,
  IMCMessage,
  IMCMessageTypeEnum,
  InterModuleCommunication,
} from "@pulse-editor/shared-utils";
import Loading from "../../interface/loading";
import { useTheme } from "next-themes";
import { IMCContext } from "@/components/providers/imc-provider";

export default function FileViewLoader({
  model,
  updateFileView,
}: {
  model: FileViewModel;
  updateFileView: (model: FileViewModel) => void;
}) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const [usedExtension, setUsedExtension] = useState<Extension | undefined>(
    undefined,
  );
  const [hasExtension, setHasExtension] = useState(true);

  const [isExtensionWindowReady, setIsExtensionWindowReady] = useState(false);
  const [isExtensionLoaded, setIsExtensionLoaded] = useState(false);

  const { resolvedTheme } = useTheme();

  const [fileUri, setFileUri] = useState<string | undefined>(undefined);

  const [connectionListener, setConnectionListener] = useState<
    ConnectionListener | undefined
  >(undefined);

  const [remoteModuleId, setRemoteModuleId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (fileUri !== model.filePath) setFileUri(model.filePath);
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
            imcContext?.polyIMC,
            getHandlerMap(),
            (senderWindow: Window, message: IMCMessage) => {
              setIsExtensionWindowReady((prev) => true);
              setIsExtensionLoaded((prev) => false);

              const moduleId = message.from;
              setRemoteModuleId(moduleId);

              // Close the listener when the extension is connected
              if (connectionListener) {
                connectionListener.close();
                setConnectionListener(undefined);
              }
            },
          );

          setConnectionListener(cl);
        }
      }
    }

    if (fileUri) {
      // Reset the extension and IMC when the file URI changes
      if (imcContext?.polyIMC && remoteModuleId) {
        // Remove the channel from the IMC provider
        imcContext.polyIMC.removeChannel(remoteModuleId);

        setIsExtensionWindowReady(false);
        setIsExtensionLoaded(false);
        setUsedExtension(undefined);
      }
      getAndLoadExtension();
    }
  }, [fileUri]);

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
            const payload: FileViewModel = message.payload;
            updateFileView(payload);
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
    <FileViewLayout height="100%" width="100%">
      {usedExtension ? (
        <div className="relative h-full w-full">
          {!isExtensionLoaded && (
            <div className="absolute top-0 left-0 h-full w-full">
              <Loading />
            </div>
          )}
          {connectionListener && (
            <ExtensionLoader
              key={fileUri}
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
        <div>
          No default view found for this file type. Find a compatible extension
          in marketplace, and enable it in settings as the default method to
          open this file.
        </div>
      )}
    </FileViewLayout>
  );
}
