"use client";

import Icon from "@/components/misc/icon";
import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import useEditorAIAssistant from "@/lib/hooks/use-editor-ai-assistant";
import useRecorder from "@/lib/hooks/use-recorder";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  addToast,
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useContext } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";

export default function EditorToolbar() {
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);

  const { chatWithAssistant } = useEditorAIAssistant();
  const { isRecording, recordVAD, stopRecording } = useRecorder();
  const { runMenuActionByName } = useMenuActions();
  const { tabItems, tabIndex } = useTabViewManager();

  function setIsOpen(val: boolean) {
    if (editorContext) {
      editorContext.setEditorStates((prev) => ({
        ...prev,
        isToolbarOpen: val,
      }));
    }
  }

  return (
    <div
      className={
        "fixed bottom-0 left-1/2 z-30 flex w-fit -translate-x-1/2 flex-col items-center justify-center space-y-0.5 pb-[max(env(safe-area-inset-bottom),0.25rem)]"
      }
    >
      <AnimatePresence>
        {editorContext?.editorStates.isToolbarOpen && (
          <motion.div
            initial={{
              y: 60,
            }}
            animate={{
              y: 0,
            }}
            exit={{
              y: 80,
            }}
          >
            <div className="bg-content2 relative flex h-10 w-fit items-center rounded-full px-2 py-1 shadow-md">
              {/* <Tooltip content={"Pen Tool"}>
                <Button
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    if (editorContext?.editorStates) {
                      editorContext?.setEditorStates((prev) => ({
                        ...prev,
                        isDrawing: !editorContext?.editorStates.isDrawing,
                      }));
                    }
                  }}
                  variant={
                    editorContext?.editorStates?.isDrawing ? "solid" : "light"
                  }
                >
                  <Icon name="edit" variant="round" />
                </Button>
              </Tooltip>
              <Tooltip content={"Inline Chat Tool"}>
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                >
                  <Icon name="comment" variant="outlined" />
                </Button>
              </Tooltip> */}

              {(editorContext?.editorStates.selectedViewIds?.length ?? 0) >
              0 ? (
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      variant="light"
                      isIconOnly
                      className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                    >
                      <Icon name="playlist_play" variant="round" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Run options">
                    <DropdownItem
                      key="run-workflow"
                      onPress={() => {
                        runMenuActionByName(
                          `Run Workflow (${tabItems[tabIndex]?.name})`,
                          "view",
                        );
                      }}
                      shortcut="Ctrl+Alt+R"
                      description={t("viewMenu.runWorkflow.description")}
                      startContent={
                        <div className="w-6">
                          <Icon name="play_arrow" variant="round" />
                        </div>
                      }
                    >
                      {t("editorToolbar.runWorkflow.tooltip")}
                    </DropdownItem>
                    <DropdownItem
                      key="run-from-selected"
                      onPress={() => {
                        runMenuActionByName(
                          `Run From Selected Node (${tabItems[tabIndex]?.name})`,
                          "view",
                        );
                      }}
                      shortcut="Ctrl+Alt+Shift+R"
                      description={t(
                        "viewMenu.runFromSelectedNode.description",
                      )}
                      startContent={
                        <div className="w-6">
                          <Icon name="skip_next" variant="round" />
                        </div>
                      }
                    >
                      {t("editorToolbar.runFromSelectedNode.tooltip")}
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              ) : (
                <Tooltip content={t("editorToolbar.runWorkflow.tooltip")}>
                  <Button
                    variant="light"
                    isIconOnly
                    className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                    onPress={() => {
                      runMenuActionByName(
                        `Run Workflow (${tabItems[tabIndex].name})`,
                        "view",
                      );
                    }}
                  >
                    <Icon name="play_arrow" variant="round" />
                  </Button>
                </Tooltip>
              )}

              <Divider className="mx-1" orientation="vertical" />
              <Tooltip content={t("editorToolbar.openConsole.tooltip")}>
                <Button
                  variant={
                    editorContext?.editorStates?.isConsolePanelOpen
                      ? "solid"
                      : "light"
                  }
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    if (editorContext?.editorStates) {
                      editorContext?.setEditorStates((prev) => ({
                        ...prev,
                        isConsolePanelOpen:
                          !editorContext?.editorStates.isConsolePanelOpen,
                      }));
                    }
                  }}
                >
                  <Icon name="terminal" variant="outlined" />
                </Button>
              </Tooltip>

              <Tooltip content="Chat with AI Assistant">
                <Button
                  variant={
                    editorContext?.editorStates?.isChatPanelOpen
                      ? "solid"
                      : "light"
                  }
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    if (editorContext?.editorStates) {
                      editorContext?.setEditorStates((prev) => ({
                        ...prev,
                        isChatPanelOpen:
                          !editorContext?.editorStates.isChatPanelOpen,
                      }));
                    }
                  }}
                >
                  <Icon name="auto_awesome" variant="outlined" />
                </Button>
              </Tooltip>

              <Tooltip content={t("editorToolbar.voiceChat.tooltip")}>
                <Button
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={async () => {
                    if (!isRecording) {
                      const buffer = await recordVAD();
                      await chatWithAssistant(
                        {
                          content: {
                            audio: buffer,
                          },
                          attachments: [],
                        },
                        true,
                      );
                    } else {
                      stopRecording();
                    }
                  }}
                  variant={
                    editorContext?.editorStates?.isRecording ? "solid" : "light"
                  }
                >
                  <Icon name="mic" variant="outlined" />
                </Button>
              </Tooltip>

              <Divider className="mx-1" orientation="vertical" />

              <Tooltip content={t("editorToolbar.artifacts.tooltip")}>
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    addToast({
                      title: "Opening Artifacts Panel (WIP)",
                    });
                  }}
                >
                  <Icon name="layers" variant="outlined" />
                </Button>
              </Tooltip>

              <Tooltip content={"Marketplace"}>
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    editorContext?.updateModalStates({
                      marketplace: { isOpen: true },
                    });
                  }}
                >
                  <Icon name="storefront" variant="outlined" />
                </Button>
              </Tooltip>

              {/* <SettingPopover /> */}
              <Tooltip content="Settings">
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() =>
                    editorContext?.updateModalStates({
                      editorSettings: { isOpen: true },
                    })
                  }
                >
                  <Icon name="settings" variant="outlined" />
                </Button>
              </Tooltip>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editorContext?.editorStates.isToolbarOpen ? (
        <Button
          isIconOnly
          className="bg-content2 h-5 w-12"
          onPress={() => {
            setIsOpen(false);
          }}
        >
          <Icon
            name="keyboard_arrow_down"
            className="text-content2-foreground"
          />
        </Button>
      ) : (
        <Button
          isIconOnly
          className="bg-content2 h-5 w-12"
          onPress={() => {
            setIsOpen(true);
          }}
        >
          <Icon name="keyboard_arrow_up" className="text-content2-foreground" />
        </Button>
      )}
    </div>
  );
}
