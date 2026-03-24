import { EditorContext } from "@/components/providers/editor-context-provider";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { ExtensionApp } from "@/lib/types";
import { useContext, useEffect, useMemo, useState } from "react";
import { compare } from "semver";
import AppPreviewCard from "../../cards/app-preview-card";
import Loading from "../../interface/status-screens/loading";
import GallerySearchBar from "../gallery-search-bar";

type SortOption =
  | "name-asc"
  | "name-desc"
  | "version-asc"
  | "version-desc"
  | "published-desc"
  | "published-asc";

const sortLabels: { name: string; value: SortOption }[] = [
  { name: "Published (newest)", value: "published-desc" },
  { name: "Published (oldest)", value: "published-asc" },
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
  const [sortValue, setSortValue] = useState<SortOption>("published-desc");

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
        case "published-desc":
          return (b.app.createdAt ?? "").localeCompare(a.app.createdAt ?? "");
        case "published-asc":
          return (a.app.createdAt ?? "").localeCompare(b.app.createdAt ?? "");
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
      <GallerySearchBar
        className="flex-1"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterLabels={selectLabels}
        selectedFilterIndex={selectedIndex}
        onFilterChange={setSelectedIndex}
        sortLabels={sortLabels}
        sortValue={sortValue}
        onSortChange={setSortValue}
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
