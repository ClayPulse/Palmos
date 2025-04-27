"use client";

import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import FileViewLayout from "./layout";
import { ChatMessage, TabItem, Extension } from "@/lib/types";
import { Avatar, Button, Divider, Tooltip } from "@heroui/react";
import { BeatLoader } from "react-spinners";
import AgentConfigModal from "../modals/agent-config-modal";
import { EditorContext } from "../providers/editor-context-provider";
import Tabs from "@/components/misc/tabs";
import Icon from "../misc/icon";
import { ExtensionTypeEnum } from "@pulse-editor/shared-utils";
import ConsoleViewLoader from "./loaders/console-view-loader";

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
    <div className="flex h-10 w-full shrink-0 items-center bg-content2 text-content2-foreground">
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
        {/* <Tooltip content="Refresh agent instance">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => {
              if (selectedTerminalExt) {
                chatHistoryMap.current.set(
                  selectedTerminalExt.config.displayName ??
                    selectedTerminalExt.config.id,
                  [],
                );
                setCurrentChatHistory([]);
              }
            }}
          >
            <Icon name="refresh" />
          </Button>
        </Tooltip> */}
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

  // useEffect(() => {
  //   // Scroll chat list to bottom
  //   if (chatListRef.current) {
  //     chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  //   }

  //   // Update chat history map
  //   if (selectedConsole) {
  //     chatHistoryMap.current.set(selectedConsole.config.id, currentChatHistory);
  //   }
  // }, [currentChatHistory]);

  // useEffect(() => {
  //   if (selectedTerminal) {
  //     // Get chat history
  //     if (!chatHistoryMap.current.has(selectedTerminal.config.id)) {
  //       chatHistoryMap.current.set(selectedTerminal.config.id, []);
  //     }
  //     setCurrentChatHistory(
  //       chatHistoryMap.current.get(selectedTerminal.config.id) || [],
  //     );

  //     if (
  //       editorContext?.persistSettings?.llmAPIKey &&
  //       editorContext?.persistSettings?.llmProvider &&
  //       editorContext?.persistSettings?.llmModel
  //     ) {
  //       const llm = getModelLLM(
  //         editorContext?.persistSettings.llmAPIKey,
  //         editorContext?.persistSettings.llmProvider,
  //         editorContext?.persistSettings.llmModel,
  //         0.85,
  //       );
  //       agentRef.current = new TerminalAgent(llm, selectedTerminal);
  //     }
  //   }
  // }, [selectedTerminal]);

  useEffect(() => {
    setSelectedConsole(consoles[0] || undefined);
  }, [consoles]);

  // async function onInputSubmit(content: string) {
  //   if (!agentRef.current) {
  //     toast.error("LLM agent is not configured");
  //   }

  //   const userMessage: ChatMessage = {
  //     from: "User",
  //     content: content,
  //     datetime: new Date().toLocaleDateString(),
  //   };
  //   setCurrentChatHistory((prev) => [...prev, userMessage]);
  //   setInputValue("");
  //   setIsThinking(true);

  //   // Get all code editor views and their content
  //   const codeEditorViews = editorContext?.viewManager?.getViewByType(
  //     ViewTypeEnum.Code,
  //   );
  //   const viewDocuments: FileViewModel[] = [];
  //   codeEditorViews?.forEach((view) => {
  //     const viewDocument = view.viewDocument;
  //     if (viewDocument) {
  //       viewDocuments.push(viewDocument);
  //     }
  //   });

  //   const viewContent = viewDocuments
  //     .map((view, index) => `Code file ${index}:\n${view.fileContent}`)
  //     .join("\n\n");

  //   // Try to generate agent completion
  //   try {
  //     const res = await agentRef.current?.generateAgentCompletion(
  //       userMessage,
  //       viewContent,
  //     );

  //     const agentMessage: ChatMessage = {
  //       from: selectedTerminal?.name || "Agent",
  //       content: res || "No response",
  //       datetime: new Date().toLocaleDateString(),
  //     };

  //     setCurrentChatHistory((prev) => [...prev, agentMessage]);
  //   } catch (e) {
  //     toast.error("Error in generating agent completion. Please try again.");
  //   }
  //   setIsThinking(false);
  // }

  // function MessageBlock({ message }: { message: ChatMessage }) {
  //   return (
  //     <div className="flex w-full space-x-2 text-base">
  //       <div className="pt-0.5">
  //         <Avatar />
  //       </div>
  //       <div className="flex w-full min-w-0 grow flex-col space-y-1.5">
  //         <div className="flex h-4 space-x-3">
  //           <p className="font-bold">
  //             {message.from === "User" ? "You" : message.from}
  //           </p>
  //           <p className="opacity-60">{message.datetime}</p>
  //         </div>
  //         <div className="w-full">
  //           <p className="w-full whitespace-pre-wrap break-words">
  //             {message.content}
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <FileViewLayout>
      <div className="flex h-full w-full flex-col bg-content1 pb-3">
        <ConsoleNavBar
          consoles={consoles}
          setConsoles={setConsoles}
          selectedConsole={selectedConsole}
          setSelectedConsole={setSelectedConsole}
        />

        <ConsoleViewLoader consoleExt={selectedConsole} />

        {/* <div
          ref={chatListRef}
          className="min-h-0 w-full grow space-y-2 overflow-y-auto px-4 py-1"
        >
          {currentChatHistory.map((message, index) => (
            <MessageBlock key={index} message={message} />
          ))}
          {isThinking && (
            <div className="flex w-full justify-center">
              <BeatLoader className="[&>span]:bg-content1-foreground!" />
            </div>
          )}
        </div> */}
        {/* 
        <Input
          className="px-2"
          placeholder="Type a message"
          classNames={{
            inputWrapper: ["data-[hover=true]:bg-content2", "pl-4"],
            input: ["text-base"],
          }}
          endContent={
            <div className="flex h-full items-center">
              <Button isIconOnly variant="light" size="sm">
                <Icon variant="outlined" name="insert_link" />
              </Button>
              <Button isIconOnly variant="light" size="sm">
                <Icon variant="outlined" name="insert_photo" />
              </Button>
              <Button isIconOnly variant="light" size="sm">
                <Icon variant="outlined" name="insert_drive_file" />
              </Button>
              <div className="h-full px-1 py-2">
                <Divider orientation="vertical" />
              </div>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => {
                  onInputSubmit(inputValue);
                }}
              >
                <Icon variant="round" name="send" />
              </Button>
            </div>
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onInputSubmit(inputValue);
            }
          }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        */}
      </div>
    </FileViewLayout>
  );
}
