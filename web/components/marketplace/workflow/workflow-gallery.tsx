import WorkflowPreviewCard from "@/components/cards/workflow-preview-card";
import Icon from "@/components/misc/icon";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { Workflow } from "@/lib/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { compare } from "semver";
import Loading from "../../interface/status-screens/loading";

type SortOption = "name-asc" | "name-desc" | "version-asc" | "version-desc";

const sortLabels: { name: string; value: SortOption }[] = [
  { name: "Version (newest)", value: "version-desc" },
  { name: "Version (oldest)", value: "version-asc" },
  { name: "Name (A–Z)", value: "name-asc" },
  { name: "Name (Z–A)", value: "name-desc" },
];

const filterLabels = [{ name: "All" }, { name: "Published by Me" }];

export default function WorkflowGallery() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [label, setLabel] = useState<"All" | "Published by Me">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState<SortOption>("version-desc");
  const { isLoading, workflows } = useMarketplaceWorkflows(label);
  const { createCanvasTabView } = useTabViewManager();

  useEffect(() => {
    setLabel(filterLabels[selectedIndex].name as "All" | "Published by Me");
  }, [selectedIndex]);

  async function openWorkflow(workflow: Workflow) {
    await createCanvasTabView(
      {
        viewId: createCanvasViewId(),
        appConfigs: workflow.content.nodes.map((node) => node.data.config),
        initialWorkflowContent: workflow.content,
      },
      workflow,
    );
  }

  const previews = useMemo(() => {
    let entries = workflows ?? [];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      entries = entries.filter((w) => w.name.toLowerCase().includes(q));
    }

    entries = [...entries].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      switch (sortValue) {
        case "name-asc":
          return nameA.localeCompare(nameB);
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "version-asc":
          return compare(a.version, b.version);
        case "version-desc":
          return compare(b.version, a.version);
      }
    });

    return entries.map((workflow, index) => (
      <div key={index} className="h-fit w-full">
        <WorkflowPreviewCard workflow={workflow} onPress={openWorkflow} />
      </div>
    ));
  }, [workflows, searchQuery, sortValue]);

  return (
    <div className="grid h-full w-full grid-rows-[max-content_1fr] gap-y-2 overflow-y-auto">
      <Input
        size="sm"
        placeholder="Search..."
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
                  title={filterLabels[selectedIndex]?.name ?? "All"}
                >
                  <Icon
                    name={selectedIndex === 0 ? "filter_alt_off" : "filter_alt"}
                  />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Filter">
                {filterLabels.map((item, index) => (
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
                    name={sortValue.startsWith("name") ? "sort_by_alpha" : "sort"}
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
            You can search for workflows in the marketplace, or create a new
            one.
          </p>
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 gap-2 overflow-x-hidden overflow-y-auto px-1">
          {previews}
        </div>
      )}
    </div>
  );
}
