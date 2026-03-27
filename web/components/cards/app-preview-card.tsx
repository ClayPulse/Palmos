import { PlatformEnum } from "@/lib/enums";
import { useAppInfo } from "@/lib/hooks/use-app-info";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useVibeCode } from "@/lib/hooks/use-vibe-code";
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
  Divider,
  Skeleton,
  Tooltip,
  tv,
  useCheckbox,
  VisuallyHidden,
} from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import ContextMenu from "../interface/context-menu";
import Icon from "../misc/icon";
import { EditorContext } from "../providers/editor-context-provider";

export default function AppPreviewCard({
  extension,
  isShowInstalledChip = true,
  isShowUninstallButton = true,
  isShowUseButton = false,
  isShowCompatibleChip = true,
  isShowContextMenu = true,
  isShowInstallationButtons = true,
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
  isShowInstallationButtons?: boolean;
  isDisableButtonPress?: boolean;
  onPress?: (ext: ExtensionApp) => void;
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
}) {
  const { getTranslations: t } = useTranslations();
  const { uninstallExtensionApp, installExtensionApp, upgradeExtensionApp } =
    useExtensionAppManager();
  const { openAppInfoModal } = useAppInfo();
  const { openVibeCode } = useVibeCode();

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
  const [thumbnailImage, setThumbnailImage] = useState<string | undefined>(
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
          extension.config.id,
          extension.config.version,
          extension.remoteOrigin,
        ));
      setRemoteMFVersion(remoteMFVersion);

      const remoteLibVersion = (
        extension.config.libVersion === undefined
          ? await getRemoteLibVersion(
              extension.config.id,
              extension.config.version,
              extension.remoteOrigin,
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

  // Load thumbnail image
  useEffect(() => {
    function loadThumbnail() {
      if (extension.config.thumbnail) {
        const imageUrl =
          getRemoteClientBaseURL(
            extension.config.id,
            extension.config.version,
            extension.remoteOrigin,
          ) +
          "/" +
          extension.config.thumbnail;
        setThumbnailImage(imageUrl);
      }
    }

    loadThumbnail();
  }, [extension]);

  function showDetails() {
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
    editorContext?.updateModalStates({ marketplace: { isOpen: false } });
  }

  async function handleEditApp() {
    await openVibeCode({
      appId: extension.config.id,
      version: extension.config.version,
    });
  }

  if (!isLoaded) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <div className="bg-content2 border-divider grid h-full w-full grid-cols-1 grid-rows-[auto_max-content_max-content] rounded-lg border p-2">
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
                      <p>{t("appPreviewCard.requiresWorkspace")}</p>
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
                    {t("appPreviewCard.requiresWorkspaceLabel")}
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
                  {t("appPreviewCard.installed")}
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
                            {t("appPreviewCard.mfIncompatible")} <br />
                            {t("appPreviewCard.hostMFVersion")} {hostMFVersion}
                            <br />
                            {t("appPreviewCard.appMFVersion")} {remoteMFVersion}
                          </p>
                        )}
                        {!isLibCompatible && (
                          <p>
                            {t("appPreviewCard.libIncompatible")}
                            <br />
                            {t("appPreviewCard.hostLibVersion")}{" "}
                            {hostLibVersion}
                            <br />
                            {t("appPreviewCard.appLibVersion")}{" "}
                            {remoteLibVersion}
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
                            {t("appPreviewCard.compatibleTooltip", {
                              mfVersion: hostMFVersion ?? "unknown",
                              libVersion: hostLibVersion ?? "unknown",
                            })}
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
                          {t("appPreviewCard.outdated")}
                        </Button>
                      ) : (
                        <Button
                          variant="faded"
                          color="success"
                          size="sm"
                          radius="full"
                          className="h-7"
                        >
                          {t("appPreviewCard.compatible")}
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
          {thumbnailImage ? (
            <img
              draggable={false}
              src={thumbnailImage}
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
                {t("appPreviewCard.use")}
              </Button>
            )}
            <Button
              color="secondary"
              size="sm"
              onPress={() => {
                showDetails();
              }}
            >
              {t("appPreviewCard.details")}
            </Button>
            {isShowInstallationButtons &&
              (!isInstalled ? (
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
                          title: t("appPreviewCard.extensionInstalled"),
                          description: t(
                            "appPreviewCard.extensionInstalledDescription",
                            { id: extension.config.id },
                          ),
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
                  {t("appPreviewCard.install")}
                </Button>
              ) : isOutdated ? (
                <Button
                  color="primary"
                  size="sm"
                  onPress={async (e) => {
                    try {
                      await upgradeExtensionApp(
                        extension.remoteOrigin,
                        extension.config.id,
                        extension.config.version,
                      );

                      addToast({
                        title: t("appPreviewCard.extensionUpgraded"),
                        description: t(
                          "appPreviewCard.extensionUpgradedDescription",
                          { id: extension.config.id },
                        ),
                        color: "success",
                      });
                      setIsOutdated(false);
                      setIsEnabled(extension.isEnabled);
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                  }}
                >
                  {t("appPreviewCard.upgrade")}
                </Button>
              ) : (
                isShowUninstallButton && (
                  <Button
                    color="danger"
                    size="sm"
                    onPress={(e) => {
                      uninstallExtensionApp(extension.config.id).then(() => {
                        addToast({
                          title: t("appPreviewCard.extensionUninstalled"),
                          description: t(
                            "appPreviewCard.extensionUninstalledDescription",
                            { id: extension.config.id },
                          ),
                          color: "success",
                        });
                        setIsInstalled(false);
                      });
                    }}
                  >
                    {t("appPreviewCard.uninstall")}
                  </Button>
                )
              ))}
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
                        title: t("appPreviewCard.extensionUninstalled"),
                        description: t(
                          "appPreviewCard.extensionUninstalledDescription",
                          { id: extension.config.id },
                        ),
                        color: "success",
                      });
                    });
                    setContextMenuState({ x: 0, y: 0, isOpen: false });
                  }}
                >
                  <p className="w-full text-start">
                    {t("appPreviewCard.uninstall")}
                  </p>
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
                          title: t("appPreviewCard.extensionInstalled"),
                          description: t(
                            "appPreviewCard.extensionInstalledDescription",
                            { id: extension.config.id },
                          ),
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
                  <p className="w-full text-start">
                    {t("appPreviewCard.install")}
                  </p>
                </Button>
              )}
            </div>
          </ContextMenu>
        )}
      </div>
      <div className="w-full">
        <div className="grid w-full grid-cols-[auto_max-content_32px] items-center gap-x-2">
          <p className="font-semibold wrap-break-word">
            {extension.config.displayName}
          </p>
          <p className="text-center">{extension.config.version}</p>

          <div className="flex justify-end">
            <Button
              variant="light"
              isIconOnly
              size="sm"
              onPress={() => {
                showDetails();
              }}
            >
              <div>
                <Icon name="unfold_more" />
              </div>
            </Button>
          </div>
        </div>

        <p className="line-clamp-3 w-full overflow-y-hidden wrap-break-word whitespace-pre-line">
          {extension.config.description}
        </p>

        <div className="py-1">
          <Divider />
        </div>

        <div className="grid w-full grid-cols-[max-content_auto] items-center">
          <div>
            {extension.config.author}

            <Button
              variant="light"
              size="sm"
              color="secondary"
              onPress={handleEditApp}
            >
              <div className="flex items-center gap-x-1">
                <Icon name="auto_awesome" />
                <span>{t("common.edit")}</span>
              </div>
            </Button>
          </div>

          <div className="flex justify-end gap-x-2">
            <div className="flex gap-x-1">
              <div>
                <Icon name="comment" />
              </div>
              <p>0</p>
            </div>
            <div className="flex gap-x-1">
              <div>
                <Icon name="favorite" />
              </div>
              <p>0</p>
            </div>
          </div>
        </div>
      </div>
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
  const { getTranslations: t } = useTranslations();
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
        {children
          ? children
          : isSelected
            ? t("appPreviewCard.enabled")
            : t("appPreviewCard.disabled")}
      </Chip>
    </label>
  );
}
