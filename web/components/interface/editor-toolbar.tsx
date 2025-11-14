"use client";

import Icon from "@/components/misc/icon";
import EditorSettingsModal from "@/components/modals/editor-settings-modal";
import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import usePlatformAIAssistant from "@/lib/hooks/use-platform-ai-assistant";
import useRecorder from "@/lib/hooks/use-recorder";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { Button, Divider, Tooltip } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useContext, useState } from "react";
import AgentConfigModal from "../modals/agent-config-modal";
import MarketplaceModal from "../modals/marketplace-modal";
import { EditorContext } from "../providers/editor-context-provider";

export default function EditorToolbar() {
  const editorContext = useContext(EditorContext);

  const { chatWithAssistant } = usePlatformAIAssistant();
  const { isRecording, record } = useRecorder();
  const { runMenuActionByName } = useMenuActions();
  const { tabItems, tabIndex } = useTabViewManager();

  const [isAgentListModalOpen, setIsAgentListModalOpen] = useState(false);
  const [isAppSettingsModalOpen, setAppIsSettingsModalOpen] = useState(false);

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
        "fixed bottom-0 left-1/2 z-30 flex w-fit -translate-x-1/2 flex-col items-center justify-center space-y-0.5 pb-1"
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

              <Tooltip content={"Run Workflow"}>
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

              <Divider className="mx-1" orientation="vertical" />
              <Tooltip content={"Open Agentic Console"}>
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

              <Tooltip content={"Voice Chat With Agent"}>
                <Button
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    if (!isRecording) {
                      const stream = record();
                      chatWithAssistant(stream, true);
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

              <Tooltip content={"Agent Configuration"}>
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    setIsAgentListModalOpen(true);
                  }}
                >
                  <Icon name="smart_toy" variant="outlined" />
                </Button>
              </Tooltip>
              <AgentConfigModal
                isOpen={isAgentListModalOpen}
                setIsOpen={setIsAgentListModalOpen}
              />

              <Tooltip content={"Marketplace"}>
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    editorContext?.setEditorStates((prev) => ({
                      ...prev,
                      isMarketplaceOpen: true,
                    }));
                  }}
                >
                  <Icon name="storefront" variant="outlined" />
                </Button>
              </Tooltip>
              <MarketplaceModal
                isOpen={editorContext?.editorStates.isMarketplaceOpen || false}
                setIsOpen={(isOpen) =>
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isMarketplaceOpen: isOpen,
                  }))
                }
              />

              {/* <SettingPopover /> */}
              <Tooltip content="Settings">
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => setAppIsSettingsModalOpen(true)}
                >
                  <Icon name="settings" variant="outlined" />
                </Button>
              </Tooltip>
              <EditorSettingsModal
                isOpen={isAppSettingsModalOpen}
                setIsOpen={setAppIsSettingsModalOpen}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editorContext?.editorStates.isToolbarOpen ? (
        <Button
          isIconOnly
          className="bg-content2 h-4 w-10"
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
          className="bg-content2 h-4 w-10"
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
