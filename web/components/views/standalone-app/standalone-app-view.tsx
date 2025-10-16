import { AppViewConfig } from "@/lib/types";
import { memo } from "react";
import BaseAppView from "../base/base-app-view";
import AppViewLayout from "./layout";

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

export const MemoizedStandaloneAppView = memo(StandaloneAppView);
