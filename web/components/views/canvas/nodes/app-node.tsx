import { AppViewConfig } from "@/lib/types";
import { Node } from "@xyflow/react";
import AppView from "../../app/app-view";

export default function AppNode(props: any) {
  const nodeProps = props as Node<{ config: AppViewConfig }>;
  const { config }: { config: AppViewConfig } = nodeProps.data;

  return (
    <div className="app-node h-80 w-80 rounded-lg">
      <AppView config={config} />
    </div>
  );
}
