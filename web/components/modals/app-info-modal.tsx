import { useContext } from "react";
import ModalWrapper from "./modal-wrapper";
import { EditorContext } from "../providers/editor-context-provider";
import { Divider } from "@heroui/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AppInfoModal() {
  const editorContext = useContext(EditorContext);

  const appInfo = editorContext?.editorStates.appInfoModalContent;

  return (
    <ModalWrapper
      isOpen={editorContext?.editorStates.isAppInfoModalOpen ?? false}
      setIsOpen={(open: boolean) => {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isAppInfoModalOpen: open,
        }));
      }}
      title={"App Information"}
    >
      <div className="flex w-full flex-col">
        <p className="text-xl font-semibold">{appInfo?.name}</p>
        <p>{appInfo?.version}</p>
        {appInfo?.author && (
          <p>
            <span className="font-semibold">Author</span>: {appInfo?.author}
          </p>
        )}
        {appInfo?.license && (
          <p>
            <span className="font-semibold">License</span>: {appInfo?.license}
          </p>
        )}
        {appInfo?.url && (
          <p>
            <span className="font-semibold">Website</span>:{" "}
            <a href={appInfo.url} className="underline">
              {appInfo.url}
            </a>
          </p>
        )}
        <Divider />
        {appInfo?.readme && (
          <div>
            <p>
              <span className="font-semibold">README</span>:
            </p>
            <div className="markdown-styles">
              <Markdown remarkPlugins={[remarkGfm]}>{appInfo?.readme}</Markdown>
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
