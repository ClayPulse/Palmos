import { Button, Input, ModalBody, ModalFooter } from "@heroui/react";
import { useContext, useState } from "react";
import toast from "react-hot-toast";
import { encrypt } from "@/lib/security/simple-password";
import Icon from "../misc/icon";
import ModalWrapper from "./modal-wrapper";
import { EditorContext } from "../providers/editor-context-provider";
import { getAPIKey, setAPIKey } from "@/lib/settings/settings";

export default function PasswordScreen({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const editorContext = useContext(EditorContext);
  const [password, setPassword] = useState<string | undefined>(undefined);

  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={
        editorContext?.persistSettings?.isPasswordSet
          ? "Enter your password"
          : "Set a password"
      }
    >
      <>
        <ModalBody>
          <Input
            endContent={<Icon name="lock" />}
            label="Password"
            placeholder="Enter your password"
            type="password"
            variant="bordered"
            value={password ?? ""}
            onChange={(e) => setPassword(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            color="danger"
            onPress={() => {
              setIsOpen(false);
              // Reset all settings
              editorContext?.setPersistSettings(undefined);
              // Remove password from memory
              editorContext?.setEditorStates((prev) => {
                return {
                  ...prev,
                  password: undefined,
                };
              });
            }}
            variant="light"
            disableRipple
            disableAnimation
          >
            Reset Config
          </Button>
          <Button
            color="primary"
            onPress={() => {
              if (!password) {
                toast.error("Please enter password");
                return;
              }

              setIsOpen(false);
              if (!editorContext?.persistSettings?.isPasswordSet) {
                // Set password if not already set
                const settings = editorContext?.persistSettings ?? {};
                editorContext?.setPersistSettings((prev) => {
                  return {
                    ...prev,
                    isPasswordSet: true,
                    passwordInMem: password,
                  };
                });

                const sttAPIKey = getAPIKey(
                  editorContext,
                  settings.sttProvider,
                );
                const llmAPIKey = getAPIKey(
                  editorContext,
                  settings.llmProvider,
                );
                const ttsAPIKey = getAPIKey(
                  editorContext,
                  settings.ttsProvider,
                );

                // Encrypt API tokens
                const encryptedSTTAPIKey = sttAPIKey
                  ? encrypt(sttAPIKey, password)
                  : undefined;
                const encryptedLLMAPIKey = llmAPIKey
                  ? encrypt(llmAPIKey, password)
                  : undefined;
                const encryptedTTSAPIKey = ttsAPIKey
                  ? encrypt(ttsAPIKey, password)
                  : undefined;

                // Save to local storage
                setAPIKey(
                  editorContext,
                  settings.sttProvider,
                  encryptedSTTAPIKey ?? "",
                );
                setAPIKey(
                  editorContext,
                  settings.llmProvider,
                  encryptedLLMAPIKey ?? "",
                );
                setAPIKey(
                  editorContext,
                  settings.ttsProvider,
                  encryptedTTSAPIKey ?? "",
                );
              } else {
                // Set the password in memory
                editorContext.setEditorStates((prev) => {
                  return {
                    ...prev,
                    password: password,
                  };
                });
              }
            }}
          >
            Confirm
          </Button>
        </ModalFooter>
      </>
    </ModalWrapper>
  );
}
