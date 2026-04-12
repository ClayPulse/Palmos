import WorkflowPreviewCard from "@/components/cards/workflow-preview-card";
import CreateInviteLinkModal from "@/components/interface/create-invite-link-modal";
import WorkflowEnvSetupModal from "@/components/modals/workflow-env-setup-modal";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Workflow } from "@/lib/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { Button, Checkbox } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { compare } from "semver";
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

const filterLabels = [{ name: "All" }, { name: "My Workflows" }, { name: "Published by Me" }];

export default function WorkflowGallery() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [label, setLabel] = useState<"All" | "Published by Me" | "My Workflows">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState<SortOption>("published-desc");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [myContentOnly, setMyContentOnly] = useState(false);
  const [envSetup, setEnvSetup] = useState<{
    isOpen: boolean;
    workflowId: string;
    env: Record<string, string>;
  } | null>(null);
  const effectiveLabel = myContentOnly ? "My Workflows" : label;
  const { isLoading, workflows } = useMarketplaceWorkflows(effectiveLabel);
  const { createCanvasTabView } = useTabViewManager();

  useEffect(() => {
    setLabel(filterLabels[selectedIndex].name as "All" | "Published by Me" | "My Workflows");
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

    // Check for missing user settings and prompt if needed
    if (workflow.id) {
      try {
        const res = await fetchAPI(
          `/api/workflow/user-settings/check-missing?workflowId=${encodeURIComponent(workflow.id)}`,
        );
        if (res.ok) {
          const { missing } = await res.json();
          if (missing && Object.keys(missing).length > 0) {
            setEnvSetup({
              isOpen: true,
              workflowId: workflow.id,
              env: missing,
            });
          }
        }
      } catch {
        // Silently ignore — settings can be configured later
      }
    }
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
        case "published-desc":
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        case "published-asc":
          return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
      }
    });

    return entries.map((workflow, index) => (
      <div key={index} className="h-fit w-full">
        <WorkflowPreviewCard workflow={workflow} onPress={openWorkflow} />
      </div>
    ));
  }, [workflows, searchQuery, sortValue]);

  return (
    <div className="grid h-full w-full grid-rows-[max-content_max-content_1fr] gap-y-2 overflow-y-auto">
      <div className="flex items-center gap-2">
        <GallerySearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterLabels={filterLabels}
          selectedFilterIndex={selectedIndex}
          onFilterChange={setSelectedIndex}
          sortLabels={sortLabels}
          sortValue={sortValue}
          onSortChange={setSortValue}
          className="flex-1"
        />
        <Button
          size="sm"
          color="primary"
          variant="flat"
          onPress={() => setIsInviteOpen(true)}
        >
          Invite Link
        </Button>
      </div>
      <Checkbox
        size="sm"
        isSelected={myContentOnly}
        onValueChange={setMyContentOnly}
      >
        My Content
      </Checkbox>
      <CreateInviteLinkModal
        workflows={workflows ?? []}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
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

      {envSetup && (
        <WorkflowEnvSetupModal
          isOpen={envSetup.isOpen}
          workflowId={envSetup.workflowId}
          envEntries={envSetup.env}
          onClose={() => setEnvSetup(null)}
          onComplete={() => setEnvSetup(null)}
        />
      )}
    </div>
  );
}
