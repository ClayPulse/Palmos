import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkAlert from "remark-github-blockquote-alert";
import "remark-github-blockquote-alert/alert.css";

export default function MarkdownRender({ content }: { content: string }) {
  return (
    <div className="markdown-styles">
      <Markdown
        remarkPlugins={[remarkGfm, remarkAlert]}
        rehypePlugins={[rehypeRaw, () => rehypeSanitize(customSchema)]}
        remarkRehypeOptions={{}}
      >
        {content}
      </Markdown>
    </div>
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
