import { useEffect, useState } from "react";

export const editorAssistantInputHints = [
  "Type anything...",
  "Create a new website...",
  "Create a blog post...",
  "Find a productivity workflow...",
  "Search commands...",
  "Looking for something?",
  "Need help? Type here...",
  "Got a creative idea? Type it out...",
];

export function useEditorAIAssistantHint() {
  const [hint, setHint] = useState("");

  useEffect(() => {
    // Choose a random label from the list every 3 seconds
    const interval = setInterval(() => {
      const randomLabel =
        editorAssistantInputHints[
          Math.floor(Math.random() * editorAssistantInputHints.length)
        ];
      setHint(randomLabel);
    }, 3000);

    // Set an initial label
    setHint(
      editorAssistantInputHints[
        Math.floor(Math.random() * editorAssistantInputHints.length)
      ],
    );

    return () => {
      clearInterval(interval);
    };
  }, []);

  return { hint };
}
