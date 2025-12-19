import AppPreviewCard from "@/components/cards/app-preview-card";
import { ProjectPreviewCard } from "@/components/cards/project-preview-card";
import WorkflowPreviewCard from "@/components/cards/workflow-preview-card";
import Icon from "@/components/misc/icon";
import Tabs from "@/components/misc/tabs";
import ProjectSettingsModal from "@/components/modals/project-settings-modal";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { useEditorAIAssistantHint } from "@/lib/hooks/use-editor-ai-assistant-hint";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useWorkflowManager } from "@/lib/hooks/use-workflow-manager";
import { AppViewConfig, TabItem } from "@/lib/types";
import { Button, Input } from "@heroui/react";
import { useContext, useState } from "react";
import { v4 } from "uuid";

export default function HomeView() {
  const editorContext = useContext(EditorContext);

  const { installedExtensionApps } = useExtensionAppManager();
  const { createAppViewInCanvasView } = useTabViewManager();
  const { workflows } = useWorkflowManager("All");
  const { projects } = useProjectManager();
  const { session, signIn } = useAuth();
  const { hint: inputPlaceholder } = useEditorAIAssistantHint();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const tabItems: TabItem[] = [
    {
      name: "Workflows",
      description: "Community workflows",
      icon: "hub",
    },
    {
      name: "Apps",
      description: "Community apps",
      icon: "apps",
    },
  ];

  const [selectedTab, setSelectedTab] = useState<"Apps" | "Workflows">(
    "Workflows",
  );

  return (
    <div className="text-default-foreground h-full w-full px-2 pt-18 pb-2">
      <div className="bg-content1 h-full w-full overflow-hidden rounded-lg">
        <div className="relative grid h-full w-full grid-rows-[max-content_max-content_max-content_1fr] gap-y-1 overflow-y-auto px-2 py-2 sm:px-8">
          <div className="absolute -top-full flex h-full w-full translate-y-48 items-end blur-[100px]">
            <img
              src={"/assets/dashboard-dark-gradient.png"}
              className="hidden object-cover dark:block"
            />

            <img
              src={"/assets/dashboard-light-gradient.png"}
              className="block object-cover dark:hidden"
            />
          </div>

          <div className="relative flex justify-center">
            <div className="bg-content2/40 flex flex-col items-center gap-y-1 rounded-lg px-1 py-2 sm:px-16">
              {session ? (
                <p className="text-xl">Hello, {session?.user.name}</p>
              ) : (
                <Button onPress={() => signIn()}>Sign in</Button>
              )}
              <p className="text-xl">What is on your mind today?</p>
              <div className="flex gap-x-1">
                <Button
                  size="sm"
                  color="primary"
                  onPress={() => {
                    setSettingsOpen(true);
                  }}
                >
                  New Project
                </Button>
                <Button
                  size="sm"
                  color="secondary"
                  onPress={() => {
                    editorContext?.setEditorStates((prev) => ({
                      ...prev,
                      isMarketplaceOpen: true,
                    }));
                  }}
                >
                  Marketplace
                </Button>
              </div>
              <Input
                className="sm:w-80"
                onFocus={() => {
                  // Open command viewer
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isCommandViewerOpen: true,
                  }));
                }}
                placeholder={inputPlaceholder}
                label="AI Assistant"
                startContent={
                  <div>
                    <Icon name="auto_awesome" />
                  </div>
                }
              />
              <p>Need help?</p>
              <div className="flex gap-x-1">
                <Button
                  size="sm"
                  variant="faded"
                  onPress={() => {
                    window.open(
                      "https://github.com/claypulse/pulse-editor",
                      "_blank",
                    );
                  }}
                  className="border-0"
                >
                  <div className="flex items-center gap-0.5">
                    <p>GitHub</p>
                    <div>
                      <Icon
                        uri="/assets/github-mark"
                        extension=".svg"
                        isThemed
                        className="p-0.5 pl-0"
                      />
                    </div>
                  </div>
                </Button>
                <Button
                  size="sm"
                  variant="faded"
                  onPress={() => {
                    window.open("https://docs.pulse-editor.com", "_blank");
                  }}
                  className="border-0"
                >
                  <div className="flex items-center gap-0.5">
                    <p>Docs</p>
                    <div>
                      <Icon name="menu_book" className="p-0.5" />
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
          <div className="relative w-full overflow-x-hidden">
            <div className="flex items-center gap-x-4 py-1">
              <h2 className="text-2xl font-semibold">Recent Projects</h2>
              <Button
                className="m-0 flex items-center gap-x-0.5 px-1 py-0"
                variant="light"
                size="sm"
                onPress={() => {
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isSideMenuOpen: true,
                  }));
                }}
              >
                <p className="text-sm whitespace-nowrap">View All</p>
                <div>
                  <Icon name="arrow_outward" />
                </div>
              </Button>
            </div>
            <div className="flex h-60 items-stretch gap-x-2 overflow-x-auto overflow-y-hidden">
              {projects?.map((project, index) => (
                <div key={index} className="h-full min-w-40 shrink-0">
                  <ProjectPreviewCard
                    project={project}
                    workspaceConfig={undefined}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full gap-y-1 overflow-x-hidden rounded-sm">
            <div className="flex w-full justify-center">
              <div>
                <Tabs
                  tabItems={tabItems}
                  selectedItem={tabItems.find(
                    (tab) => tab.name === selectedTab,
                  )}
                  setSelectedItem={(item) => {
                    setSelectedTab(item?.name as "Apps" | "Workflows");
                  }}
                />
              </div>
            </div>

            {selectedTab === "Apps" ? (
              <>
                <div className="flex items-center gap-x-2 sm:gap-x-4 pb-1">
                  <h2 className="text-2xl font-semibold">Latest Apps</h2>
                  <Button
                    className="m-0 flex items-center gap-x-0.5 px-1 py-0"
                    variant="light"
                    size="sm"
                    onPress={() => {
                      editorContext?.setEditorStates((prev) => ({
                        ...prev,
                        isMarketplaceOpen: true,
                      }));
                    }}
                  >
                    <p className="text-sm whitespace-nowrap">View All</p>
                    <div>
                      <Icon name="arrow_outward" />
                    </div>
                  </Button>
                </div>
                <div className="flex h-60 items-stretch gap-x-2 overflow-x-auto overflow-y-hidden">
                  {installedExtensionApps.map((app, index) => (
                    <div key={index} className="h-full min-w-40 shrink-0">
                      <AppPreviewCard
                        extension={app}
                        isShowCompatibleChip={false}
                        isShowInstalledChip={false}
                        isShowUninstallButton={false}
                        isShowUseButton
                        isShowContextMenu={false}
                        onPress={async (ext) => {
                          // TODO: implement open this in project modal
                          const config: AppViewConfig = {
                            app: ext.config.id,
                            viewId: `${ext.config.id}-${v4()}`,
                            recommendedHeight: ext.config.recommendedHeight,
                            recommendedWidth: ext.config.recommendedWidth,
                          };
                          await createAppViewInCanvasView(config);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-x-2 sm:gap-x-4 pb-1">
                  <h2 className="text-2xl font-semibold whitespace-nowrap">
                    Explore Workflows
                  </h2>
                  <Button
                    className="m-0 flex items-center gap-x-0.5 px-1 py-0"
                    variant="light"
                    size="sm"
                    onPress={() => {
                      editorContext?.setEditorStates((prev) => ({
                        ...prev,
                        isMarketplaceOpen: true,
                      }));
                    }}
                  >
                    <p className="text-sm whitespace-nowrap">View All</p>
                    <div>
                      <Icon name="arrow_outward" />
                    </div>
                  </Button>
                </div>
                <div className="flex h-60 items-stretch gap-x-2 overflow-x-auto overflow-y-hidden">
                  {workflows?.map((wf, index) => (
                    <div key={index} className="h-full min-w-40 shrink-0">
                      <WorkflowPreviewCard workflow={wf} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative"></div>
        </div>
      </div>

      <ProjectSettingsModal isOpen={settingsOpen} setIsOpen={setSettingsOpen} />
    </div>
  );
}
