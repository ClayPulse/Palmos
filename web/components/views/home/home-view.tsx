import AppPreviewCard from "@/components/cards/app-preview-card";
import { ProjectPreviewCard } from "@/components/cards/project-preview-card";
import WorkflowPreviewCard from "@/components/cards/workflow-preview-card";
import Icon from "@/components/misc/icon";
import Tabs from "@/components/misc/tabs";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { useEditorAIAssistantHint } from "@/lib/hooks/use-editor-ai-assistant-hint";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useWorkflowManager } from "@/lib/hooks/use-workflow-manager";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { ExtensionApp, Session, TabItem, Workflow } from "@/lib/types";
import { Button, Input, Listbox, ListboxItem, Skeleton } from "@heroui/react";
import { useContext, useState } from "react";
import { useMediaQuery } from "react-responsive";

export default function HomeView() {
  const { createCanvasTabView } = useTabViewManager();
  const { session, signIn } = useAuth();

  return (
    <div className="text-default-foreground h-full w-full px-2 pt-18 pb-2">
      <div className="bg-content1 h-full w-full overflow-hidden rounded-lg">
        <div className="relative grid h-full w-full grid-rows-[max-content_max-content_max-content_max-content_1fr] gap-y-2 overflow-y-auto px-2 py-2 pt-2 pb-6 @sm:px-8 @md:px-12 @lg:px-48">
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

          <OverviewPanel session={session} signIn={signIn} />
          <RecentProjects session={session} />
          <Resources />

          <AppsAndWorkflows />

          <div className="relative"></div>
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({
  session,
  signIn,
}: {
  session?: Session;
  signIn: () => void;
}) {
  const editorContext = useContext(EditorContext);

  const { hint: inputPlaceholder } = useEditorAIAssistantHint();

  return (
    <div className="@container relative flex w-full flex-col items-center justify-center">
      <div className="flex w-full flex-col items-center gap-y-1 rounded-lg px-1 py-2 @sm:w-fit @sm:px-8 @md:px-16">
        {session ? (
          <>
            <p className="text-xl">Hello, {session?.user.name}</p>
            <p className="text-xl">What is on your mind today?</p>
            <div className="flex gap-x-1">
              <Button
                color="primary"
                onPress={() => {
                  editorContext?.updateModalStates({
                    projectSettings: {
                      isOpen: true,
                      projectInfo: undefined,
                    },
                  });
                }}
              >
                New Project
              </Button>
              <Button
                color="secondary"
                onPress={() => {
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    modalStates: {
                      ...prev.modalStates,
                      marketplace: {
                        isOpen: true,
                      },
                    },
                  }));
                }}
              >
                Marketplace
              </Button>
            </div>

            <Input
              className="w-full @sm:w-100"
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
          </>
        ) : (
          <>
            <p className="text-xl font-semibold">Welcome to Pulse Editor</p>
            <p className="text-xl">Sign in to access your projects</p>
            <Button onPress={() => signIn()} color="primary">
              Sign in
            </Button>
          </>
        )}

        <p>Need help?</p>
        <div className="flex gap-x-1">
          <Button
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
              <div>
                <Icon
                  uri="/assets/github-mark"
                  extension=".svg"
                  isThemed
                  className="p-0.5 pl-0"
                />
              </div>
              <p>GitHub</p>
            </div>
          </Button>
          <Button
            variant="faded"
            onPress={() => {
              window.open("https://docs.pulse-editor.com", "_blank");
            }}
            className="border-0"
          >
            <div className="flex items-center gap-0.5">
              <div>
                <Icon name="menu_book" className="p-0.5" />
              </div>
              <p>Docs</p>
            </div>
          </Button>
        </div>

        <Button
          onPress={() =>
            editorContext?.updateModalStates({
              openSourceInfo: {
                isOpen: true,
              },
            })
          }
          variant="faded"
          className="border-0"
        >
          <div className="flex items-center gap-0.5">
            <div>
              <Icon name="code" className="p-0.5" />
            </div>
            <p>Open Source Info</p>
          </div>
        </Button>
      </div>
    </div>
  );
}

function Resources() {
  const editorContext = useContext(EditorContext);

  const { cloudWorkspaces } = useWorkspace();
  const isListClickable = useMediaQuery({ maxWidth: 640 });

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center gap-x-4 py-1">
        <h2 className="text-2xl font-semibold">Your Resources</h2>
        <Button
          className="m-0 flex items-center gap-x-0.5 px-1 py-0"
          variant="light"
          onPress={() => {
            editorContext?.updateModalStates({
              workspaceSettings: { isOpen: true },
            });
          }}
        >
          <p className="text-sm whitespace-nowrap">Manage</p>
          <div>
            <Icon name="arrow_outward" />
          </div>
        </Button>
      </div>

      <h3 className="text-medium pb-1 text-center font-medium">
        Cloud Workspaces
      </h3>
      <Listbox className="w-full">
        {cloudWorkspaces?.map((ws, index) => (
          <ListboxItem
            key={index}
            description={`vCPU:${ws.cpuLimit}, RAM:${ws.memoryLimit}, Storage:${ws.volumeSize}`}
            className="bg-content3 w-full"
            onPress={() => {
              if (isListClickable) {
                editorContext?.updateModalStates({
                  workspaceSettings: {
                    isOpen: true,
                    initialWorkspace: ws,
                    isShowUseButton: false,
                  },
                });
              }
            }}
            endContent={
              <div className="flex items-center gap-x-1">
                <div
                  data-is-running={ws.status === "running"}
                  className="bg-warning data-[is-running=true]:bg-success h-1 w-1 rounded-full"
                ></div>
                <p
                  className="data-[is-running=true]:text-success text-warning text-sm"
                  data-is-running={ws.status === "running"}
                >
                  {ws.status}
                </p>
                <Button
                  className="hidden sm:block"
                  variant="light"
                  size="sm"
                  color="primary"
                  onPress={() => {
                    editorContext?.updateModalStates({
                      workspaceSettings: {
                        isOpen: true,
                        initialWorkspace: ws,
                        isShowUseButton: false,
                      },
                    });
                  }}
                >
                  Manage
                </Button>
              </div>
            }
          >
            {ws.name}
          </ListboxItem>
        )) ?? []}
      </Listbox>
    </div>
  );
}

function RecentProjects({ session }: { session?: Session }) {
  const editorContext = useContext(EditorContext);

  const { projects, isLoading: isLoadingProjects } = useProjectManager();

  return (
    <div className="relative w-full overflow-x-hidden">
      {session && (
        <>
          <div className="flex items-center gap-x-4 py-1">
            <h2 className="text-2xl font-semibold">Recent Projects</h2>
            <Button
              className="m-0 flex items-center gap-x-0.5 px-1 py-0"
              variant="light"
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
          <div className="flex h-60 items-start gap-x-2 overflow-x-auto overflow-y-hidden">
            {isLoadingProjects && !projects && (
              <>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
              </>
            )}

            {projects?.map((project, index) => (
              <div key={index} className="h-full min-w-40 shrink-0">
                <ProjectPreviewCard
                  project={project}
                  workspaceConfig={undefined}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AppsAndWorkflows() {
  const editorContext = useContext(EditorContext);

  const { marketplaceExtensions, isLoadingMarketplaceExtensions } =
    useExtensionAppManager("All");
  const { workflows, isLoading: isLoadingWorkflow } = useWorkflowManager("All");

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

  async function openAppInProject(ext: ExtensionApp) {
    editorContext?.updateModalStates({
      openInProject: {
        isOpen: true,
        app: ext,
      },
    });
  }

  async function openWorkflowInProject(workflow: Workflow) {
    editorContext?.updateModalStates({
      openInProject: {
        isOpen: true,
        workflow: workflow,
      },
    });
  }

  return (
    <div className="relative w-full gap-y-1 overflow-x-hidden rounded-sm">
      <div className="flex w-full justify-center">
        <div className="bg-content3/75 rounded-2xl">
          <Tabs
            tabItems={tabItems}
            selectedItem={tabItems.find((tab) => tab.name === selectedTab)}
            setSelectedItem={(item) => {
              setSelectedTab(item?.name as "Apps" | "Workflows");
            }}
          />
        </div>
      </div>

      {selectedTab === "Apps" ? (
        <>
          <div className="flex items-center gap-x-2 pb-1 sm:gap-x-4">
            <h2 className="text-2xl font-semibold">Latest Apps</h2>
            <Button
              className="m-0 flex items-center gap-x-0.5 px-1 py-0"
              variant="light"
              onPress={() => {
                editorContext?.setEditorStates((prev) => ({
                  ...prev,
                  modalStates: {
                    ...prev.modalStates,
                    marketplace: {
                      isOpen: true,
                    },
                  },
                }));
              }}
            >
              <p className="text-sm whitespace-nowrap">View All</p>
              <div>
                <Icon name="arrow_outward" />
              </div>
            </Button>
          </div>
          <div className="flex items-start gap-x-2 overflow-x-auto overflow-y-hidden">
            {isLoadingMarketplaceExtensions && (
              <>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
              </>
            )}

            {marketplaceExtensions?.map((app, index) => (
              <div key={index} className="h-full max-w-80 min-w-40 shrink-0">
                <AppPreviewCard
                  extension={app}
                  isShowCompatibleChip={false}
                  isShowInstalledChip={false}
                  isShowUninstallButton={false}
                  isShowUseButton
                  isShowContextMenu={false}
                  isShowInstallationButtons={false}
                  onPress={openAppInProject}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-x-2 pb-1 sm:gap-x-4">
            <h2 className="text-2xl font-semibold whitespace-nowrap">
              Explore Workflows
            </h2>
            <Button
              className="m-0 flex items-center gap-x-0.5 px-1 py-0"
              variant="light"
              onPress={() => {
                editorContext?.setEditorStates((prev) => ({
                  ...prev,
                  modalStates: {
                    ...prev.modalStates,
                    marketplace: {
                      isOpen: true,
                    },
                  },
                }));
              }}
            >
              <p className="text-sm whitespace-nowrap">View All</p>
              <div>
                <Icon name="arrow_outward" />
              </div>
            </Button>
          </div>
          <div className="flex items-start gap-x-2 overflow-x-auto overflow-y-hidden">
            {isLoadingWorkflow && (
              <>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
                <Skeleton className="h-60 w-60 shrink-0 rounded-xl"></Skeleton>
              </>
            )}

            {workflows?.map((wf, index) => (
              <div key={index} className="h-full max-w-80 min-w-40 shrink-0">
                <WorkflowPreviewCard
                  workflow={wf}
                  onPress={openWorkflowInProject}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
