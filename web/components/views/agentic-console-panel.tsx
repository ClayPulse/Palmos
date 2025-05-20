"use client";

import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import ExtensionViewLayout from "./layout";
import { TabItem, Extension } from "@/lib/types";
import { Button, Divider, select, Tooltip } from "@heroui/react";
import AgentConfigModal from "../modals/agent-config-modal";
import { EditorContext } from "../providers/editor-context-provider";
import Tabs from "@/components/misc/tabs";
import Icon from "../misc/icon";
import { ExtensionTypeEnum, ViewModel } from "@pulse-editor/shared-utils";
import { AnimatePresence, motion } from "framer-motion";
import { v4 } from "uuid";
import ViewLoader from "./loaders/view-loader";

export default function AgenticConsolePanel() {
  const editorContext = useContext(EditorContext);

  const [consoles, setConsoles] = useState<Extension[]>([]);
  const [viewModels, setViewModels] = useState<ViewModel[]>([]);

  const [selectedConsoleIndex, setSelectedConsoleIndex] = useState<number>(0);

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Load extensions from editor context
    if (editorContext?.persistSettings?.extensions) {
      const foundConsoles = editorContext.persistSettings?.extensions.filter(
        (extension) =>
          extension.config.extensionType === ExtensionTypeEnum.ConsoleView,
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
          extensionConfig: ext.config,
        })),
      );
    }
  }, [editorContext?.persistSettings?.extensions]);

  useEffect(() => {
    if (editorContext?.editorStates.isChatViewOpen) {
      // Add view models to editor states
      editorContext.setEditorStates((prev) => ({
        ...prev,
        openedViewModels: [
          ...(prev.openedViewModels ?? []),
          ...viewModels.map((vm) => ({
            ...vm,
            isFocused: false,
          })),
        ],
      }));
    } else {
      // Remove view models from editor states
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        openedViewModels: prev.openedViewModels?.filter(
          (vm) => !viewModels.some((v) => v.viewId === vm.viewId),
        ),
      }));
    }
  }, [viewModels, editorContext?.editorStates.isChatViewOpen]);

  return (
    <AnimatePresence>
      <motion.div
        className="hidden h-[60%] w-full shrink-0 pb-0 data-[is-open=true]:block data-[is-open=true]:pb-14"
        // Enter from bottom and exit to bottom
        initial={false}
        animate={{ y: editorContext?.editorStates.isChatViewOpen ? 0 : "100%" }}
        data-is-open={editorContext?.editorStates.isChatViewOpen || isAnimating}
        onAnimationStart={() => {
          setIsAnimating(true);
        }}
        onAnimationComplete={() => {
          setIsAnimating(false);
        }}
      >
        <ExtensionViewLayout>
          <div className="bg-content1 flex h-full w-full flex-col">
            <ConsoleNavBar
              consoles={consoles}
              setConsoles={setConsoles}
              selectedConsoleIndex={selectedConsoleIndex}
              setSelectedConsoleIndex={setSelectedConsoleIndex}
            />

            {viewModels.length > 0 && (
              <ViewLoader
                viewModel={viewModels[selectedConsoleIndex]}
                setViewModel={(viewModel: ViewModel) => {
                  const newViewModels = [...viewModels];
                  newViewModels[selectedConsoleIndex] = viewModel;
                  setViewModels(newViewModels);
                }}
              />
            )}
          </div>
        </ExtensionViewLayout>
      </motion.div>
    </AnimatePresence>
  );
}

function ConsoleNavBar({
  consoles,
  setConsoles,
  selectedConsoleIndex,
  setSelectedConsoleIndex,
}: {
  consoles: Extension[];
  setConsoles: Dispatch<SetStateAction<Extension[]>>;
  selectedConsoleIndex: number;
  setSelectedConsoleIndex: Dispatch<SetStateAction<number>>;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [selectedConsole, setSelectedConsole] = useState<Extension | undefined>(
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
