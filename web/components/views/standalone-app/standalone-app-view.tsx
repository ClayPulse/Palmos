import { AppViewConfig } from "@/lib/types";
import BaseAppView from "../base/base-app-view";
import AppViewLayout from "./app-view-layout";

export default function StandaloneAppView({
  config,
}: {
  config: AppViewConfig;
}) {
  return (
    <AppViewLayout>
      <BaseAppView viewId={config.viewId} config={config} />
    </AppViewLayout>
  );
}
