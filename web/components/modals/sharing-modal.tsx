import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { TabItem } from "@/lib/types";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";
import Icon from "../misc/icon";
import QRDisplay from "../misc/qr-display";
import Tabs from "../misc/tabs";
import ModalWrapper from "./modal-wrapper";

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

  const {
    data: shareInfo,
    mutate,
    isLoading: isLoadingShareInfo,
  } = useSWR<
    | {
        visibility: string;
        canEdit: boolean;
        inviteCode?: string;
      }
    | undefined
  >(app ? `/api/app/get-share-info?name=${app}` : null, async (url: URL) => {
    const res = await fetchAPI(url);

    if (!res.ok) {
      toast.error("Failed to fetch extension share info");
      return undefined;
    }

    const data: {
      visibility: string;
      canEdit: boolean;
      inviteCode?: string;
    } = await res.json();

    return data;
  });

  async function updateShareInfo(visibility: string) {
    await fetchAPI(`/api/app/update`, {
      method: "PATCH",
      body: JSON.stringify({
        visibility,
        name: app,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    mutate();
  }

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
              updateShareInfo(e.target.value);
            }}
            isDisabled={!shareInfo?.canEdit}
            isLoading={isLoadingShareInfo}
            selectedKeys={shareInfo?.visibility ? [shareInfo.visibility] : []}
          >
            {visibilityOptions.map((option) => (
              <SelectItem key={option}>{option}</SelectItem>
            ))}
          </Select>
        )}

        {app && shareInfo?.canEdit && shareInfo.visibility === "unlisted" && (
          <Input value={shareInfo.inviteCode} label="Invite Code" readOnly />
        )}

        {!shareInfo?.visibility && app ? (
          <p>Select a visibility option to see sharing options.</p>
        ) : shareInfo?.visibility === "private" && app ? (
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
                <QRDisplay
                  url={`${window.location.origin}?app=${app}${shareInfo?.inviteCode ? `&inviteCode=${shareInfo.inviteCode}` : ""}`}
                />
              </div>
            )}

            {selectedTab?.name === tabItems[1].name && (
              <div className="flex flex-col items-center gap-y-1">
                <p className="text-content4-foreground text-sm">
                  Share your workspace via this URL
                </p>

                <p className="font-bold break-all">{`${window.location.origin}?app=${app}${shareInfo?.inviteCode ? `&inviteCode=${shareInfo.inviteCode}` : ""}`}</p>
                <Button
                  color="primary"
                  onPress={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}?app=${app}${shareInfo?.inviteCode ? `&inviteCode=${shareInfo.inviteCode}` : ""}`,
                    );
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
