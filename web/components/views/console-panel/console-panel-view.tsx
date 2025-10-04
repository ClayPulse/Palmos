"use client";

import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { TabItem, ExtensionApp } from "@/lib/types";
import { Button, Divider, select, Tooltip } from "@heroui/react";
import AgentConfigModal from "../../modals/agent-config-modal";
import { EditorContext } from "../../providers/editor-context-provider";
import Tabs from "@/components/misc/tabs";
import Icon from "../../misc/icon";
import { AppTypeEnum, ViewModel } from "@pulse-editor/shared-utils";
import { AnimatePresence, motion } from "framer-motion";
import { v4 } from "uuid";
import SandboxAppLoader from "../../app-loaders/sandbox-app-loader";
import AppViewLayout from "../standalone-app/layout";

function ConsoleNavBar({
  consoles,
  setConsoles,
  selectedConsoleIndex,
  setSelectedConsoleIndex,
}: {
  consoles: ExtensionApp[];
  setConsoles: Dispatch<SetStateAction<ExtensionApp[]>>;
  selectedConsoleIndex: number;
  setSelectedConsoleIndex: Dispatch<SetStateAction<number>>;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [selectedConsole, setSelectedConsole] = useState<ExtensionApp | undefined>(
    undefined,
  );

  useEffect(() => {
    if (consoles.length > 0) {
      setSelectedConsole(consoles[selectedConsoleIndex]);
    }
  }, []);

  // Update index when selected console changes
  useEffect(() => {
    if (selectedConsole) {
      const index = consoles.findIndex(
        (ext) =>
          ext.config.displayName === selectedConsole.config.displayName ||
          ext.config.id === selectedConsole.config.id,
      );
      setSelectedConsoleIndex(index);
    }
  }, [selectedConsole]);

  return (
    <div className="bg-content2 text-content2-foreground flex h-10 w-full shrink-0 items-center">
      <Tabs
        tabItems={
          consoles?.map((extension) => {
            const item: TabItem = {
              name: extension.config.displayName ?? extension.config.id,
              icon: extension.config.materialIcon,
              description: extension.config.description ?? "",
            };
            return item;
          }) ?? []
        }
        selectedItem={{
          name:
            selectedConsole?.config.displayName ??
            selectedConsole?.config.id ??
            "",
          icon: selectedConsole?.config.materialIcon,
          description: selectedConsole?.config.description ?? "",
        }}
        setSelectedItem={(item) => {
          if (item) {
            const ext = consoles.find(
              (ext) =>
                ext.config.displayName === item.name ||
                ext.config.id === item.name,
            );
            setSelectedConsole(ext);
          }
        }}
      />
      <div className="flex h-full items-center py-2">
        <Divider orientation="vertical" />
        <Tooltip content="Add a new agent definition">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => {
              setIsOpen(true);
            }}
          >
            <Icon variant="outlined" name="add" />
          </Button>
        </Tooltip>
        <AgentConfigModal isOpen={isOpen} setIsOpen={setIsOpen} />
      </div>
      <div className="flex grow justify-end pr-2">
        <Tooltip content="Close tab">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => {
              if (selectedConsole) {
                const newTermExts = consoles.filter(
                  (ext) =>
                    ext.config.displayName !==
                      selectedConsole.config.displayName &&
                    ext.config.id !== selectedConsole.config.id,
                );
                setConsoles(newTermExts);
                setSelectedConsole(newTermExts[0]);
              }
            }}
          >
            <Icon name="delete" className="text-danger" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

export default function ConsolePanelView() {
  const editorContext = useContext(EditorContext);

  const [consoles, setConsoles] = useState<ExtensionApp[]>([]);
  const [viewModels, setViewModels] = useState<ViewModel[]>([]);

  const [selectedConsoleIndex, setSelectedConsoleIndex] = useState<number>(0);

  const [isAnimating, setIsAnimating] = useState(false);
  const [isFirstOpened, setIsFirstOpened] = useState(false);

  useEffect(() => {
    if (editorContext?.editorStates.isConsolePanelOpen) {
      setIsFirstOpened(true);
    }
  }, [editorContext?.editorStates.isConsolePanelOpen]);

  useEffect(() => {
    // Load extensions from editor context
    if (editorContext?.persistSettings?.extensions && isFirstOpened) {
      const foundConsoles = editorContext.persistSettings?.extensions.filter(
        (extension) =>
          extension.config.appType === AppTypeEnum.ConsoleView,
      );
      console.log(
        "Found consoles:",
        foundConsoles.map((ext) => ext.config.displayName),
      );
      setConsoles(foundConsoles);
      setViewModels(
        foundConsoles.map((ext) => ({
          viewId: v4(),
          isFocused: false,
          appConfig: ext.config,
        })),
      );
    }
  }, [editorContext?.persistSettings?.extensions, isFirstOpened]);

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-0 z-10 hidden h-[60%] w-full shrink-0 px-2 py-2 pb-6 data-[is-open=true]:block data-[is-toolbar-open=true]:pb-16"
        // Enter from bottom and exit to bottom
        initial={false}
        animate={{
          y: editorContext?.editorStates.isConsolePanelOpen ? 0 : "100%",
        }}
        data-is-open={
          editorContext?.editorStates.isConsolePanelOpen || isAnimating
        }
        onAnimationStart={() => {
          setIsAnimating(true);
        }}
        onAnimationComplete={() => {
          setIsAnimating(false);
        }}
        data-is-toolbar-open={editorContext?.editorStates.isToolbarOpen}
      >
        <div className="h-full w-full">
          <AppViewLayout>
            <div className="bg-content1 flex h-full w-full flex-col">
              <ConsoleNavBar
                consoles={consoles}
                setConsoles={setConsoles}
                selectedConsoleIndex={selectedConsoleIndex}
                setSelectedConsoleIndex={setSelectedConsoleIndex}
              />

              {/* Refactor this such that ConsolePanelView does not manage view models. 
                Instead, it just maintains the list of app configs, and passes them to a
                BaseAppView which manages its own view model internally.
              */}
              {viewModels.length > 0 && (
                <SandboxAppLoader
                  viewModel={viewModels[selectedConsoleIndex]}
                />
              )}
            </div>
          </AppViewLayout>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
