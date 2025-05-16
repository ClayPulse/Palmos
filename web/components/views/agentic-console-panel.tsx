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
import { Button, Divider, Tooltip } from "@heroui/react";
import AgentConfigModal from "../modals/agent-config-modal";
import { EditorContext } from "../providers/editor-context-provider";
import Tabs from "@/components/misc/tabs";
import Icon from "../misc/icon";
import { ExtensionTypeEnum } from "@pulse-editor/shared-utils";
import ConsoleViewLoader from "./loaders/console-view-loader";
import { v4 } from "uuid";

function ConsoleNavBar({
  consoles,
  setConsoles,
  selectedConsole,
  setSelectedConsole,
}: {
  consoles: Extension[];
  setConsoles: Dispatch<SetStateAction<Extension[]>>;
  selectedConsole: Extension | undefined;
  setSelectedConsole: Dispatch<SetStateAction<Extension | undefined>>;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

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

export default function AgenticConsolePanel() {
  const [consoles, setConsoles] = useState<Extension[]>([]);
  const [selectedConsole, setSelectedConsole] = useState<Extension | undefined>(
    undefined,
  );

  // const chatHistoryMap = useRef<Map<string, ChatMessage[]>>(new Map());
  // const [currentChatHistory, setCurrentChatHistory] = useState<ChatMessage[]>(
  //   [],
  // );

  // const [inputValue, setInputValue] = useState<string>("");
  // const chatListRef = useRef<HTMLDivElement>(null);
  // const [isThinking, setIsThinking] = useState<boolean>(false);

  const editorContext = useContext(EditorContext);

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
    }
  }, []);

  useEffect(() => {
    setSelectedConsole(consoles[0] || undefined);
  }, [consoles]);

  return (
    <ExtensionViewLayout>
      <div className="bg-content1 flex h-full w-full flex-col pb-3">
        <ConsoleNavBar
          consoles={consoles}
          setConsoles={setConsoles}
          selectedConsole={selectedConsole}
          setSelectedConsole={setSelectedConsole}
        />

        <ConsoleViewLoader
          consoleExt={selectedConsole}
        />
      </div>
    </ExtensionViewLayout>
  );
}
