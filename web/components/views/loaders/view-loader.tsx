import ExtensionLoader from "@/components/extension/extension-loader";
import Loading from "@/components/interface/loading";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { IMCContext } from "@/components/providers/imc-provider";
import { Extension } from "@/lib/types";
import {
  ConnectionListener,
  ExtensionTypeEnum,
  IMCMessage,
  IMCMessageTypeEnum,
  ReceiverHandler,
  ViewModel,
} from "@pulse-editor/shared-utils";
import { useTheme } from "next-themes";
import { useContext, useEffect, useRef, useState } from "react";

/**
 * The view loader maintain states for extensions.
 * It may not decide to reload the extension if resources can
 * be reused.
 */
export default function ViewLoader({
  viewModel,
  setViewModel,
}: {
  viewModel: ViewModel;
  setViewModel: (model: ViewModel) => void;
}) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const [currentExtension, setCurrentExtension] = useState<
    Extension | undefined
  >();
  const [currentViewId, setCurrentViewId] = useState<string | undefined>(
    undefined,
  );

  const [isMissingExtension, setIsMissingExtension] = useState<boolean>(false);
  const [isLookingForExtension, setIsLookingForExtension] =
    useState<boolean>(true);
  const [isLoadingExtension, setIsLoadingExtension] = useState<boolean>(false);

  const clRef = useRef<ConnectionListener | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const { resolvedTheme } = useTheme();

  // Update view Id when the view model changes
  useEffect(() => {
    // If the view Id changes (e.g. when switching file but not extension),
    // remove the old IMC channel and create a new one
    if (viewModel.viewId !== currentViewId) {
      if (currentViewId && imcContext?.polyIMC?.hasChannel(currentViewId)) {
        imcContext.polyIMC.removeChannel(currentViewId);
      }
      setCurrentViewId(viewModel.viewId);
    }
  }, [viewModel]);

  // Reset the connection when the view ID changes
  useEffect(() => {
    function getExtension(model: ViewModel) {
      // File view type extension needs to match the file type.
      // For example:
      //   .txt, .md, .js for code editor extension;
      //   .png, .jpg for image viewer extension.
      if (model.file) {
        const path = model.file.path;

        // Get the filename from the file path
        const fileName = path.split("/").pop();
        // Remove the first part of the filename -- remove front part of the filename
        const fileType = fileName?.split(".").slice(1).join(".") ?? "";

        // Get the extension config from the file type
        const map = editorContext?.persistSettings?.defaultFileTypeExtensionMap;

        if (!map) {
          throw new Error("Extension map not found. Something went wrong.");
        }

        const ext = map[fileType];
        if (!ext) {
          setIsMissingExtension(true);
        } else {
          setIsMissingExtension(false);
          setCurrentExtension(ext);
          setViewModel({
            ...viewModel,
            extensionConfig: ext.config,
          });
        }
      }
      // Console view type extension does not need a file object,
      // hence can be loaded directly
      else {
        const extId = model.extensionConfig?.id;

        const ext = editorContext?.persistSettings?.extensions?.find(
          (extension) => extension.config.id === extId,
        );

        if (!ext) {
          throw new Error("Extension not found. Something went wrong.");
        }

        setCurrentExtension(ext);
        setViewModel({
          ...viewModel,
          extensionConfig: ext.config,
        });
      }
    }

    if (currentViewId) {
      // Listen for an incoming extension connection
      listenForExtensionConnection();

      setIsLookingForExtension(true);
      setCurrentExtension(undefined);
      setIsMissingExtension(false);
      getExtension(viewModel);
      setIsLookingForExtension(false);
    }
  }, [currentViewId]);

  // Set is loading extension to true when current extension changes
  useEffect(() => {
    if (currentExtension) {
      setIsLoadingExtension(true);
    } else {
      setIsLoadingExtension(false);
    }
  }, [currentExtension]);

  // When IMC is connected, remove the connection listener
  useEffect(() => {
    if (isConnected && clRef.current) {
      clRef.current.close();
      clRef.current = null;
    }
  }, [isConnected]);

  // Send theme update to the extension
  useEffect(() => {
    if (currentViewId && imcContext?.polyIMC?.hasChannel(currentViewId)) {
      imcContext?.polyIMC?.sendMessage(
        currentViewId,
        IMCMessageTypeEnum.ThemeChange,
        resolvedTheme,
      );
    }
  }, [resolvedTheme]);

  // Update handler map when editor context changes
  useEffect(() => {
    // Update the connection listener handler map if exists
    if (clRef.current) {
      clRef.current.updateReceiverHandlerMap(getHandlerMap(viewModel));
    }

    // Update the IMC receiver handler map
    if (isConnected && imcContext?.polyIMC?.hasChannel(viewModel.viewId)) {
      imcContext.polyIMC.updateChannelReceiverHandlerMap(
        viewModel.viewId,
        getHandlerMap(viewModel),
      );
    }
  }, [viewModel, isConnected]);

  function getHandlerMap(model: ViewModel) {
    const newMap = new Map<IMCMessageTypeEnum, ReceiverHandler>();

    // Add loaded handler
    newMap.set(
      IMCMessageTypeEnum.Loaded,
      async (
        senderWindow: Window,
        message: IMCMessage,
        abortSignal?: AbortSignal,
      ) => {
        setIsLoadingExtension((prev) => false);
      },
    );

    if (model.extensionConfig?.extensionType === ExtensionTypeEnum.FileView) {
      newMap.set(
        IMCMessageTypeEnum.WriteViewFile,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          if (message.payload) {
            const payload: ViewModel = message.payload;
            setViewModel(payload);
          }
        },
      );
      newMap.set(
        IMCMessageTypeEnum.RequestViewFile,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          return model;
        },
      );
    } else if (
      model.extensionConfig?.extensionType === ExtensionTypeEnum.ConsoleView
    ) {
      // Add console view handlers here
    }

    return newMap;
  }

  function listenForExtensionConnection() {
    setIsConnected(false);

    // Create IMC channel
    if (imcContext?.polyIMC) {
      const cl = new ConnectionListener(
        imcContext.polyIMC,
        getHandlerMap(viewModel),
        (senderWindow: Window, message: IMCMessage) => {
          setIsConnected((prev) => true);
        },
      );
      clRef.current = cl;
    }
  }

  return (
    <div className="relative h-full w-full">
      {isLookingForExtension ? (
        <div className="absolute top-0 left-0 h-full w-full">
          <Loading />
        </div>
      ) : isMissingExtension ? (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-text1 text-sm">
            No default view found for this file type. Find a compatible
            extension in marketplace, and enable it in settings as the default
            method to open this file.
          </p>
        </div>
      ) : (
        <div className="relative h-full w-full">
          {isLoadingExtension && (
            <div className="absolute top-0 left-0 h-full w-full">
              <Loading />
            </div>
          )}
          {currentExtension && currentViewId && (
            <ExtensionLoader
              viewId={currentViewId}
              remoteOrigin={currentExtension.remoteOrigin}
              moduleId={currentExtension.config.id}
              moduleVersion={currentExtension.config.version}
            />
          )}
        </div>
      )}
    </div>
  );
}
