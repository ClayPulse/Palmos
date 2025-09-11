import ModalWrapper from "./modal-wrapper";
import { Extension, ExtensionMeta, TabItem } from "@/lib/types";
import { useContext, useEffect, useState } from "react";
import Tabs from "../misc/tabs";
import { EditorContext } from "../providers/editor-context-provider";
import useSWR from "swr";
import ExtensionList from "../extension/extension-list";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";

export default function ExtensionMarketplaceModal({
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
    isOpen ? `/api/extension/list` : null,
    (url: string) =>
      fetchAPI(url)
        .then((res) => res.json())
        .then((body) => {
          const fetchedExts: ExtensionMeta[] = body;
          const extensions: Extension[] = fetchedExts.map((ext) => {
            return {
              config: {
                id: ext.name,
                version: ext.version,
                author: ext.user ? ext.user.name : ext.org.name,
                description: ext.description ?? "No description available",
                displayName: ext.displayName ?? ext.name,
                visibility: ext.visibility,
              },
              isEnabled: true,
              remoteOrigin: `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
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
            <Tabs
              tabItems={extensionCategories}
              selectedItem={selectedCategory}
              setSelectedItem={setSelectedCategory}
            />
          )}
        </div>

        <ExtensionList
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
