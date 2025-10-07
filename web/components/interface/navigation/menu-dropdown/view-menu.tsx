import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMenuActions } from "@/lib/hooks/use-menu-actions";
import { useRegisterMenuAction } from "@/lib/hooks/use-register-menu-action";
import { useContext, useEffect, useState } from "react";
import NavMenuDropdown from "../nav-menu-dropdown";

export default function ViewMenuDropDown() {
  const editorContext = useContext(EditorContext);
  const { menuActions } = useMenuActions("view");

  const [isCommandViewerOpen, setIsCommandViewerOpen] = useState(false);

  useRegisterMenuAction(
    {
      name: "Close Command Viewer",
      menuCategory: "view",
      shortcut: "F1",
      icon: "terminal",
      description: "Close the command viewer",
    },
    async () => {
      console.log("Closing command viewer");
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isCommandViewerOpen: false,
      }));
    },
    [],
    isCommandViewerOpen,
  );

  useRegisterMenuAction(
    {
      name: "View Command Viewer",
      menuCategory: "view",
      shortcut: "F1",
      icon: "terminal",
      description: "View all commands and shortcuts",
    },
    async () => {
      console.log("Opening command viewer");
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isCommandViewerOpen: true,
      }));
    },
    [],
    !isCommandViewerOpen,
  );

  useEffect(() => {
    setIsCommandViewerOpen(
      editorContext?.editorStates.isCommandViewerOpen ?? false,
    );
  }, [editorContext?.editorStates.isCommandViewerOpen]);

  return <NavMenuDropdown category="View" menuActions={menuActions} />;
}
