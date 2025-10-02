import AppExplorer from "@/components/explorer/app/app-explorer";
import ProjectExplorer from "@/components/explorer/project/project-explorer";
import Tabs from "@/components/misc/tabs";
import ProjectSettingsModal from "@/components/modals/project-settings-modal";
import { EditorContext } from "@/components/providers/editor-context-provider";
import useExplorer from "@/lib/hooks/use-explorer";
import { useScreenSize } from "@/lib/hooks/use-screen-size";
import { isWeb } from "@/lib/platform-api/platform-checker";
import { TabItem } from "@/lib/types";
import { Button } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useContext, useState } from "react";
import FileSystemExplorer from "../../explorer/file-system/fs-explorer";
import Icon from "../../misc/icon";

export default function NavSideMenu({
  isMenuOpen,
  setIsMenuOpen,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}) {
  return (
    <AnimatePresence>
      {isMenuOpen && (
        <MenuPanel>
          <div className="h-full w-full min-[768px]:py-2 min-[768px]:pr-1 min-[768px]:pl-2 overflow-y-hidden">
            <div className="bg-content2 flex h-full w-full flex-col overflow-hidden shadow-md min-[768px]:rounded-xl">
              <div className="flex w-full items-center px-2 py-1 max-[768px]:justify-end">
                <Button
                  className="hidden max-[768px]:block"
                  onPress={() => setIsMenuOpen(false)}
                  isIconOnly
                  variant="light"
                >
                  <Icon name="close" />
                </Button>
                <Button
                  className="max-[768px]:hidden"
                  onPress={() => setIsMenuOpen(false)}
                  isIconOnly
                  variant="light"
                >
                  <Icon name="arrow_back" />
                </Button>
              </div>

              <PanelContent setIsMenuOpen={setIsMenuOpen} />
            </div>
          </div>
        </MenuPanel>
      )}
    </AnimatePresence>
  );
}

function MenuPanel({ children }: { children?: React.ReactNode }) {
  const { isLandscape } = useScreenSize();

  return (
    <>
      {isLandscape ? (
        <motion.div
          className="z-50 hidden h-full w-[400px] shrink-0 md:block"
          initial={{
            x: -400,
          }}
          animate={{
            x: 0,
          }}
          exit={{
            x: -400,
          }}
          transition={{
            type: "tween",
          }}
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          className="absolute z-50 h-full w-full md:hidden"
          initial={{
            y: "-100vh",
          }}
          animate={{
            y: 0,
          }}
          exit={{
            y: "-100vh",
          }}
          transition={{
            type: "tween",
          }}
        >
          {children}
        </motion.div>
      )}
    </>
  );
}

function PanelContent({
  setIsMenuOpen,
}: {
  setIsMenuOpen: (isOpen: boolean) => void;
}) {
  const editorContext = useContext(EditorContext);

  const { selectAndSetProjectHome } = useExplorer();

  const [isProjectSettingsModalOpen, setIsProjectSettingsModalOpen] =
    useState(false);

  const tabItems: TabItem[] = [
    {
      name: "Projects",
      description: "List of projects",
      icon: "folder",
    },
    {
      name: "Apps",
      description: "List of apps",
      icon: "apps",
    },
    {
      name: "Workspace",
      description: "Project workspace",
      icon: "folder",
    },
  ];
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);

  // Choose project home path
  if (!isWeb() && !editorContext?.persistSettings?.projectHomePath) {
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
          Select Project Home Path
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full grid grid-rows-[max-content_auto] overflow-y-hidden">
      <div className="flex w-full justify-center">
        <div className="w-fit">
          <Tabs
            tabItems={tabItems}
            selectedItem={tabItems[selectedTabIndex]}
            setSelectedItem={(item) => {
              const index = tabItems.findIndex(
                (tab) => tab.name === item?.name,
              );
              setSelectedTabIndex(index !== -1 ? index : 0);
            }}
            isClosable={false}
          />
        </div>
      </div>
      <div className="h-full w-full overflow-y-hidden">
        {tabItems[selectedTabIndex]?.name === "Apps" ? (
          <AppExplorer />
        ) : tabItems[selectedTabIndex]?.name === "Workspace" ? (
          <FileSystemExplorer setIsMenuOpen={setIsMenuOpen} />
        ) : (
          <div className="bg-content2 h-full w-full space-y-2 overflow-y-auto px-4">
            <p className="text-center text-lg font-medium">View Projects</p>
            <Button
              className="w-full"
              onPress={() => {
                setIsProjectSettingsModalOpen(true);
              }}
            >
              New Project
            </Button>
            <ProjectExplorer />
          </div>
        )}
      </div>
      <ProjectSettingsModal
        isOpen={isProjectSettingsModalOpen}
        setIsOpen={setIsProjectSettingsModalOpen}
      />
    </div>
  );
}
