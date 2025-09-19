import useCommands from "@/lib/hooks/use-commands";
import { Command } from "@/lib/types";
import { addToast, Button, Input, Listbox, ListboxItem } from "@heroui/react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import Icon from "../misc/icon";

const inputPlaceholders = [
  "Type anything...",
  "Search commands...",
  "Looking for something?",
  "Need help? Type here...",
  "Got a creative idea? Type it out...",
];

export default function CommandViewer() {
  const editorContext = useContext(EditorContext);

  const { commands, runCommand, setKeywordFilter } = useCommands();

  const [inputPlaceholder, setInputPlaceholder] = useState("");

  const [selectCommandIndex, setSelectCommandIndex] = useState(-1);

  const [inputValue, setInputValue] = useState("");

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

    // Listen to keyboard events for up/down arrow keys
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        setSelectCommandIndex((prev) =>
          prev === 0 ? commands.length - 1 : prev - 1,
        );
      } else if (event.key === "ArrowDown") {
        setSelectCommandIndex((prev) =>
          prev === commands.length - 1 ? 0 : prev + 1,
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    // Run the selected command on enter key press
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && selectCommandIndex !== -1) {
        runCommandCallback(commands[selectCommandIndex]);
      } else if (event.key === "Escape" || event.key === "F1") {
        event.preventDefault();
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isCommandViewerOpen: false,
        }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectCommandIndex, commands]);

  useEffect(() => {
    if (inputValue !== "") {
      // Assume commands are ordered by relevance.
      // Filter commands based on the input value
      setKeywordFilter(inputValue);
      // Choose the first command suggestion.
      setSelectCommandIndex(0);
    } else {
      setKeywordFilter(undefined);
    }
  }, [inputValue]);

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
          value={inputValue}
          onValueChange={setInputValue}
          autoFocus
          endContent={
            <div className="flex h-full items-center justify-center">
              <Button
                isIconOnly
                variant="light"
                onPress={() => {
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isCommandViewerOpen: false,
                  }));
                }}
              >
                <Icon name="close" />
              </Button>
            </div>
          }
        />
        <div className="bg-content1 rounded-2xl shadow-md">
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
