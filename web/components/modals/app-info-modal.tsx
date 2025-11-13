import { Divider } from "@heroui/react";
import { useContext } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkAlert from "remark-github-blockquote-alert";
import "remark-github-blockquote-alert/alert.css";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./modal-wrapper";

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
        <p className="text-center text-xl font-semibold">{appInfo?.name}</p>
        <p>
          <span className="font-semibold">Version</span>: {appInfo?.version}
        </p>
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
              <Markdown
                remarkPlugins={[remarkGfm, remarkAlert]}
                rehypePlugins={[rehypeRaw, () => rehypeSanitize(customSchema)]}
                remarkRehypeOptions={{}}
              >
                {appInfo?.readme}
              </Markdown>
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}

const customSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "div",
    "blockquote",
    "svg",
    "path",
    "img",
  ],
  attributes: {
    ...defaultSchema.attributes,
    div: ["className", "dir", "align"],
    blockquote: ["className", "dir"],
    svg: ["className", "viewBox", "width", "height", "aria-hidden"],
    p: ["className"],
    path: ["d"],
    img: ["src", "alt"],
  },
};
