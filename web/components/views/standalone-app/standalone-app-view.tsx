import { AppViewConfig } from "@/lib/types";
import BaseAppView from "../base/base-app-view";
import ViewControlLayout from "../layout/view-control-layout";

export default function StandaloneAppView({
  viewId,
  config,
}: {
  viewId: string;
  config: AppViewConfig;
}) {
  return (
    <ViewControlLayout type="app">
      <BaseAppView viewId={viewId} config={config} />
    </ViewControlLayout>
  );
}
