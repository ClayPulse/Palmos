import { MarketplaceCategoryEnum } from "@/lib/enums";
import { TabItem } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import AppGallery from "../marketplace/app/app-gallery";
import WorkflowGallery from "../marketplace/workflow/workflow-gallery";
import Tabs from "../misc/tabs";
import ModalWrapper from "./wrapper";

export default function MarketplaceModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  
  const extensionCategories: TabItem[] = [
    {
      name: MarketplaceCategoryEnum.Featured,
      description: t("marketplaceModal.tabs.featuredDescription"),
    },
    {
      name: MarketplaceCategoryEnum.Workflows,
      description: t("marketplaceModal.tabs.workflowsDescription"),
    },
    {
      name: MarketplaceCategoryEnum.Apps,
      description: t("marketplaceModal.tabs.appsDescription"),
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState<TabItem | undefined>(
    extensionCategories[0],
  );

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={t("marketplaceModal.title")}>
      <div className="grid h-full w-full grid-rows-[max-content_1fr] px-2">
        <div className="flex justify-center">
          <div>
            <Tabs
              tabItems={extensionCategories}
              selectedItem={selectedCategory}
              setSelectedItem={setSelectedCategory}
            />
          </div>
        </div>

        {selectedCategory?.name === MarketplaceCategoryEnum.Featured ? (
          <AppGallery />
        ) : selectedCategory?.name === MarketplaceCategoryEnum.Apps ? (
          <AppGallery />
        ) : (
          selectedCategory?.name === MarketplaceCategoryEnum.Workflows && (
            <WorkflowGallery />
          )
        )}
      </div>
    </ModalWrapper>
  );
}
