import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { ExtensionApp } from "@/lib/types";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
} from "@heroui/react";
import { useContext, useEffect, useMemo, useState } from "react";
import { compare } from "semver";
import AppPreviewCard from "../../cards/app-preview-card";
import Loading from "../../interface/status-screens/loading";

type SortOption = "name-asc" | "name-desc" | "version-asc" | "version-desc";

const sortLabels: { name: string; value: SortOption }[] = [
  { name: "Version (newest)", value: "version-desc" },
  { name: "Version (oldest)", value: "version-asc" },
  { name: "Name (A–Z)", value: "name-asc" },
  { name: "Name (Z–A)", value: "name-desc" },
];

export default function AppGallery() {
  const editorContext = useContext(EditorContext);

  const [displayedApps, setDisplayedApps] = useState<ExtensionApp[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState<SortOption>("version-desc");

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

  const previews = useMemo(() => {
    let entries = Array.from(groupedExtensions?.entries() ?? []).map(
      ([name, extGroup]) => {
        const latestVersion = extGroup.reduce((latest, current) => {
          return compare(current.config.version, latest.config.version) > 0
            ? current
            : latest;
        }, extGroup[0]);
        return { name, app: latestVersion };
      },
    );

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      entries = entries.filter(({ app }) => {
        const label = (app.config.displayName ?? app.config.id).toLowerCase();
        return label.includes(q);
      });
    }

    // Sort
    entries.sort((a, b) => {
      const nameA = (a.app.config.displayName ?? a.app.config.id).toLowerCase();
      const nameB = (b.app.config.displayName ?? b.app.config.id).toLowerCase();
      switch (sortValue) {
        case "name-asc":
          return nameA.localeCompare(nameB);
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "version-asc":
          return compare(a.app.config.version, b.app.config.version);
        case "version-desc":
          return compare(b.app.config.version, a.app.config.version);
      }
    });

    return entries.map(({ name, app }) => (
      <div key={name} className="h-fit w-full">
        <AppPreviewCard extension={app} isShowInstalledChip={true} />
      </div>
    ));
  }, [groupedExtensions, searchQuery, sortValue]);

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
      <Input
        size="sm"
        placeholder="Search..."
        className="flex-1"
        value={searchQuery}
        onValueChange={setSearchQuery}
        startContent={
          <div>
            <Icon name="search" variant="outlined" />
          </div>
        }
        endContent={
          <div className="flex items-center gap-1">
            <Dropdown>
              <DropdownTrigger>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  title={selectLabels[selectedIndex]?.name ?? "All"}
                >
                  <Icon
                    name={
                      selectLabels[selectedIndex]?.name === "All"
                        ? "filter_alt_off"
                        : "filter_alt"
                    }
                  />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Filter">
                {selectLabels.map((item, index) => (
                  <DropdownItem
                    key={item.name}
                    onPress={() => setSelectedIndex(index)}
                  >
                    {item.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  title={sortLabels.find((s) => s.value === sortValue)?.name}
                >
                  <Icon
                    name={
                      sortValue.startsWith("name") ? "sort_by_alpha" : "sort"
                    }
                  />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Sort">
                {sortLabels.map((item) => (
                  <DropdownItem
                    key={item.value}
                    onPress={() => setSortValue(item.value)}
                  >
                    {item.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        }
      />

      {isLoading ? (
        <Loading />
      ) : previews.length === 0 ? (
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
