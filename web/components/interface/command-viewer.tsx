import useCommands from "@/lib/hooks/use-commands";
import { Command } from "@/lib/types";
import {
  addToast,
  Button,
  Input,
  Kbd,
  Listbox,
  ListboxItem,
  Spinner,
} from "@heroui/react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import Icon from "../misc/icon";
import usePlatformAIAssistant from "@/lib/hooks/use-platform-ai-assistant";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const inputPlaceholders = [
  "Type anything...",
  "Search commands...",
  "Looking for something?",
  "Need help? Type here...",
  "Got a creative idea? Type it out...",
];

export default function CommandViewer() {
  const editorContext = useContext(EditorContext);

  const { chatWithAssistant, history } = usePlatformAIAssistant();
  const { commands, runCommand, setKeywordFilter } = useCommands();

  const [inputPlaceholder, setInputPlaceholder] = useState("");
  const [selectCommandIndex, setSelectCommandIndex] = useState(-1);
  const [inputTextValue, setInputTextValue] = useState("");
  const [inputAudioValue, setInputAudioValue] = useState<
    ReadableStream<ArrayBuffer> | undefined
  >(undefined);
  const [isInputVoice, setIsInputVoice] = useState(false);
  const [isOutputVoice, setIsOutputVoice] = useState(false);
  const [isWaitingAssistant, setIsWaitingAssistant] = useState(false);

  const historyRef = useRef<HTMLDivElement>(null);

  const runCommandCallback = useCallback(
    async (command: Command) => {
      const result = await runCommand(command, {});
      console.log("Command result:", result);
      addToast({
        color: "success",
        title: "Command Executed",
        description: `Executed command: ${command.commandInfo.name}`,
      });
    },
    [runCommand],
  );

  useEffect(() => {
    // Choose a random label from the list every 3 seconds
    const interval = setInterval(() => {
      const randomLabel =
        inputPlaceholders[Math.floor(Math.random() * inputPlaceholders.length)];
      setInputPlaceholder(randomLabel);
    }, 3000);

    // Set an initial label
    setInputPlaceholder(
      inputPlaceholders[Math.floor(Math.random() * inputPlaceholders.length)],
    );

    return () => {
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (inputTextValue !== "") {
      // Assume commands are ordered by relevance.
      // Filter commands based on the input value
      setKeywordFilter(inputTextValue);
      // Choose the first command suggestion.
      setSelectCommandIndex(0);
    } else {
      setKeywordFilter(undefined);
    }
  }, [inputTextValue]);

  useEffect(() => {
    handlePressedKeys(editorContext?.editorStates.pressedKeys ?? []);
  }, [editorContext?.editorStates.pressedKeys]);

  // Scroll to bottom when history changes
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  // Update loading state when history changes
  useEffect(() => {
    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      if (lastEntry.role === "assistant") {
        setIsWaitingAssistant(false);
      }
    }
  }, [history]);

  function handleKeyDown(e: KeyboardEvent) {
    // Prevent default behavior for certain keys
    const key = e.key;

    if (editorContext?.editorStates.pressedKeys.includes(key)) {
      return;
    }

    const keysToPrevent = [
      "Enter",
      "Escape",
      "F1",
      "Control",
      "Meta",
      "Alt",
      "Shift",
    ];
    if (keysToPrevent.includes(key)) {
      e.preventDefault();
      // @ts-expect-error continuePropagation is not in the type definition
      e.continuePropagation();
    }

    const keys = [...(editorContext?.editorStates.pressedKeys ?? []), key];
    editorContext?.setEditorStates((prev) => {
      // Prevent duplicate keys
      if (!prev.pressedKeys.includes(key)) {
        return {
          ...prev,
          pressedKeys: keys,
        };
      }
      return prev;
    });
  }

  function handleKeyUp(e: KeyboardEvent) {
    const key = e.key;

    const keysToPrevent = [
      "Enter",
      "Escape",
      "F1",
      "Control",
      "Meta",
      "Alt",
      "Shift",
    ];
    if (keysToPrevent.includes(key)) {
      e.preventDefault();
      // @ts-expect-error continuePropagation is not in the type definition
      e.continuePropagation();
    }

    const keys =
      editorContext?.editorStates.pressedKeys.filter((k) => k !== key) ?? [];

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      pressedKeys: keys,
    }));
  }

  function handlePressedKeys(pressedKeys: string[]) {
    // Run the selected command on enter key press
    const isEnterPressed = pressedKeys.includes("Enter");
    const isArrowUpPressed = pressedKeys.includes("ArrowUp");
    const isArrowDownPressed = pressedKeys.includes("ArrowDown");
    const isControlPressed = pressedKeys.includes("Control");
    if (isEnterPressed && isControlPressed && selectCommandIndex !== -1) {
      // Run command if ctrl is pressed
      console.log("Running command");
      runCommandCallback(commands[selectCommandIndex]);
    } else if (isEnterPressed && !isControlPressed) {
      // Chat with assistant if ctrl is not pressed
      console.log("Chatting with assistant");
      if (isInputVoice) {
        chatWithAssistant(inputAudioValue, isOutputVoice).then(() => {
          setIsWaitingAssistant(true);
        });
      } else {
        chatWithAssistant(inputTextValue, isOutputVoice).then(() => {
          setIsWaitingAssistant(true);
        });
      }
    } else if (isArrowUpPressed) {
      setSelectCommandIndex((prev) =>
        prev === 0 ? commands.length - 1 : prev - 1,
      );
    } else if (isArrowDownPressed) {
      setSelectCommandIndex((prev) =>
        prev === commands.length - 1 ? 0 : prev + 1,
      );
    }
  }

  return (
    <div className="absolute top-20 left-1/2 z-50 -translate-x-1/2">
      <div className="flex w-80 flex-col gap-y-1">
        <Input
          classNames={{
            inputWrapper:
              "rounded-2xl shadow-md h-12 min-h-0 group-data-[focus-visible=true]:ring-0 group-data-[focus-visible=true]:ring-offset-0",
            innerWrapper: "p-0",
          }}
          label="Command Center"
          placeholder={inputPlaceholder}
          value={inputTextValue}
          onValueChange={setInputTextValue}
          autoFocus
          endContent={
            <div className="flex h-full items-center justify-center">
              {!inputTextValue && (
                <div className="flex h-full items-center justify-center">
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={() => {
                      setIsInputVoice((prev) => !prev);
                    }}
                    size="sm"
                  >
                    {isInputVoice ? (
                      <Icon name="mic" className="text-primary" />
                    ) : (
                      <Icon name="mic_off" variant="outlined" />
                    )}
                  </Button>
                </div>
              )}
              <Button
                isIconOnly
                variant="light"
                onPress={() => {
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isCommandViewerOpen: false,
                  }));
                }}
                size="sm"
              >
                <Icon name="close" />
              </Button>
            </div>
          }
          onKeyDown={(e) => handleKeyDown(e as any)}
          onKeyUp={(e) => handleKeyUp(e as any)}
        />

        {history.length > 0 && (
          <div
            ref={historyRef}
            className="bg-content1 flex max-h-60 flex-col gap-y-1 overflow-y-auto rounded-2xl p-2 shadow-md"
          >
            {history.map((entry, index) => (
              <div key={index}>
                {entry.message.content.text &&
                  (entry.role === "user" ? (
                    <div className="text-primary-foreground bg-primary rounded-lg p-2 text-sm">
                      <div className="font-bold">You: </div>
                      {entry.message.content.text}
                    </div>
                  ) : (
                    <div className="text-default-foreground bg-default rounded-lg p-2 text-sm">
                      <p className="font-bold">Assistant:</p>
                      <div className="markdown-styles -my-4">
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {entry.message.content.text}
                        </Markdown>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
            {isWaitingAssistant && <Spinner />}
          </div>
        )}
        <div className="bg-content1 rounded-2xl shadow-md">
          <div className="px-3 pt-2">
            <p className="text-sm font-bold whitespace-nowrap">
              Found {commands.length} commands
            </p>
          </div>
          <Listbox
            selectionMode="single"
            selectedKeys={
              selectCommandIndex === -1 ? [] : [selectCommandIndex.toString()]
            }
            onSelectionChange={(selection) => {
              const key = selection as any;
              const index = key.currentKey
                ? parseInt(key.currentKey as string)
                : selectCommandIndex;

              setSelectCommandIndex(index);
              runCommandCallback(commands[index]);
            }}
            label="Command Suggestions"
          >
            {commands.map((command, index) => (
              <ListboxItem
                key={index.toString()}
                className="data-[is-selected=true]:bg-primary/20"
                data-is-selected={selectCommandIndex === index}
                endContent={
                  selectCommandIndex === index && (
                    <div className="absolute right-7">
                      <Kbd>Ctrl + Enter</Kbd>
                    </div>
                  )
                }
              >
                {command.commandInfo.name}
              </ListboxItem>
            ))}
          </Listbox>
        </div>
      </div>
    </div>
  );
}
