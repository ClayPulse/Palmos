import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { ExtensionApp } from "@/lib/types";
import { Select, SelectItem } from "@heroui/react";
import { useContext, useEffect, useMemo, useState } from "react";
import { compare } from "semver";
import AppPreviewCard from "../../cards/app-preview-card";
import Loading from "../../interface/status-screens/loading";

export default function AppGallery() {
  const editorContext = useContext(EditorContext);

  const [displayedApps, setDisplayedApps] = useState<ExtensionApp[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const selectLabels = [
    {
      name: "All",
    },
    {
      name: "Installed",
    },
    {
      name: "Published by Me",
    },
  ];

  const { marketplaceExtensions, isLoadingMarketplaceExtensions } =
    useExtensionAppManager(selectLabels[selectedIndex]?.name);

  // Group extensions by name
  const groupedExtensions = useMemo(
    () =>
      displayedApps?.reduce((acc: Map<string, ExtensionApp[]>, ext) => {
        const key = ext.config.id;
        if (!acc.has(key)) {
          acc.set(key, []);
        }
        acc.get(key)?.push(ext);
        return acc;
      }, new Map<string, ExtensionApp[]>()),
    [displayedApps],
  );

  const previews = useMemo(
    () =>
      Array.from(groupedExtensions?.entries() ?? []).map(([name, extGroup]) => {
        // Take the latest version of each extension group
        const latestVersion = extGroup.reduce((latest, current) => {
          return compare(current.config.version, latest.config.version) > 0
            ? current
            : latest;
        }, extGroup[0]);

        return (
          <div key={name} className="h-fit w-full">
            <AppPreviewCard
              extension={latestVersion}
              isShowInstalledChip={true}
            />
          </div>
        );
      }),
    [groupedExtensions],
  );

  // Get installed Apps
  useEffect(() => {
    const selectedLabel = selectLabels[selectedIndex];
    if (
      selectedLabel.name === "All" ||
      selectedLabel.name === "Published by Me"
    ) {
      setIsLoading(isLoadingMarketplaceExtensions);
      setDisplayedApps(marketplaceExtensions ?? []);
    } else if (selectedLabel.name === "Installed") {
      setIsLoading(false);
      setDisplayedApps(editorContext?.persistSettings?.extensions ?? []);
    } else {
      console.warn("Unknown filter selected:", selectedLabel.name);
    }
  }, [
    editorContext?.persistSettings?.extensions,
    selectedIndex,
    marketplaceExtensions,
    isLoadingMarketplaceExtensions,
  ]);

  return (
    <div className="grid h-full w-full grid-rows-[max-content_1fr] gap-y-2 overflow-y-auto">
      <div className="flex flex-col items-center">
        <Select
          label="Filter apps"
          size="sm"
          className="w-fit min-w-48"
          items={selectLabels}
          startContent={
            <div>
              <Icon name="filter_alt" variant="outlined" />
            </div>
          }
          selectedKeys={
            selectLabels[selectedIndex]
              ? [selectLabels[selectedIndex].name]
              : []
          }
        >
          {(item) => (
            <SelectItem
              key={item.name}
              onPress={() => {
                const index = selectLabels.findIndex(
                  (i) => i.name === item.name,
                );
                setSelectedIndex(index);
              }}
            >
              {item.name}
            </SelectItem>
          )}
        </Select>
      </div>

      {isLoading ? (
        <Loading />
      ) : groupedExtensions?.size === 0 ? (
        <div className="w-full space-y-2">
          <p className="text-center text-lg">No content found</p>
          <p>
            You can search for apps in the marketplace, or import a local app.
          </p>
        </div>
      ) : (
        <div className="grid h-full w-full grid-cols-2 gap-2 overflow-x-hidden overflow-y-auto px-1">
          {previews}
        </div>
      )}
    </div>
  );
}
