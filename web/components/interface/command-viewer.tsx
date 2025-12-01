import useActionExecutor from "@/lib/hooks/use-action-executor";
import usePlatformAIAssistant from "@/lib/hooks/use-platform-ai-assistant";
import useRecorder from "@/lib/hooks/use-recorder";
import { ScopedAction } from "@/lib/types";
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
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Icon from "../misc/icon";
import { EditorContext } from "../providers/editor-context-provider";

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
  const { actions, runScopedAction, setKeywordFilter } = useActionExecutor();
  const { recordVAD, stopRecording, isRecording } = useRecorder();

  const [inputPlaceholder, setInputPlaceholder] = useState("");
  const [selectActionIndex, setSelectActionIndex] = useState(-1);
  const [inputTextValue, setInputTextValue] = useState("");
  // const [isInputVoice, setIsInputVoice] = useState(false);
  const [isOutputVoice, setIsOutputVoice] = useState(false);
  const [isWaitingAssistant, setIsWaitingAssistant] = useState(false);

  const [isArgsInputOpen, setIsArgsInputOpen] = useState(false);
  const [args, setArgs] = useState<any>({});
  const [actionReadyToRun, setActionReadyToRun] = useState<boolean>(false);

  const historyRef = useRef<HTMLDivElement>(null);
  const isRunningCommandRef = useRef(false);

  const runActionCallback = useCallback(
    async (action: ScopedAction) => {
      try {
        const result = await runScopedAction(action, args);

        console.log("Command result:", result);
        addToast({
          color: "success",
          title: "Command Executed",
          description: `Executed command: ${action.action.name}`,
        });
      } catch (error: any) {
        addToast({
          color: "danger",
          title: "Command Execution Failed",
          description: `Failed to execute command: ${action.action.name}. Error: ${error.message}`,
        });
        console.error("Failed to run action:", error);
      }
    },
    [runScopedAction, args],
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
      setSelectActionIndex(0);
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

  // Reset input if selected index changes
  useEffect(() => {
    setArgs({});
    setIsArgsInputOpen(false);
  }, [selectActionIndex]);

  // Check action validity
  useEffect(() => {
    async function checkAndRunAction() {
      if (!actionReadyToRun) {
        return;
      }

      console.log("Action ready to run:", actionReadyToRun);

      const queuedAction = actions[selectActionIndex];

      if (queuedAction) {
        const isValid = validateActionArgs(queuedAction, args);
        if (isValid) {
          // Run action directly if args are valid

          if (isRunningCommandRef.current) {
            return;
          }
          isRunningCommandRef.current = true;
          await runActionCallback(queuedAction);
          isRunningCommandRef.current = false;
        } else {
          // Otherwise, open args input and wait for user
          // to fill in required args.
          setIsArgsInputOpen(true);
        }
      }

      // Reset ready state if this pass ran or did not run.
      setActionReadyToRun(false);
    }

    checkAndRunAction();
  }, [actionReadyToRun, runActionCallback]);

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
      if (e.continuePropagation) e.continuePropagation();
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
      if (e.continuePropagation) e.continuePropagation();
    }

    const keys =
      editorContext?.editorStates.pressedKeys.filter((k) => k !== key) ?? [];

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      pressedKeys: keys,
    }));
  }

  async function handlePressedKeys(pressedKeys: string[]) {
    // Run the selected command on enter key press
    const isEnterPressed = pressedKeys.includes("Enter");
    const isArrowUpPressed = pressedKeys.includes("ArrowUp");
    const isArrowDownPressed = pressedKeys.includes("ArrowDown");
    const isControlPressed = pressedKeys.includes("Control");
    if (isEnterPressed && isControlPressed && selectActionIndex !== -1) {
      // Run command if ctrl is pressed
      console.log("Running command");
      setActionReadyToRun(true);
    } else if (isEnterPressed && !isControlPressed) {
      // Chat with assistant if ctrl is not pressed
      console.log("Chatting with assistant");

      if (inputTextValue === "") {
        if (selectActionIndex !== -1) {
          addToast({
            color: "warning",
            title: "Chat input is empty",
            description: `Did you mean to run the command: ${actions[selectActionIndex].action.name}? Use Ctrl + Enter to run the selected command.`,
          });
        } else {
          addToast({
            color: "warning",
            title: "Chat input is empty",
            description: "Please enter a message or use voice input.",
          });
        }
        return;
      }
      await chatWithAssistant(
        {
          content: {
            text: inputTextValue,
          },
          attachments: [],
        },
        isOutputVoice,
      );
      setIsWaitingAssistant(true);
    } else if (isArrowUpPressed) {
      setSelectActionIndex((prev) =>
        prev === 0 ? actions.length - 1 : prev - 1,
      );
    } else if (isArrowDownPressed) {
      setSelectActionIndex((prev) =>
        prev === actions.length - 1 ? 0 : prev + 1,
      );
    }
  }

  function validateActionArgs(action: ScopedAction, args: any) {
    const paramsEntries = Object.entries(action.action.parameters);

    // Check if all required arguments are provided
    if (paramsEntries.length > 0) {
      const missingParams = paramsEntries.filter(
        ([key, value]) =>
          !action.action.parameters[key].optional && args[key] === undefined,
      );
      if (missingParams.length > 0) {
        return false;
      }
      return true;
    }

    return true;
  }

  return (
    <div className="absolute top-20 left-1/2 z-50 -translate-x-1/2">
      <div className="flex max-h-[calc(100vh-140px)] flex-col items-center gap-y-1">
        <Input
          className="w-80"
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
                      async function recordInput() {
                        const audio = await recordVAD();
                        console.log("Recorded audio input:", audio);

                        // Send audio to backend
                        await chatWithAssistant(
                          {
                            content: {
                              audio: audio,
                            },
                            attachments: [],
                          },
                          false,
                        );
                      }

                      if (!isRecording) {
                        recordInput();
                      } else {
                        stopRecording();
                      }
                    }}
                    size="sm"
                  >
                    {isRecording ? (
                      <Icon name="mic" className="text-primary" />
                    ) : (
                      <Icon name="mic_off" variant="outlined" />
                    )}
                  </Button>
                </div>
              )}
              {inputTextValue && (
                <Kbd>
                  <div className="flex items-center gap-1">
                    <Icon name="auto_awesome" />
                    Enter
                  </div>
                </Kbd>
              )}
              <Button
                isIconOnly
                variant="light"
                onPress={() => {
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isCommandViewerOpen: false,
                  }));
                  stopRecording();
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
          <div className="bg-content1 flex w-full flex-col overflow-y-hidden rounded-2xl px-2 pt-2 shadow-md sm:w-[480px]">
            <div
              className="flex flex-col gap-y-2 overflow-y-auto pb-2"
              ref={historyRef}
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
              {isWaitingAssistant && (
                <div className="flex h-8 w-full justify-center">
                  <Spinner />
                </div>
              )}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="bg-content1 w-80 rounded-2xl shadow-md">
            <div className="px-3 pt-2">
              <p className="text-sm font-bold whitespace-nowrap">
                Found {actions.length} commands
              </p>
            </div>
            <Listbox
              selectionMode="single"
              selectedKeys={
                selectActionIndex === -1 ? [] : [selectActionIndex.toString()]
              }
              label="Command Suggestions"
              shouldSelectOnPressUp
            >
              {actions.map((command, index) => (
                <ListboxItem
                  key={index.toString()}
                  className="data-[is-selected=true]:bg-primary/20"
                  data-is-selected={selectActionIndex === index}
                  endContent={
                    selectActionIndex === index && (
                      <div className="absolute right-7">
                        <Kbd>Ctrl + Enter</Kbd>
                      </div>
                    )
                  }
                  onPress={(e) => {
                    // Prevent triggering when pressing Enter to run command.
                    if (e.pointerType === "keyboard") {
                      return;
                    }

                    setSelectActionIndex(index);
                    setActionReadyToRun(true);
                  }}
                  onKeyDown={(e) => handleKeyDown(e as any)}
                  onKeyUp={(e) => handleKeyUp(e as any)}
                >
                  {command.action.name}
                </ListboxItem>
              ))}
            </Listbox>
          </div>
        )}
        {isArgsInputOpen && actions[selectActionIndex] && (
          <div className="bg-content1 w-80 rounded-2xl p-4 shadow-md">
            <p className="mb-2 font-bold">Command Action Arguments</p>
            {Object.entries(actions[selectActionIndex].action.parameters)
              .filter(([_, param]) => param.type !== "app-instance")
              .map(([paramName, param], index) => (
                <div key={paramName} className="mb-2">
                  <Input
                    className="w-full"
                    value={args[paramName] || ""}
                    onValueChange={(value) =>
                      setArgs((prev: any) => ({
                        ...prev,
                        [paramName]: value,
                      }))
                    }
                    placeholder={param.description || ""}
                    label={`${paramName}${param.optional ? " (optional)" : ""}`}
                    autoFocus={index === 0}
                    isRequired={!param.optional}
                    size="sm"
                  />
                </div>
              ))}
            <Button
              className="w-full"
              onPress={() => {
                setIsArgsInputOpen(false);
                setActionReadyToRun(true);
              }}
              isDisabled={!validateActionArgs(actions[selectActionIndex], args)}
              color="primary"
            >
              Run Command
              <Kbd>Ctrl + Enter</Kbd>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
