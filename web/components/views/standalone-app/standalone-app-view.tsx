import { AppViewConfig } from "@/lib/types";
import BaseAppView from "../base/base-app-view";
import ViewControlLayout from "../layout/view-control-layout";

export default function StandaloneAppView({
  config,
}: {
  config: AppViewConfig;
}) {
  return (
    <ViewControlLayout type="app" >
      <BaseAppView config={config} />
    </ViewControlLayout>
  );
}
