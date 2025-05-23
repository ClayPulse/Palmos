import AgenticConsolePanel from "./agentic-console-panel";
import { useViewManager } from "@/lib/hooks/use-view-manager";
import ExtensionViewLayout from "./layout";
import ViewLoader from "./loaders/view-loader";

export default function ViewDisplayArea() {
  const { updateViewModel, activeViewModel } = useViewManager();

  return (
    <div className="flex h-full w-full flex-col p-1">
      <div className="bg-default flex h-full w-full flex-col items-start justify-between gap-1.5 overflow-hidden rounded-xl p-2">
        <div className={`min-h-0 w-full grow`}>
          {!activeViewModel ? (
            <div className="text-default-foreground flex h-full w-full flex-col items-center justify-center gap-y-1 pb-12">
              <h1 className="text-center text-2xl font-bold">
                Welcome to Pulse Editor!
              </h1>
              <p className="text-center text-lg font-normal">
                Start by opening a file or project.
              </p>
            </div>
          ) : (
            <ExtensionViewLayout>
              <ViewLoader
                viewModel={activeViewModel}
                setViewModel={updateViewModel}
              />
            </ExtensionViewLayout>
          )}
        </div>

        <AgenticConsolePanel />
      </div>
    </div>
  );
}
