import BaseAppLoader from "@/components/app-loaders/base-app-loader";
import Loading from "@/components/interface/status-screens/loading";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { IMCContext } from "@/components/providers/imc-provider";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { ExtensionApp } from "@/lib/types";
import { useDroppable } from "@dnd-kit/core";
import {
  ConnectionListener,
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
export default function SandboxAppLoader({
  viewModel,
  onInitialLoaded,
}: {
  viewModel: ViewModel;
  onInitialLoaded?: () => void;
}) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const { resolvedTheme } = useTheme();
  const { platformApi } = usePlatformApi();

  const { setNodeRef } = useDroppable({
    id: "app-node-view-" + viewModel.viewId,
    data: {
      viewId: viewModel.viewId,
    },
  });

  const [currentExtension, setCurrentExtension] = useState<
    ExtensionApp | undefined
  >();
  const [currentViewId, setCurrentViewId] = useState<string | undefined>(
    undefined,
  );

  const [isMissingExtension, setIsMissingExtension] = useState<boolean>(false);
  const [isLookingForExtension, setIsLookingForExtension] =
    useState<boolean>(true);
  const [isLoadingExtension, setIsLoadingExtension] = useState<boolean>(false);

  const clRef = useRef<ConnectionListener | null>(null);
  // const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Update view Id when the view model changes
  useEffect(() => {
    // If the view Id changes (e.g. when switching file but not extension),
    // remove the old IMC channel and create a new one
    if (viewModel.viewId !== currentViewId) {
      if (currentViewId && imcContext?.hasChannel(currentViewId)) {
        imcContext.removeViewChannels(currentViewId);
      }
      setCurrentViewId(viewModel.viewId);
    }
  }, [viewModel]);

  // Reset the connection when the view ID changes
  useEffect(() => {
    function getExtension(model: ViewModel, ext: ExtensionApp) {
      // // File view type extension needs to match the file type.
      // // For example:
      // //   .txt, .md, .js for code editor extension;
      // //   .png, .jpg for image viewer extension.
      // if (model.file) {
      //   const path = model.file.path;

      //   // Get the filename from the file path
      //   const fileName = path.split("/").pop();
      //   // Remove the first part of the filename -- remove front part of the filename
      //   const fileType = fileName?.split(".").slice(1).join(".") ?? "";

      //   // Get the extension config from the file type
      //   const map = editorContext?.persistSettings?.defaultFileTypeExtensionMap;

      //   if (!map) {
      //     throw new Error("Extension map not found. Something went wrong.");
      //   }

      //   const ext = map[fileType];
      //   if (!ext) {
      //     setIsMissingExtension(true);
      //   } else {
      //     setIsMissingExtension(false);
      //     setCurrentExtension(ext);
      //     setViewModel({
      //       ...viewModel,
      //       appConfig: ext.config,
      //     });
      //   }
      // }

      setCurrentExtension(ext);
    }

    if (currentViewId && !isInitialized) {
      const ext = editorContext?.persistSettings?.extensions?.find(
        (extension) => extension.config.id === viewModel.appConfig?.id,
      );

      if (!ext) {
        return;
      }

      // Listen for an incoming extension connection
      console.log(`[${currentViewId}]: Listening for app connection...`);
      setIsInitialized(true);
      listenForExtensionConnection();

      setIsLookingForExtension(true);
      setCurrentExtension(undefined);
      setIsMissingExtension(false);
      getExtension(viewModel, ext);
      setIsLookingForExtension(false);
    }
  }, [
    currentViewId,
    editorContext?.persistSettings?.extensions,
    isInitialized,
  ]);

  // Remove IMC and listener upon unmount
  useEffect(() => {
    return () => {
      clRef.current?.close();
      if (currentViewId && imcContext?.hasChannel(currentViewId)) {
        imcContext?.removeViewChannels(currentViewId);
      }
    };
  }, []);

  // Set is loading extension to true when current extension changes
  useEffect(() => {
    if (currentExtension) {
      setIsLoadingExtension(true);
    } else {
      setIsLoadingExtension(false);
    }
  }, [currentExtension]);

  // Send theme update to the extension when theme changes
  useEffect(() => {
    if (currentViewId && imcContext?.polyIMC?.hasChannel(currentViewId)) {
      imcContext?.polyIMC?.sendMessage(
        currentViewId,
        IMCMessageTypeEnum.EditorThemeUpdate,
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
    if (imcContext?.polyIMC?.hasChannel(viewModel.viewId)) {
      imcContext.polyIMC.updateChannelReceiverHandlerMap(
        viewModel.viewId,
        getHandlerMap(viewModel),
      );
    }
  }, [
    viewModel,
    editorContext?.editorStates,
    editorContext?.persistSettings,
    platformApi,
  ]);

  function getHandlerMap(model: ViewModel) {
    const newMap = new Map<IMCMessageTypeEnum, ReceiverHandler>();

    // Add loaded handler
    newMap.set(
      IMCMessageTypeEnum.EditorLoadingApp,
      async (
        senderWindow: Window,
        message: IMCMessage,
        abortSignal?: AbortSignal,
      ) => {
        const {
          isLoading,
        }: {
          isLoading: boolean;
        } = message.payload;
        console.log(`[${model.viewId}]: App is loading: `, isLoading);
        setIsLoadingExtension((prev) => isLoading);
        if (onInitialLoaded) {
          onInitialLoaded();
        }

        // Update with current theme
        // TODO: pass theme directly to app along with config when creating a new view
        if (currentViewId && imcContext?.polyIMC?.hasChannel(currentViewId)) {
          imcContext?.polyIMC?.sendMessage(
            currentViewId,
            IMCMessageTypeEnum.EditorThemeUpdate,
            resolvedTheme,
          );
        }
      },
    );

    return newMap;
  }

  function listenForExtensionConnection() {
    // Create IMC channel
    if (imcContext?.polyIMC) {
      const cl = new ConnectionListener(
        imcContext.polyIMC,
        getHandlerMap(viewModel),
        (senderWindow: Window, message: IMCMessage) => {
          console.log(`[${currentViewId}]: App connected.`);
        },
        viewModel.viewId,
      );
      clRef.current = cl;
    }
  }

  return (
    <div className="relative h-full w-full" ref={setNodeRef}>
      {isLookingForExtension ? (
        <div className="bg-content1 h-full w-full">
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
        <div
          className="relative h-full w-full data-[is-dragging-over-canvas=true]:pointer-events-none"
          data-is-dragging-over-canvas={
            editorContext?.editorStates.isDraggingOverCanvas ? "true" : "false"
          }
        >
          {isLoadingExtension && (
            <div className="bg-content1 absolute top-0 left-0 h-full w-full">
              <Loading />
            </div>
          )}
          {currentExtension && currentViewId && (
            <BaseAppLoader
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
