import { PlatformEnum } from "@/lib/enums";
import useExtensionManager from "@/lib/hooks/use-extension-manager";
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
import {
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
  onPress,
}: {
  extension: ExtensionApp;
  isShowInstalledChip?: boolean;
  isShowUninstallButton?: boolean;
  isShowUseButton?: boolean;
  isShowCompatibleChip?: boolean;
  onPress?: (ext: ExtensionApp) => void;
}) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });
  const {
    disableExtension,
    enableExtension,
    uninstallExtension,
    installExtension,
  } = useExtensionManager();

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

  const [showMFVersionInfo, setShowMFVersionInfo] = useState(false);

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
      (ext) =>
        ext.config.id === extension.config.id &&
        ext.config.version === extension.config.version,
    );
    setIsInstalled(foundExt !== undefined);
    setIsEnabled(foundExt?.isEnabled ?? false);
  }, [extension]);

  function toggleExtension() {
    if (isEnabled) {
      disableExtension(extension.config.id).then(() => {
        setIsEnabled(false);
      });
    } else {
      enableExtension(extension.config.id).then(() => {
        setIsEnabled(true);
      });
    }
  }

  if (!isLoaded) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <div className="w-full h-full grid grid-rows-[auto_max-content_max-content] grid-cols-1">
      <div
        className="relative h-full w-full min-h-32"
        onMouseEnter={() => {
          if (getPlatform() !== PlatformEnum.Capacitor) {
            setIsShowInfo(true);
          }
        }}
        // Hide show info when user taps outside of the modal
        onMouseLeave={() => {
          if (getPlatform() !== PlatformEnum.Capacitor) {
            setIsShowInfo(false);
          }
        }}
      >
        <div className="absolute top-0 right-0.5 z-10">
          <div className="flex flex-col items-end">
            {isShowInstalledChip && isInstalled && (
              <Chip startContent={<Icon name="save_alt" />} variant="faded">
                Installed
              </Chip>
            )}
            {isInstalled && (
              <EnableCheckBox isActive={isEnabled} onPress={toggleExtension} />
            )}

            {isMFCompatible !== undefined &&
              isLibCompatible !== undefined &&
              (!isMFCompatible || !isLibCompatible ? (
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
              ) : (
                isShowCompatibleChip && (
                  <Tooltip
                    content={
                      <div className="max-w-xs">
                        <p>
                          This app's module federation version ({hostMFVersion})
                          and library version ({hostLibVersion}) match the host
                          version. The app should work correctly.
                        </p>
                      </div>
                    }
                  >
                    <Button
                      variant="faded"
                      color="success"
                      size="sm"
                      radius="full"
                    >
                      Compatible
                    </Button>
                  </Tooltip>
                )
              ))}
          </div>
        </div>

        <Button
          className="relative m-0 h-full w-full rounded-md p-0"
          onPress={() => {
            if (onPress) {
              onPress(extension);
            } else {
              setIsShowInfo((prev) => !prev);
            }
          }}
          onContextMenu={(e) => {
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
          }}
        >
          {extension.config.thumbnail ? (
            <img
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
        {isShowInfo && (
          <div className="absolute bottom-0.5 left-1/2 flex w-full -translate-x-1/2 justify-center gap-x-0.5">
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
            <Button color="secondary" size="sm">
              Details
            </Button>
            {!isInstalled ? (
              <Button
                color="primary"
                size="sm"
                onPress={(e) => {
                  installExtension(
                    extension.remoteOrigin,
                    extension.config.id,
                    extension.config.version,
                  )
                    .then(() => {
                      toast.success("Extension installed");
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
            ) : (
              isShowUninstallButton && (
                <Button
                  color="danger"
                  size="sm"
                  onPress={(e) => {
                    uninstallExtension(extension.config.id).then(() => {
                      toast.success("Extension uninstalled");
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
        <ContextMenu state={contextMenuState} setState={setContextMenuState}>
          <div className="flex flex-col">
            {isInstalled ? (
              <Button
                className="text-medium h-12 sm:h-8 sm:text-sm"
                variant="light"
                onPress={(e) => {
                  uninstallExtension(extension.config.id).then(() => {
                    toast.success("Extension uninstalled");
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
                  installExtension(
                    extension.remoteOrigin,
                    extension.config.id,
                    extension.config.version,
                  )
                    .then(() => {
                      toast.success("Extension installed");
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
      </div>
      <p className="text-center break-words">{extension.config.displayName}</p>
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
    <label {...getBaseProps()}>
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
      >
        {children ? children : isSelected ? "Enabled" : "Disabled"}
      </Chip>
    </label>
  );
}
