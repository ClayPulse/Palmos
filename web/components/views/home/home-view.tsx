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
import { useTranslations } from '@/lib/hooks/use-translations';
import {
  fetchLatestApp,
  getDefaultRemoteOrigin,
} from "@/lib/module-federation/remote";
import { ExtensionApp, Session, TabItem, Workflow } from "@/lib/types";
import {
  addToast,
  Button,
  Divider,
  Listbox,
  ListboxItem,
  Skeleton,
} from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useContext, useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";

const getVibeCodeHints = (t: (key: string) => string) => [
  t('homeView.vibeCode.newApp'),
  t('homeView.vibeCode.blog'),
  t('homeView.vibeCode.portfolio'),
  t('homeView.vibeCode.weatherApp'),
  t('homeView.vibeCode.chatApp'),
  t('homeView.vibeCode.socialMediaApp'),
  t('homeView.vibeCode.fitnessTracker'),
  t('homeView.vibeCode.recipeApp'),
];

export default function HomeView() {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const { createCanvasTabView } = useTabViewManager();
  const { session, signIn } = useAuth();

  return (
    <div className="text-default-foreground h-full w-full px-2 pt-18 pb-2">
      <div className="bg-content1 h-full w-full overflow-y-auto rounded-lg">
        <div className="relative h-full w-full gap-y-2 overflow-x-hidden">
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

          <div className="relative flex h-full w-full flex-col gap-y-2 px-2 sm:px-8 lg:px-48">
            <OverviewPanel session={session} signIn={signIn} />

            {/* Quick-start / featured for users to get started coding apps right away */}
            <MarketplaceAppsAndWorkflows />
            <Divider />

            {/* My apps and projects */}
            <MyAppsAndProjects session={session} />
            <Divider />

            <MyResources />

            {/* Footer */}
            <div
              className="flex w-full justify-center pt-4 pb-[max(16px,env(safe-area-inset-bottom)+12px)] data-[is-toolbar-open=true]:pb-[max(60px,env(safe-area-inset-bottom)+60px)]"
              data-is-toolbar-open={
                editorContext?.editorStates.isToolbarOpen ? "true" : "false"
              }
            >
              <p className="text-default-foreground/50 text-sm">
                Made with ❤️ by
                <a
                  href="https://claypulse.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary ml-1 underline"
                >
                  ClayPulse AI
                </a>
              </p>
            </div>
          </div>
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
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const { hint: inputPlaceholder } = useEditorAIAssistantHint();

  const {} = useExtensionAppManager();

  async function getVibeCodeApp() {
    const appId = "vibe_dev_flow";

    let latestVersion;
    try {
      latestVersion = await fetchLatestApp(appId);
    } catch (error) {
      console.error("Failed to fetch latest version.");
      addToast({
        title: t('statusScreens.error.title'),
        description: "Failed to fetch latest version of Vibe Code.",
        color: "danger",
      });
      return null;
    }

    const app: ExtensionApp = {
      config: latestVersion.appConfig!,
      remoteOrigin: getDefaultRemoteOrigin(),
      isEnabled: true,
    };

    return app;
  }

  async function handleOpenVibeCode() {
    const app = await getVibeCodeApp();

    if (!app) {
      return;
    }

    editorContext?.updateModalStates({
      quickVibeCodeSetup: {
        isOpen: true,
        app: app,
      },
    });
  }

  const vibeCodeHints = getVibeCodeHints(t);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentHintIndex((prev) => (prev + 1) % vibeCodeHints.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="@container relative flex h-3/4 w-full shrink-0 flex-col items-center justify-center">
      <div className="flex w-full flex-col items-center gap-y-2 rounded-lg px-1 py-2 @sm:w-fit @sm:px-8 @md:px-16">
        {session && (
          <>
            <p className="text-center text-2xl">Hello, {session?.user.name}</p>
            <p className="text-center text-2xl">What is on your mind today?</p>

            <Button
              className="border-divider border bg-amber-900/80 shadow-sm transition-colors hover:bg-amber-800/80 dark:border-amber-400/40 dark:bg-amber-900/30 dark:hover:bg-amber-900/20"
              onPress={handleOpenVibeCode}
            >
              <motion.div
                className="flex items-center gap-2 rounded-full px-3 py-1"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <motion.span
                  className="bg-gradient-to-r from-amber-400 via-amber-100 to-amber-400 bg-[length:200%_100%] bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
                  initial={{ backgroundPosition: "200% 50%" }}
                  animate={{ backgroundPosition: ["200% 50%", "0% 50%"] }}
                  transition={{
                    backgroundPosition: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    },
                  }}
                >
                  <Icon name="bolt" />
                </motion.span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={vibeCodeHints[currentHintIndex]}
                    className="bg-gradient-to-r from-amber-400 via-amber-100 to-amber-400 bg-[length:200%_100%] bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
                    initial={{
                      opacity: 0,
                      y: -20,
                      backgroundPosition: "200% 50%",
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundPosition: ["200% 50%", "0% 50%"],
                    }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{
                      duration: 0.6,
                      ease: "easeOut",
                      backgroundPosition: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      },
                    }}
                  >
                    {vibeCodeHints[currentHintIndex]}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
            </Button>

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
                <div className="flex items-center gap-2">
                  <Icon name="add" className="text-primary-foreground" />
                  <p className="text-primary-foreground">{t('fileMenu.newProject')}</p>
                </div>
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
                <div className="flex items-center gap-2">
                  <Icon name="store" className="text-primary-foreground" />
                  <p className="text-primary-foreground">{t('editorToolbar.marketplace.tooltip')}</p>
                </div>
              </Button>
            </div>

            {/* TODO: Add back in the future when AI chat simplifies */}
            {/* <Input
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
            /> */}
          </>
        )}

        {!session && (
          <>
            <p className="text-xl font-semibold">{t('statusScreens.welcome.title')}</p>
            <p className="text-xl">{t('homeView.signIn.message')}</p>
            <Button onPress={() => signIn()} color="primary">
              {t('common.signIn')}
            </Button>
          </>
        )}
        <p className="pt-2 text-center">{t('homeView.learnMore')}</p>
        <div className="flex gap-x-1">
          <Button
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
          className="border-0"
        >
          <div className="flex items-center gap-0.5">
            <div>
              <Icon name="code" className="p-0.5" />
            </div>
            <p>{t('openSourceInfoModal.title')}</p>
          </div>
        </Button>
      </div>
    </div>
  );
}

function MarketplaceAppsAndWorkflows() {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const { marketplaceExtensions, isLoadingMarketplaceExtensions } =
    useExtensionAppManager("All");
  const { workflows, isLoading: isLoadingWorkflow } = useWorkflowManager("All");

  const tabItems: TabItem[] = [
    {
      name: t('workflowGallery.title'),
      description: "Community workflows",
      icon: "hub",
    },
    {
      name: t('appGallery.title'),
      description: "Community apps",
      icon: "apps",
    },
  ];

  const [selectedTab, setSelectedTab] = useState<string>(
    t('workflowGallery.title'),
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
    <div className="relative w-full shrink-0 gap-y-1 overflow-x-hidden rounded-sm">
      <h2 className="pb-4 text-center text-5xl font-semibold">
        {t('homeView.exploreMarketplace.button')}
      </h2>

      <div className="flex w-full justify-center">
        <div className="bg-content3/75 rounded-2xl">
          <Tabs
            tabItems={tabItems}
            selectedItem={tabItems.find((tab) => tab.name === selectedTab)}
            setSelectedItem={(item) => {
              setSelectedTab(item?.name ?? t('workflowGallery.title'));
            }}
          />
        </div>
      </div>

      {selectedTab === t('appGallery.title') ? (
        <>
          <div className="flex items-center gap-x-2 pb-1 sm:gap-x-4">
            <h2 className="text-2xl font-semibold">{t('appGallery.title')}</h2>
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
              <p className="text-sm whitespace-nowrap">{t('common.viewAll')}</p>
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

            {marketplaceExtensions?.length === 0 &&
              !isLoadingMarketplaceExtensions && (
                <p className="text-medium w-full py-4 text-center font-medium">
                  {t('appGallery.noApps')}
                </p>
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
              {t('workflowGallery.title')}
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
              <p className="text-sm whitespace-nowrap">{t('common.viewAll')}</p>
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

            {workflows?.length === 0 && !isLoadingWorkflow && (
              <p className="text-medium w-full py-4 text-center font-medium">
                {t('workflowGallery.noWorkflows')}
              </p>
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

function MyAppsAndProjects({ session }: { session?: Session }) {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const { marketplaceExtensions, isLoadingMarketplaceExtensions } =
    useExtensionAppManager("Published by Me");
  const { projects, isLoading: isLoadingProjects } = useProjectManager();

  const tabItems: TabItem[] = [
    {
      name: t('homeView.myApps.tab'),
      description: "Apps published by me",
      icon: "apps",
    },
    {
      name: t('homeView.myProjects.tab'),
      description: "Projects created by me",
      icon: "folder",
    },
  ];

  const [selectedTab, setSelectedTab] = useState<string>(
    t('homeView.myApps.tab'),
  );

  async function openAppInProject(ext: ExtensionApp) {
    editorContext?.updateModalStates({
      openInProject: {
        isOpen: true,
        app: ext,
      },
    });
  }

  return (
    <div className="relative w-full shrink-0 overflow-x-auto">
      <h2 className="pb-4 text-center text-5xl font-semibold">
        {t('homeView.myAppsAndProjects')}
      </h2>
      <div className="flex w-full justify-center">
        <div className="bg-content3/75 rounded-2xl">
          <Tabs
            tabItems={tabItems}
            selectedItem={tabItems.find((tab) => tab.name === selectedTab)}
            setSelectedItem={(item) => {
              setSelectedTab(item?.name ?? t('homeView.myApps.tab'));
            }}
          />
        </div>
      </div>

      {selectedTab === t('homeView.myApps.tab') ? (
        <>
          <div className="flex items-center gap-x-2 pb-1 sm:gap-x-4">
            <h2 className="text-2xl font-semibold">{t('homeView.myApps.title')}</h2>
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
              <p className="text-sm whitespace-nowrap">{t('common.viewAll')}</p>
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
        session && (
          <>
            <div className="flex items-center gap-x-4 py-1">
              <h2 className="text-2xl font-semibold">{t('homeView.myProjects.title')}</h2>
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
                <p className="text-sm whitespace-nowrap">{t('common.viewAll')}</p>
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
        )
      )}
    </div>
  );
}

function MyResources() {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const { cloudWorkspaces } = useWorkspace();
  const isListClickable = useMediaQuery({ maxWidth: 640 });

  return (
    <div className="flex w-full shrink-0 flex-col">
      <div className="flex items-center gap-x-4 py-1">
        <h2 className="text-2xl font-semibold">{t('homeView.yourResources')}</h2>
        <Button
          className="m-0 flex items-center gap-x-0.5 px-1 py-0"
          variant="light"
          onPress={() => {
            editorContext?.updateModalStates({
              workspaceSettings: { isOpen: true },
            });
          }}
        >
          <p className="text-sm whitespace-nowrap">{t('subscription.managePlan')}</p>
          <div>
            <Icon name="arrow_outward" />
          </div>
        </Button>
      </div>

      <h3 className="text-medium pb-1 text-center font-medium">
        {t('homeView.cloudWorkspaces')}
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
                  {t('subscription.managePlan')}
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
