import { Progress } from "@heroui/react";

export default function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Progress
        isIndeterminate={true}
        className="w-1/2 text-default-foreground"
        color="default"
        size="md"
        label={text}
        classNames={{
          label: "w-full text-center",
        }}
      />
    </div>
  );
}
