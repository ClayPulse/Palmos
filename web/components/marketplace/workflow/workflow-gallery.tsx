import WorkflowPreviewCard from "@/components/cards/workflow-preview-card";
import Icon from "@/components/misc/icon";
import { useWorkflowManager } from "@/lib/hooks/use-workflow-manager";
import { Select, SelectItem } from "@heroui/react";
import { useEffect, useState } from "react";
import Loading from "../../interface/status-screens/loading";

export default function WorkflowGallery() {
  // const [displayedWorkflows, setDisplayedWorkflows] = useState<Workflow[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [label, setLabel] = useState<"All" | "Published by Me">("All");
  const { isLoading, workflows } = useWorkflowManager(label);

  const selectLabels = [
    {
      name: "All",
    },
    {
      name: "Published by Me",
    },
  ];

  const previews = workflows?.map((workflow, index) => {
    return (
      <div key={index} className="h-fit w-full">
        <WorkflowPreviewCard workflow={workflow} isPressable={false} />
      </div>
    );
  });

  useEffect(() => {
    const selectedLabel = selectLabels[selectedIndex];
    setLabel(selectedLabel.name as "All" | "Published by Me");
  }, [selectedIndex]);

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex flex-col items-center">
        <Select
          label="Filter workflows"
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
      ) : workflows?.length === 0 ? (
        <div className="w-full space-y-2">
          <p className="text-center text-lg">No content found</p>
          <p>
            You can search for apps in the marketplace, or import a local app.
          </p>
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 gap-2">{previews}</div>
      )}
    </div>
  );
}
