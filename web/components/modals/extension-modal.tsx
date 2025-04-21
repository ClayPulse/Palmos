import {
  Button,
  Chip,
  Skeleton,
  tv,
  useCheckbox,
  VisuallyHidden,
} from "@heroui/react";
import ModalWrapper from "./modal-wrapper";
import Icon from "../misc/icon";
import { ContextMenuState, Extension, TabItem } from "@/lib/types";
import useExtensions from "@/lib/hooks/use-extensions";
import toast from "react-hot-toast";
import { useContext, useEffect, useState } from "react";
import ContextMenu from "../interface/context-menu";
import Tabs from "../misc/tabs";
import { EditorContext } from "../providers/editor-context-provider";
import useSWR from "swr";
import Loading from "../interface/loading";

export default function ExtensionModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const [installedExtensions, setInstalledExtensions] = useState<Extension[]>(
    [],
  );

  const extensionCategories: TabItem[] = [
    {
      name: "Recommended",
      description: "Recommended extensions",
    },
    {
      name: "Marketplace",
      description: "Browse the marketplace",
    },
    {
      name: "Installed",
      description: "Installed extensions",
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState<TabItem | undefined>(
    extensionCategories[1],
  );

  const editorContext = useContext(EditorContext);

  const {
    data: marketplaceExtensions,
    isLoading: isLoadingMarketplaceExtensions,
    mutate: mutateMarketplaceExtensions,
  } = useSWR<Extension[]>(
    isOpen ? "https://pulse-editor.com/api/extension/list" : null,
    (url: string) =>
      fetch(url)
        .then((res) => res.json())
        .then((body) => {
          const fetchedExts: {
            name: string;
            version: string;
            description?: string;
            displayName?: string;
            user: {
              name: string;
            };
            org: {
              name: string;
            };
          }[] = body;
          const extensions: Extension[] = fetchedExts.map((ext) => {
            return {
              config: {
                id: ext.name,
                version: ext.version,
                author: ext.user ? ext.user.name : ext.org.name,
                description: ext.description ?? "No description available",
                displayName: ext.displayName ?? ext.name,
              },
              isEnabled: false,
              remoteOrigin: `https://cdn.pulse-editor.com/extension`,
            };
          });
          return extensions;
        }),
  );

  useEffect(() => {
    if (isOpen) {
      setInstalledExtensions(editorContext?.persistSettings?.extensions ?? []);
    }
  }, [isOpen, editorContext?.persistSettings?.extensions]);

  useEffect(() => {
    if (isOpen) {
      mutateMarketplaceExtensions();
    }
  }, [isOpen]);

  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={"Extension Marketplace"}
    >
      <div className="h-full w-full space-y-2 overflow-y-auto px-2">
        <div className="flex justify-center">
          {isOpen && (
            <Tabs
              tabItems={extensionCategories}
              selectedItem={selectedCategory}
              setSelectedItem={setSelectedCategory}
            />
          )}
        </div>

        <ExtensionListView
          extensions={
            selectedCategory?.name === "Recommended"
              ? (marketplaceExtensions ?? [])
              : selectedCategory?.name === "Marketplace"
                ? (marketplaceExtensions ?? [])
                : installedExtensions
          }
          isLoading={
            selectedCategory?.name === "Recommended"
              ? isLoadingMarketplaceExtensions
              : selectedCategory?.name === "Marketplace"
                ? isLoadingMarketplaceExtensions
                : false
          }
          showInstalledChip={selectedCategory?.name !== "Installed"}
        />
      </div>
    </ModalWrapper>
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

function ExtensionPreview({
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
  } = useExtensions();

  const editorContext = useContext(EditorContext);

  useEffect(() => {
    setIsEnabled(extension.isEnabled);
    setIsLoaded(true);
    setIsInstalled(
      editorContext?.persistSettings?.extensions?.some(
        (ext) => ext.config.id === extension.config.id,
      ) ?? false,
    );
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
      <div className="relative h-28 w-full">
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
          className="m-0 h-full w-full rounded-md p-0"
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
      <p className="text-center">{extension.config.id}</p>
    </div>
  );
}

function ExtensionListView({
  extensions,
  isLoading,
  showInstalledChip,
}: {
  extensions: Extension[];
  isLoading: boolean;
  showInstalledChip: boolean;
}) {
  return (
    <>
      {isLoading ? (
        <Loading />
      ) : extensions.length === 0 ? (
        <div className="w-full space-y-2">
          <p className="text-center text-lg">No extensions found</p>
          <p>
            You can search for extensions in the marketplace, or import a local
            extension.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {extensions.map((ext) => (
            <ExtensionPreview
              extension={ext}
              key={ext.config.id}
              showInstalledChip={showInstalledChip}
            />
          ))}
        </div>
      )}
    </>
  );
}
