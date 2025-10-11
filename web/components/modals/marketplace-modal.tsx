import { MarketplaceCategoryEnum } from "@/lib/enums";
import { TabItem } from "@/lib/types";
import { useState } from "react";
import AppGallery from "../marketplace/app/app-gallery";
import WorkflowGallery from "../marketplace/workflow/workflow-gallery";
import Tabs from "../misc/tabs";
import ModalWrapper from "./modal-wrapper";

export default function MarketplaceModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const extensionCategories: TabItem[] = [
    {
      name: MarketplaceCategoryEnum.Featured,
      description: "Featured apps and workflows from the community",
    },
    {
      name: MarketplaceCategoryEnum.Workflows,
      description: "Browse workflows shared by the community",
    },
    {
      name: MarketplaceCategoryEnum.Apps,
      description: "Browse federated Pulse Apps developed by the community",
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState<TabItem | undefined>(
    extensionCategories[0],
  );

  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={"Community Marketplace"}
    >
      <div className="h-full w-full overflow-y-auto px-2">
        <div className="flex justify-center">
          {isOpen && (
            <div>
              <Tabs
                tabItems={extensionCategories}
                selectedItem={selectedCategory}
                setSelectedItem={setSelectedCategory}
              />
            </div>
          )}
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
