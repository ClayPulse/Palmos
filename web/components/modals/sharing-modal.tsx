import { Button } from "@heroui/react";
import ModalWrapper from "./modal-wrapper";
import { useSearchParams } from "next/navigation";
import QRDisplay from "../misc/qr-display";
import Tabs from "../misc/tabs";
import { TabItem } from "@/lib/types";
import { useState } from "react";
import Icon from "../misc/icon";
import toast from "react-hot-toast";

export default function SharingModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  // #region Load specified app if app query parameter is present
  const params = useSearchParams();
  // Use the 'app' query parameter to load specific extension app upon loading page
  const app = params.get("app");

  const tabItems: TabItem[] = [
    {
      name: "QR Code",
      description: "Share your workspace via QR code",
    },
    {
      name: "URL",
      description: "Share your workspace via URL",
    },
  ];
  const [selectedTab, setSelectedTab] = useState<TabItem | undefined>(
    tabItems[0],
  );

  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={"Share Your " + (app ? app : "Pulse Editor") + " Workspace"}
      placement={"center"}
    >
      <div className="flex w-full flex-col items-center gap-2">
        <Tabs
          tabItems={tabItems}
          selectedItem={selectedTab}
          setSelectedItem={setSelectedTab}
        />

        {selectedTab?.name === tabItems[0].name && (
          <div className="flex flex-col items-center gap-y-1">
            <p className="text-content4-foreground text-sm">
              Share your workspace via this QR Code
            </p>
            <QRDisplay url={window.location.href} />
          </div>
        )}

        {selectedTab?.name === tabItems[1].name && (
          <div className="flex flex-col items-center gap-y-1">
            <p className="text-content4-foreground text-sm">
              Share your workspace via this URL
            </p>

            <p className="font-bold break-all">{window.location.href}</p>
            <Button
              color="primary"
              onPress={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("URL copied to clipboard");
              }}
            >
              <Icon name="content_copy" className="text-primary-foreground!" />
              Copy
            </Button>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
