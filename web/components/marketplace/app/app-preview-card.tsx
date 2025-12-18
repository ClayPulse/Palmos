import { PlatformEnum } from "@/lib/enums";
import { useAppInfo } from "@/lib/hooks/use-app-info";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { getRemoteClientBaseURL } from "@/lib/module-federation/remote";
import {
  checkCompatibility,
  getHostLibVersion,
  getHostMFVersion,
  getRemoteLibVersion,
  getRemoteMFVersion,
} from "@/lib/module-federation/version";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { ContextMenuState, ExtensionApp } from "@/lib/types";
import { DraggableAttributes } from "@dnd-kit/core";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  addToast,
  Button,
  Chip,
  Skeleton,
  Tooltip,
  tv,
  useCheckbox,
  VisuallyHidden,
} from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import ContextMenu from "../../interface/context-menu";
import Icon from "../../misc/icon";
import { EditorContext } from "../../providers/editor-context-provider";

export default function AppPreviewCard({
  extension,
  isShowInstalledChip = true,
  isShowUninstallButton = true,
  isShowUseButton = false,
  isShowCompatibleChip = true,
  isShowContextMenu = true,
  isDisableButtonPress = false,
  onPress,
  attributes,
  listeners,
}: {
  extension: ExtensionApp;
  isShowInstalledChip?: boolean;
  isShowUninstallButton?: boolean;
  isShowUseButton?: boolean;
  isShowCompatibleChip?: boolean;
  isShowContextMenu?: boolean;
  isDisableButtonPress?: boolean;
  onPress?: (ext: ExtensionApp) => void;
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
}) {
  const {
    disableExtensionApp,
    enableExtensionApp,
    uninstallExtensionApp,
    installExtensionApp,
  } = useExtensionAppManager();
  const { openAppInfoModal } = useAppInfo();

  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOutdated, setIsOutdated] = useState(false);

  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  const editorContext = useContext(EditorContext);

  const [isShowInfo, setIsShowInfo] = useState(false);

  const [hostMFVersion, setHostMFVersion] = useState<string | undefined>(
    undefined,
  );
  const [hostLibVersion, setHostLibVersion] = useState<string | undefined>(
    undefined,
  );
  const [remoteMFVersion, setRemoteMFVersion] = useState<string | undefined>(
    undefined,
  );
  const [remoteLibVersion, setRemoteLibVersion] = useState<string | undefined>(
    undefined,
  );

  const [isMFCompatible, setIsMFCompatible] = useState<boolean | undefined>(
    undefined,
  );
  const [isLibCompatible, setIsLibCompatible] = useState<boolean | undefined>(
    undefined,
  );

  const [isHover, setIsHover] = useState(false);

  useEffect(() => {
    async function fetchVersions() {
      const hostMFVersion = await getHostMFVersion();
      setHostMFVersion(hostMFVersion);

      const hostLibVersion = await getHostLibVersion();
      setHostLibVersion(hostLibVersion);

      const remoteMFVersion =
        extension.mfVersion ??
        (await getRemoteMFVersion(
          extension.remoteOrigin,
          extension.config.id,
          extension.config.version,
        ));
      setRemoteMFVersion(remoteMFVersion);

      const remoteLibVersion = (
        extension.config.libVersion === undefined
          ? await getRemoteLibVersion(
              extension.remoteOrigin,
              extension.config.id,
              extension.config.version,
            )
          : extension.config.libVersion
      )?.replace("^", "");
      setRemoteLibVersion(remoteLibVersion);

      const mfCompatible = await checkCompatibility(
        hostMFVersion,
        remoteMFVersion,
      );
      const libCompatible = await checkCompatibility(
        hostLibVersion,
        remoteLibVersion,
      );
      setIsMFCompatible(mfCompatible);
      setIsLibCompatible(libCompatible);
    }

    fetchVersions();
  }, []);

  useEffect(() => {
    setIsLoaded(true);

    const foundExt = editorContext?.persistSettings?.extensions?.find(
      (ext) => ext.config.id === extension.config.id,
    );
    setIsInstalled(foundExt !== undefined);

    const isOutdated = foundExt
      ? foundExt.config.version !== extension.config.version
      : false;
    setIsOutdated(isOutdated);
    setIsEnabled(foundExt?.isEnabled ?? false);
  }, [extension]);

  function toggleExtension() {
    if (isEnabled) {
      disableExtensionApp(extension.config.id).then(() => {
        setIsEnabled(false);
      });
    } else {
      enableExtensionApp(extension.config.id).then(() => {
        setIsEnabled(true);
      });
    }
  }

  if (!isLoaded) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <div className="grid h-full w-full grid-cols-1 grid-rows-[auto_max-content_max-content]">
      <div
        className="relative h-full min-h-32 w-full"
        onMouseEnter={() => {
          if (getPlatform() !== PlatformEnum.Capacitor) {
            setIsHover(true);
          }
        }}
        // Hide show info when user taps outside of the modal
        onMouseLeave={() => {
          if (getPlatform() !== PlatformEnum.Capacitor) {
            setIsHover(false);
          }
        }}
      >
        <div className="pointer-events-none absolute top-0 right-0.5 z-10">
          <div className="pointer-events-none flex flex-col items-end gap-y-0.5">
            {extension.config.requireWorkspace && (
              <div className="pointer-events-auto h-7">
                <Tooltip
                  content={
                    <div className="max-w-xs">
                      <p>
                        This app requires a workspace to be opened in order to
                        function properly.
                      </p>
                    </div>
                  }
                >
                  <Chip
                    className="h-full"
                    startContent={<Icon name="computer" />}
                    variant="faded"
                    color="secondary"
                    size="sm"
                  >
                    Requires Workspace
                  </Chip>
                </Tooltip>
              </div>
            )}
            {isShowInstalledChip && isInstalled && (
              <div className="pointer-events-auto h-7">
                <Chip
                  className="h-full"
                  startContent={<Icon name="save_alt" />}
                  variant="faded"
                  size="sm"
                >
                  Installed
                </Chip>
              </div>
            )}
            {/* {isInstalled && (
              <div className="pointer-events-auto h-7">
                <EnableCheckBox
                  isActive={isEnabled}
                  onPress={toggleExtension}
                />
              </div>
            )} */}

            {isMFCompatible !== undefined &&
              isLibCompatible !== undefined &&
              (!isMFCompatible || !isLibCompatible ? (
                <div className="pointer-events-auto">
                  <Tooltip
                    content={
                      <div className="max-w-xs">
                        {!isMFCompatible && (
                          <p>
                            This app is outdated and no longer a valid module
                            federation app. Please update the app to the latest
                            version. <br />
                            Host MF version: {hostMFVersion}
                            <br />
                            App MF version: {remoteMFVersion}
                          </p>
                        )}
                        {!isLibCompatible && (
                          <p>
                            This app's library version is outdated and may not
                            work correctly. Please update the app to the latest
                            version.
                            <br />
                            Host lib version: {hostLibVersion}
                            <br />
                            App lib version: {remoteLibVersion}
                          </p>
                        )}
                      </div>
                    }
                  >
                    <Button isIconOnly variant="light" radius="full" size="sm">
                      {!isMFCompatible ? (
                        <Icon name="warning" className="text-danger!" />
                      ) : (
                        <Icon name="warning" className="text-warning!" />
                      )}
                    </Button>
                  </Tooltip>
                </div>
              ) : (
                isShowCompatibleChip && (
                  <div className="pointer-events-auto">
                    <Tooltip
                      content={
                        <div className="max-w-xs">
                          <p>
                            This app's module federation version (
                            {hostMFVersion}) and library version (
                            {hostLibVersion}) match the host version. The app
                            should work correctly.
                          </p>
                        </div>
                      }
                    >
                      {isOutdated ? (
                        <Button
                          variant="faded"
                          color="warning"
                          size="sm"
                          radius="full"
                          className="h-7"
                        >
                          Outdated
                        </Button>
                      ) : (
                        <Button
                          variant="faded"
                          color="success"
                          size="sm"
                          radius="full"
                          className="h-7"
                        >
                          Compatible
                        </Button>
                      )}
                    </Tooltip>
                  </div>
                )
              ))}
          </div>
        </div>

        <Button
          className="relative m-0 h-full w-full touch-manipulation rounded-md p-0"
          onPress={() => {
            if (isDisableButtonPress) {
              return;
            }

            if (onPress) {
              onPress(extension);
            } else {
              setIsShowInfo((prev) => !prev);
            }
          }}
          {...attributes}
          {...listeners}
          onContextMenu={
            isShowContextMenu
              ? (e) => {
                  e.preventDefault();
                  // Get parent element position
                  const current = e.currentTarget as HTMLElement;
                  const parent = current.parentElement as HTMLElement;
                  const parentRect = parent.getBoundingClientRect();

                  setContextMenuState(() => ({
                    x: e.clientX - parentRect.left,
                    y: e.clientY - parentRect.top,
                    isOpen: true,
                  }));
                }
              : undefined
          }
        >
          {extension.config.thumbnail ? (
            <img
              draggable={false}
              src={
                getRemoteClientBaseURL(
                  extension.remoteOrigin,
                  extension.config.id,
                  extension.config.version,
                ) +
                "/" +
                extension.config.thumbnail
              }
              alt={extension.config.displayName}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <Skeleton className="h-full w-full" isLoaded={false}></Skeleton>
          )}
        </Button>
        {(isShowInfo || isHover) && (
          <div className="absolute bottom-0.5 left-1/2 flex w-fit -translate-x-1/2 justify-center gap-x-0.5">
            {isShowUseButton && (
              <Button
                color="primary"
                size="sm"
                onPress={() => {
                  onPress?.(extension);
                }}
              >
                Use
              </Button>
            )}
            <Button
              color="secondary"
              size="sm"
              onPress={() => {
                openAppInfoModal({
                  id: extension.config.id,
                  name: extension.config.displayName ?? extension.config.id,
                  version: extension.config.version,
                  author: extension.config.author,
                  license: extension.config.license,
                  url: extension.config.repository,
                  readme: extension.config.repository
                    ? extension.config.repository + "/README.md"
                    : undefined,
                });
                editorContext?.setEditorStates((prev) => ({
                  ...prev,
                  isMarketplaceOpen: false,
                }));
              }}
            >
              Details
            </Button>
            {!isInstalled ? (
              <Button
                color="primary"
                size="sm"
                onPress={async (e) => {
                  await installExtensionApp(
                    extension.remoteOrigin,
                    extension.config.id,
                    extension.config.version,
                  )
                    .then(() => {
                      addToast({
                        title: "Extension installed",
                        description: `Extension ${extension.config.id} installed successfully.`,
                        color: "success",
                      });
                      setIsInstalled(true);
                      setIsEnabled(extension.isEnabled);
                    })
                    .catch((err) => {
                      toast.error(err.message);
                    });
                }}
              >
                Install
              </Button>
            ) : isOutdated ? (
              <Button
                color="primary"
                size="sm"
                onPress={async (e) => {
                  try {
                    await uninstallExtensionApp(extension.config.id);

                    await installExtensionApp(
                      extension.remoteOrigin,
                      extension.config.id,
                      extension.config.version,
                    );

                    addToast({
                      title: "Extension upgraded",
                      description: `Extension ${extension.config.id} upgraded successfully.`,
                      color: "success",
                    });
                    setIsOutdated(false);
                    setIsEnabled(extension.isEnabled);
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                }}
              >
                Upgrade
              </Button>
            ) : (
              isShowUninstallButton && (
                <Button
                  color="danger"
                  size="sm"
                  onPress={(e) => {
                    uninstallExtensionApp(extension.config.id).then(() => {
                      addToast({
                        title: "Extension uninstalled",
                        description: `Extension ${extension.config.id} uninstalled successfully.`,
                        color: "success",
                      });
                      setIsInstalled(false);
                    });
                  }}
                >
                  Uninstall
                </Button>
              )
            )}
          </div>
        )}
        {isShowContextMenu && (
          <ContextMenu state={contextMenuState} setState={setContextMenuState}>
            <div className="flex flex-col">
              {isInstalled ? (
                <Button
                  className="text-medium h-12 sm:h-8 sm:text-sm"
                  variant="light"
                  onPress={(e) => {
                    uninstallExtensionApp(extension.config.id).then(() => {
                      addToast({
                        title: "Extension uninstalled",
                        description: `Extension ${extension.config.id} uninstalled successfully.`,
                        color: "success",
                      });
                    });
                    setContextMenuState({ x: 0, y: 0, isOpen: false });
                  }}
                >
                  <p className="w-full text-start">Uninstall</p>
                </Button>
              ) : (
                <Button
                  className="text-medium h-12 sm:h-8 sm:text-sm"
                  variant="light"
                  onPress={(e) => {
                    installExtensionApp(
                      extension.remoteOrigin,
                      extension.config.id,
                      extension.config.version,
                    )
                      .then(() => {
                        addToast({
                          title: "Extension installed",
                          description: `Extension ${extension.config.id} installed successfully.`,
                          color: "success",
                        });
                        setIsInstalled(true);
                        setIsEnabled(extension.isEnabled);
                      })
                      .catch((err) => {
                        toast.error(err.message);
                      });
                    setContextMenuState({ x: 0, y: 0, isOpen: false });
                  }}
                >
                  <p className="w-full text-start">Install</p>
                </Button>
              )}
            </div>
          </ContextMenu>
        )}
      </div>
      <p className="text-center wrap-break-word">{extension.config.displayName}</p>
      <p className="text-center">{extension.config.version}</p>
    </div>
  );
}

function EnableCheckBox({
  isActive,
  onPress,
}: {
  isActive: boolean;
  onPress: () => void;
  activeText?: string;
  inactiveText?: string;
}) {
  const { children, isSelected, getBaseProps, getLabelProps, getInputProps } =
    useCheckbox({
      onValueChange: onPress,
      isSelected: isActive,
    });

  const checkbox = tv({
    slots: {
      base: "hover:bg-default-200 dark:hover:bg-default-300 w-[96px] max-w-[96px] min-w-[96px]",
      content: "text-default-500 text-sm pl-0.5",
    },
    variants: {
      isSelected: {
        true: {
          base: "bg-primary hover:bg-primary-400 dark:hover:bg-primary-300",
          content: "text-primary-foreground",
        },
      },
    },
  });

  const styles = checkbox({ isSelected });

  return (
    <label
      {...getBaseProps()}
      style={{
        height: "100%",
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0,
        transform: "translateY(-3px)",
      }}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <Chip
        classNames={{
          base: styles.base(),
          content: styles.content(),
        }}
        color="primary"
        startContent={
          isSelected ? (
            <Icon
              name="check_circle_outline"
              className="text-success-300! dark:text-success-400!"
            />
          ) : (
            <Icon name="block" className="text-danger!" />
          )
        }
        variant="faded"
        {...getLabelProps()}
        style={{
          height: "100%",
        }}
        size="sm"
      >
        {children ? children : isSelected ? "Enabled" : "Disabled"}
      </Chip>
    </label>
  );
}
