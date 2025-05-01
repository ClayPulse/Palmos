import { useContext } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import { AnimatePresence, motion } from "framer-motion";
import AgenticConsolePanel from "./agentic-console-panel";
import { useViewManager } from "@/lib/hooks/use-view-manager";
import FileViewLoader from "./loaders/file-view-loader";

export default function ViewDisplayArea() {
  const editorContext = useContext(EditorContext);
  const { updateFileView, activeFileView } = useViewManager();

  // #region VSCode Extension
  // // Initialize view manager
  // useEffect(() => {
  //   if (!editorContext?.viewManager) {
  //     // If running in VSCode extension, notify VSCode that Pulse is ready,
  //     // and create view manager later when VSCode sends a message.
  //     if (getPlatform() === PlatformEnum.VSCode) {
  //       notifyVSCode();
  //       addVSCodeHandlers();
  //     } else {
  //       const viewManager = new ViewManager();
  //       editorContext?.setViewManager(viewManager);
  //     }
  //   }
  // }, []);

  // useEffect(() => {
  //   if (editorContext?.viewManager) {
  //     const activeFileView = editorContext.viewManager.getactiveFileView();
  //     console.log("Active view:", activeFileView?.viewDocument.filePath);
  //     setactiveFileView(activeFileView);
  //   }
  // }, [editorContext?.viewManager]);

  // function notifyVSCode() {
  //   window.parent.postMessage(
  //     {
  //       command: "pulseReady",
  //       from: "pulse",
  //     },
  //     "*",
  //   );
  // }

  // function addVSCodeHandlers() {
  //   // Listen for ctrl+alt+s to switch back to VSCode original editor
  //   window.addEventListener("keydown", (e) => {
  //     if (e.ctrlKey && e.altKey && e.code === "KeyS") {
  //       // Send a message to parent iframe
  //       window.parent.postMessage(
  //         { command: "switchToTextEditor", from: "pulse" },
  //         "*",
  //       );
  //     }
  //   });

  //   // Add a listener to listen messages from VSCode Extension
  //   window.addEventListener("message", (e) => {
  //     const message = e.data;
  //     if (message.command === "updatePulseText") {
  //       const text: string = message.text;
  //       console.log("Received text from VSCode:", text);
  //       if (activeFileView) {
  //         const updatedFileView: FileViewModel = {
  //           fileContent: text,
  //           filePath: activeFileView.filePath,
  //           isActive: true,
  //         };
  //         updateFileView(updatedFileView);
  //       }
  //     } else if (message.command === "openFile") {
  //       const text: string = message.text;
  //       const path: string = message.path;
  //       console.log(
  //         "Received file from VSCode. Path: " + path + " Text: " + text,
  //       );

  //       const file = new File([text], path);
  //       openFileView(file);

  //       // Send a message to vscode parent iframe to notify changes made in Pulse
  //       // const callback = (viewDocument: FileViewModel) => {
  //       //   if (!viewDocument) {
  //       //     return;
  //       //   }
  //       //   window.parent.postMessage(
  //       //     {
  //       //       command: "updateVSCodeText",
  //       //       text: viewDocument.fileContent,
  //       //       from: "pulse",
  //       //     },
  //       //     "*",
  //       //   );
  //       // };
  //       // TODO: need to find a new way to set callback with modular view extension
  //       // SOLUTION: listen to File Change event from file-view and send message to VSCode
  //       // newView.setViewDocumentChangeCallback(callback);
  //     }
  //   });
  // }
  // #endregion

  return (
    <div className="flex h-full w-full flex-col p-1">
      <div className="flex h-full w-full flex-col items-start justify-between gap-1.5 overflow-hidden rounded-xl bg-default p-2">
        <div className={`min-h-0 w-full grow`}>
          {!activeFileView ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-y-1 pb-12 text-default-foreground">
              <h1 className="text-center text-2xl font-bold">
                Welcome to Pulse Editor!
              </h1>
              <p className="text-center text-lg font-normal">
                Start by opening a file or project.
              </p>
            </div>
          ) : (
            <>
              <FileViewLoader
                model={activeFileView}
                updateFileView={updateFileView}
              />
            </>
          )}
        </div>

        <AnimatePresence>
          {editorContext?.editorStates?.isChatViewOpen && (
            <motion.div
              className="h-[60%] w-full shrink-0"
              // Enter from bottom and exit to bottom
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              style={{
                paddingBottom: editorContext.editorStates.isToolbarOpen
                  ? "52px"
                  : "0px",
              }}
            >
              <AgenticConsolePanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
