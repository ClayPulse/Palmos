import { getRemoteMFVersion } from "@/lib/module-federation/version";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { AppMetaData, ExtensionApp, TabItem } from "@/lib/types";
import { useContext, useEffect, useState } from "react";
import useSWR from "swr";
import ExtensionGallery from "../extension/extension-gallery";
import Tabs from "../misc/tabs";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./modal-wrapper";

export default function ExtensionMarketplaceModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const [installedExtensions, setInstalledExtensions] = useState<
    ExtensionApp[]
  >([]);

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
  } = useSWR<ExtensionApp[]>(
    isOpen ? `/api/extension/list` : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      const body = await res.json();

      const fetchedExts: AppMetaData[] = body;
      const extensions: ExtensionApp[] = await Promise.all(
        fetchedExts.map(async (extMeta) => {
          // If backend does not provide mfVersion, try to load it from the manifest
          if (!extMeta.mfVersion) {
            console.warn(
              `Server does not provide mfVersion for extension ${extMeta.name}. Trying to load from manifest...`,
            );
          }
          const mfVersion =
            extMeta.mfVersion ??
            (await getRemoteMFVersion(
              `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
              extMeta.name,
              extMeta.version,
            ));

          return {
            config: {
              id: extMeta.name,
              version: extMeta.version,
              libVersion: extMeta.libVersion,
              author: extMeta.user ? extMeta.user.name : extMeta.org.name,
              description: extMeta.description ?? "No description available",
              displayName: extMeta.displayName ?? extMeta.name,
              visibility: extMeta.visibility,
              thumbnail: extMeta.thumbnail,
            },
            isEnabled: true,
            remoteOrigin: `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
            mfVersion: mfVersion,
          };
        }),
      );
      return extensions;
    },
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
  }, [isOpen, mutateMarketplaceExtensions]);

  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={"Extension Marketplace"}
    >
      <div className="h-full w-full space-y-2 overflow-y-auto px-2">
        <div className="flex justify-center">
          {isOpen && (
            <div>
              <Tabs
                tabItems={extensionCategories}
                selectedItem={selectedCategory}
                setSelectedItem={setSelectedCategory}
              />
            </div>
          )}
        </div>

        <ExtensionGallery
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
