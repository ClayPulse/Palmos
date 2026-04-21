import AppExplorer from "@/components/explorer/app/app-explorer";
import AutomationExplorer from "@/components/explorer/automation/automation-explorer";
import WorkflowExplorer from "@/components/explorer/workflow/workflow-explorer";
import WorkspaceExplorer from "@/components/explorer/workspace/workspace-explorer";
import BaseSidePanel from "@/components/interface/panels/base-side-panel";
import Tabs from "@/components/misc/tabs";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum, SideMenuTabEnum } from "@/lib/enums";
import useExplorer from "@/lib/hooks/use-explorer";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { TabItem } from "@/lib/types";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { Button } from "@heroui/react";
import { useContext } from "react";
import Icon from "../../misc/icon";
import ProjectIndicator from "../project-indicator";

export default function SideNavPanel({
  isMenuOpen,
  setIsMenuOpen,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}) {
  const editorContext = useContext(EditorContext);

  return (
    <BaseSidePanel isOpen={isMenuOpen} direction="left">
      <div className="h-full w-full overflow-y-hidden min-[768px]:py-2 min-[768px]:pr-1 min-[768px]:pl-2">
        <div className="bg-content2 grid h-full w-full grid-rows-[48px_1fr] overflow-hidden shadow-md min-[768px]:rounded-xl">
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="absolute flex h-full w-full items-center px-2 py-1 max-[768px]:justify-end">
              <Button
                className="hidden rotate-270 max-[768px]:block"
                onPress={() => setIsMenuOpen(false)}
                isIconOnly
                variant="light"
              >
                <Icon name="start" variant="round" />
              </Button>
              <Button
                className="rotate-180 max-[768px]:hidden"
                onPress={() => setIsMenuOpen(false)}
                isIconOnly
                variant="light"
              >
                <Icon name="start" variant="round" />
              </Button>
            </div>
            <div className="relative">
              {editorContext?.editorStates.project && <ProjectIndicator />}
            </div>
          </div>

          <PanelContent />
        </div>
      </div>
    </BaseSidePanel>
  );
}

function PanelContent() {
  const editorContext = useContext(EditorContext);

  const { selectAndSetProjectHome } = useExplorer();

  const tabViews = editorContext?.editorStates.tabViews ?? [];
  const tabIndex = editorContext?.editorStates.tabIndex ?? -1;
  const activeTabView = tabViews[tabIndex];
  const isInCanvas = activeTabView?.type === ViewModeEnum.Canvas;

  const tabItems: TabItem[] = isInCanvas
    ? [
        {
          name: SideMenuTabEnum.Apps,
          description: "List of apps",
          icon: "apps",
        },
        {
          name: SideMenuTabEnum.Workspace,
          description: "Organization workspace",
          icon: "folder",
        },
        {
          name: SideMenuTabEnum.Automations,
          description: "Automations",
          icon: "smart_toy",
        },
      ]
    : [
        {
          name: SideMenuTabEnum.Workflows,
          description: "My workflows",
          icon: "hub",
        },
        {
          name: SideMenuTabEnum.Automations,
          description: "Automations",
          icon: "smart_toy",
        },
      ];

  const defaultTab = isInCanvas ? SideMenuTabEnum.Apps : SideMenuTabEnum.Workflows;

  const selectedTab =
    tabItems.find((t) => t.name === editorContext?.editorStates.sideMenuTab)
      ? (editorContext?.editorStates.sideMenuTab ?? defaultTab)
      : defaultTab;

  function setSelectedTab(tab: SideMenuTabEnum) {
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        sideMenuTab: tab,
      };
    });
  }

  // Choose project home path
  if (
    getPlatform() === PlatformEnum.Electron &&
    !editorContext?.persistSettings?.projectHomePath
  ) {
    return (
      <div className="bg-content2 h-full w-full space-y-2 p-4">
        <p>
          You have not set a project home path yet. Please set a project home
          path to continue. All your projects will be saved in this directory.
        </p>
        <Button
          className="w-full"
          onPress={() => {
            selectAndSetProjectHome();
          }}
        >
          Select Organization Home Path
        </Button>
      </div>
    );
  }

  return (
    <div className="relative grid h-full w-full grid-rows-[max-content_auto] overflow-y-hidden">
      {isInCanvas && (
        <div className="flex w-full justify-center">
          <div className="w-fit">
            <Tabs
              tabItems={tabItems}
              selectedItem={tabItems.find((tab) => tab.name === selectedTab)}
              setSelectedItem={(item) => {
                setSelectedTab(item?.name as SideMenuTabEnum);
              }}
              isClosable={false}
            />
          </div>
        </div>
      )}
      <div className="h-full w-full overflow-y-hidden">
        {selectedTab === SideMenuTabEnum.Apps ? (
          <AppExplorer />
        ) : selectedTab === SideMenuTabEnum.Workflows ? (
          <WorkflowExplorer />
        ) : selectedTab === SideMenuTabEnum.Workspace ? (
          <WorkspaceExplorer />
        ) : selectedTab === SideMenuTabEnum.Automations ? (
          <AutomationExplorer />
        ) : null}
      </div>
    </div>
  );
}
