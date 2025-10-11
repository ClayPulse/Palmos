import Icon from "@/components/misc/icon";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Workflow } from "@/lib/types";
import { Select, SelectItem } from "@heroui/react";
import { useEffect, useState } from "react";
import { compare } from "semver";
import useSWR from "swr";
import Loading from "../../interface/loading";
import WorkflowPreviewCard from "./workflow-preview-card";

export default function WorkflowGallery() {
  const [displayedWorkflows, setDisplayedWorkflows] = useState<Workflow[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const selectLabels = [
    {
      name: "All",
    },
    {
      name: "Published by Me",
    },
  ];

  const { data: marketplaceWorkflows, isLoading: isLoadingWorkflows } = useSWR<
    Workflow[]
  >(
    selectLabels[selectedIndex]?.name === "All" ||
      selectLabels[selectedIndex]?.name === "Published by Me"
      ? `/api/workflow/list${selectLabels[selectedIndex].name === "Published by Me" ? "?published=true" : ""}`
      : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      const body = await res.json();

      const fetchedWorkflows: Workflow[] = body;
      return fetchedWorkflows;
    },
  );

  // Group workflows by name
  const groupedWorkflows = displayedWorkflows?.reduce(
    (acc: Map<string, Workflow[]>, wf) => {
      const key = wf.name;
      if (!acc.has(key)) {
        acc.set(key, []);
      }
      acc.get(key)?.push(wf);
      return acc;
    },
    new Map<string, Workflow[]>(),
  );

  const previews = Array.from(groupedWorkflows?.entries() ?? []).map(
    ([name, workflowGroup]) => {
      // Take the latest version of each workflow group
      const latestVersion = workflowGroup.reduce((latest, current) => {
        return compare(current.version, latest.version) > 0 ? current : latest;
      }, workflowGroup[0]);

      return (
        <div key={name} className="w-full h-fit">
          <WorkflowPreviewCard workflow={latestVersion} />
        </div>
      );
    },
  );

  // Get installed Apps
  useEffect(() => {
    const selectedLabel = selectLabels[selectedIndex];
    if (
      selectedLabel.name === "All" ||
      selectedLabel.name === "Published by Me"
    ) {
      setIsLoading(isLoadingWorkflows);
      setDisplayedWorkflows(marketplaceWorkflows ?? []);
    } else {
      console.warn("Unknown filter selected:", selectedLabel.name);
    }
  }, [selectedIndex, marketplaceWorkflows, isLoadingWorkflows]);

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex flex-col items-center">
        <Select
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
      ) : groupedWorkflows?.size === 0 ? (
        <div className="w-full space-y-2">
          <p className="text-center text-lg">No content found</p>
          <p>
            You can search for apps in the marketplace, or import a local app.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 w-full">{previews}</div>
      )}
    </div>
  );
}
