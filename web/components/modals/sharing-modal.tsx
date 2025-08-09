import { Button, Select, SelectItem } from "@heroui/react";
import ModalWrapper from "./modal-wrapper";
import { useSearchParams } from "next/navigation";
import QRDisplay from "../misc/qr-display";
import Tabs from "../misc/tabs";
import { TabItem } from "@/lib/types";
import { useEffect, useState } from "react";
import Icon from "../misc/icon";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/hooks/use-auth";

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

  const visibilityOptions = ["public", "unlisted", "private"];
  const [selectedVisibility, setSelectedVisibility] = useState<
    string | undefined
  >(undefined);

  const { session } = useAuth();
  const [isDeveloper, setIsDeveloper] = useState(false);

  // Load app visibility
  useEffect(() => {
    async function getVisibility() {
      if (!app) return;

      const url = new URL(`https://pulse-editor.com/api/extension/get`);
      url.searchParams.append("app", app);
      url.searchParams.append("latest", "true");

      const res = await fetch(url, {
        credentials: "include",
      });

      const data: {
        visibility: string;
      }[] = await res.json();
      if (data) {
        const ext = data[0];
        setSelectedVisibility(ext.visibility);
      }
    }
  }, []);

  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={"Share Your " + (app ? app : "Pulse Editor") + " Workspace"}
      placement={"center"}
    >
      <div className="flex w-full flex-col items-center gap-2">
        {app && (
          <Select
            label="Visibility"
            placeholder="Select visibility"
            onChange={(e) => {
              setSelectedVisibility(e.target.value);
            }}
            isDisabled={!isDeveloper}
          >
            {visibilityOptions.map((option) => (
              <SelectItem key={option}>{option}</SelectItem>
            ))}
          </Select>
        )}

        {!selectedVisibility && app ? (
          <p>Select a visibility option to see sharing options.</p>
        ) : selectedVisibility === "private" && app ? (
          <p>Your workspace is private.</p>
        ) : (
          <>
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
                  <Icon
                    name="content_copy"
                    className="text-primary-foreground!"
                  />
                  Copy
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ModalWrapper>
  );
}
