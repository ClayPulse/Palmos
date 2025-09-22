import { Button } from "@heroui/react";

export default function HomeView({
  createNewCanvas,
}: {
  createNewCanvas: () => void;
}) {
  return (
    <div className="text-default-foreground flex h-full w-full flex-col items-center justify-center gap-y-1 pb-12">
      <h1 className="text-center text-2xl font-bold">
        Welcome to Pulse Editor!
      </h1>
      <p className="text-center text-lg font-normal">
        Start by opening a project.
      </p>

      <div className="mt-4 flex gap-x-2">
        <Button color="primary" onPress={createNewCanvas}>
          New Workflow
        </Button>
        <Button color="secondary">Discover Apps</Button>
      </div>
    </div>
  );
}
