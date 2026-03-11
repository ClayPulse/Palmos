import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { TabItem } from "@/lib/types";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";
import Icon from "../misc/icon";
import QRDisplay from "../misc/qr-display";
import Tabs from "../misc/tabs";
import ModalWrapper from "./wrapper";

export default function SharingModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {getTranslations: t} = useTranslations();
  // #region Load specified app if app query parameter is present
  const params = useSearchParams();
  // Use the 'app' query parameter to load specific extension app upon loading page
  const app = params.get("app");
  const canvas = params.get("canvas");
  const workflow = params.get("workflow");

  const tabItems: TabItem[] = [
    {
      name: t("sharingModal.tabs.qrCode"),
      description: t("sharingModal.tabs.qrCodeDescription"),
    },
    {
      name: t("sharingModal.tabs.url"),
      description: t("sharingModal.tabs.urlDescription"),
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
      toast.error(t("sharingModal.toast.fetchError"));
      return undefined;
    }

    const data: {
      visibility: string;
      canEdit: boolean;
      inviteCode?: string;
    } = await res.json();

    return data;
  });

  const sharedUrl = `${window.location.origin}?${app ? `app=${app}` : canvas ? `canvas=${canvas}` : workflow ? `workflow=${workflow}` : ""}${shareInfo?.inviteCode ? `&inviteCode=${shareInfo.inviteCode}` : ""}`;

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
      onClose={onClose}
      title={t("sharingModal.title", { name: app ? app : "Pulse Editor" })}
      placement={"center"}
    >
      <div className="flex w-full flex-col items-center gap-2">
        {app && (
          <Select
            label={t("sharingModal.visibility")}
            placeholder={t("sharingModal.visibilityPlaceholder")}
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
          <Input value={shareInfo.inviteCode} label={t("sharingModal.inviteCode")} readOnly />
        )}

        {!shareInfo?.visibility && app ? (
          <p>{t("sharingModal.selectVisibility")}</p>
        ) : shareInfo?.visibility === "private" && app ? (
          <p>{t("sharingModal.workspacePrivate")}</p>
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
                  {t("sharingModal.qrCode.description")}
                </p>
                <QRDisplay url={sharedUrl} />
              </div>
            )}

            {selectedTab?.name === tabItems[1].name && (
              <div className="flex flex-col items-center gap-y-1">
                <p className="text-content4-foreground text-sm">
                  {t("sharingModal.url.description")}
                </p>

                <p className="font-bold break-all">{sharedUrl}</p>
                <Button
                  color="primary"
                  onPress={() => {
                    navigator.clipboard.writeText(sharedUrl);
                    toast.success(t("sharingModal.toast.urlCopied"));
                  }}
                >
                  <Icon
                    name="content_copy"
                    className="text-primary-foreground!"
                  />
                  {t("sharingModal.url.copy")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ModalWrapper>
  );
}
