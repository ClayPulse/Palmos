import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { PulseEditorCapacitor } from "@pulse-editor/capacitor-plugin";
import { addToast, Button } from "@heroui/react";
import toast from "react-hot-toast";

export default function useAndroidManageStorageNotification() {
  const [isGranted, setIsGranted] = useState(true);

  useEffect(() => {
    async function checkStoragePermission() {
      const { isGranted }: { isGranted: boolean } =
        await PulseEditorCapacitor.isManageStoragePermissionGranted();
      setIsGranted(isGranted);
    }

    if (getPlatform() === PlatformEnum.Capacitor) {
      checkStoragePermission();
    }
  }, []);

  useEffect(() => {
    if (!isGranted) {
      addToast({
        title: "Storage Permission Required",
        classNames: {
          base: "flex flex-col items-start",
        },
        description:
          "To use local storage management feature, please grant storage permission in settings. ",
        icon: "warning",
        color: "warning",
        size: "lg",
        shouldShowTimeoutProgress: true,
        timeout: 30000,
        endContent: (
          <div className="flex w-full flex-col gap-1 pt-2">
            <Button
              color="primary"
              onPress={() => PulseEditorCapacitor.startManageStorageIntent()}
            >
              Go to settings
            </Button>
            <Button
              color="default"
              onPress={() => {
                toast("🚧 Coming soon!");
              }}
            >
              Use cloud instance
            </Button>
          </div>
        ),
      });
    }
  }, [isGranted]);

  return {};
}
