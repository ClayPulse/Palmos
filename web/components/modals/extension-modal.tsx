import ModalWrapper from "./modal-wrapper";
import { Extension, TabItem } from "@/lib/types";
import { useContext, useEffect, useState } from "react";
import Tabs from "../misc/tabs";
import { EditorContext } from "../providers/editor-context-provider";
import useSWR from "swr";
import ExtensionList from "../extension/extension-list";

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
              isEnabled: true,
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
