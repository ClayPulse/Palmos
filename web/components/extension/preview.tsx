import {
  Button,
  Chip,
  Skeleton,
  tv,
  useCheckbox,
  VisuallyHidden,
} from "@heroui/react";
import Icon from "../misc/icon";
import { ContextMenuState, Extension, PlatformEnum } from "@/lib/types";
import useExtensionManager from "@/lib/hooks/use-extension-manager";
import toast from "react-hot-toast";
import { useContext, useEffect, useState } from "react";
import ContextMenu from "../interface/context-menu";
import { EditorContext } from "../providers/editor-context-provider";
import { getPlatform } from "@/lib/platform-api/platform-checker";

export default function ExtensionPreview({
  extension,
  showInstalledChip,
}: {
  extension: Extension;
  showInstalledChip: boolean;
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
    return <Skeleton className="h-28 w-full" />;
  }

  return (
    <div className="w-full">
      <div
        className="relative h-28 w-full"
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
          <div className="flex flex-col">
            {showInstalledChip && isInstalled && (
              <Chip startContent={<Icon name="save_alt" />} variant="faded">
                Installed
              </Chip>
            )}
            {isInstalled && (
              <EnableCheckBox isActive={isEnabled} onPress={toggleExtension} />
            )}
          </div>
        </div>
        <Button
          className="relative m-0 h-full w-full rounded-md p-0"
          onPress={() => {
            setIsShowInfo((prev) => !prev);
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
        ></Button>
        {isShowInfo && (
          <div className="absolute bottom-0.5 left-1/2 flex w-full -translate-x-1/2 justify-center gap-x-0.5">
            <Button color="secondary" size="sm">
              Details
            </Button>
            {!isInstalled ? (
              <Button
                color="primary"
                size="sm"
                onPress={(e) => {
                  installExtension(extension).then(() => {
                    toast.success("Extension installed");
                    setIsInstalled(true);
                    setIsEnabled(extension.isEnabled);
                  });
                }}
              >
                Install
              </Button>
            ) : (
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
                  installExtension(extension).then(() => {
                    toast.success("Extension installed");
                    setIsInstalled(true);
                    setIsEnabled(extension.isEnabled);
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
      <p className="text-center">{extension.config.displayName}</p>
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
