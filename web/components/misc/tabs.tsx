import { Button, Tooltip } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import Icon from "./icon";
import { TabItem } from "@/lib/types";

export default function Tabs({
  tabItems,
  selectedItem,
  setSelectedItem,
  isShowArrows,
  onTabReady,
}: {
  tabItems: TabItem[];
  selectedItem: TabItem | undefined;
  setSelectedItem: Dispatch<SetStateAction<TabItem | undefined>>;
  isShowArrows?: boolean;
  onTabReady?: (tabItem: TabItem | undefined) => void;
}) {
  const tabDivRef = useRef<HTMLDivElement | null>(null);
  const [isLeftScrollable, setIsLeftScrollable] = useState<boolean>(false);
  const [isRightScrollable, setIsRightScrollable] = useState<boolean>(false);

  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [targetLocation, setTargetLocation] = useState<number>(0);
  const [targetWidth, setTargetWidth] = useState<number>(0);

  function updateScroll() {
    if (tabDivRef.current) {
      setIsLeftScrollable(tabDivRef.current.scrollLeft > 0);
      setIsRightScrollable(
        tabDivRef.current.scrollLeft + tabDivRef.current.clientWidth <
          tabDivRef.current.scrollWidth - 1,
      );
    }
  }

  useEffect(() => {
    updateScroll();
  }, [tabItems]);

  useEffect(() => {
    const targetElement = document.getElementById(selectedItem?.name || "");

    if (targetElement) {
      setTargetLocation(targetElement.offsetLeft);
      setTargetWidth(targetElement.clientWidth);
      setIsAnimating(true);
    }
  }, [selectedItem]);

  return (
    <div className="flex h-full items-center overflow-x-auto px-2 scrollbar-hide">
      {isShowArrows && (
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={() => {
            // Scroll to the left
            tabDivRef.current?.scrollBy({
              left: -100,
              behavior: "smooth",
            });
          }}
          isDisabled={!isLeftScrollable}
        >
          <Icon name="arrow_left" />
        </Button>
      )}
      <div
        className="relative flex items-center overflow-visible scrollbar-hide"
        onScroll={(e) => {
          updateScroll();
        }}
      >
        <AnimatePresence>
          <motion.div
            className="absolute z-10 h-8 rounded-lg bg-content4 shadow-xs"
            animate={{ x: targetLocation, width: targetWidth }} // Only animate x
            transition={{
              type: "spring",
              duration: 0.8,
            }}
            onAnimationComplete={() => {
              setIsAnimating(false);
              if (onTabReady) {
                onTabReady(selectedItem);
              }
            }}
          />
        </AnimatePresence>
        <div
          ref={tabDivRef}
          className="flex items-center overflow-x-auto scrollbar-hide"
        >
          {tabItems.map((item) => (
            <div
              key={item.name}
              id={item.name}
              className="flex h-full items-center"
            >
              <Tooltip content={item.description}>
                <Button
                  className={`z-20 h-fit rounded-lg bg-transparent px-2 py-1`}
                  disableRipple
                  disableAnimation
                  onPress={(e) => {
                    setSelectedItem(item);
                    // Move scroll location to the tab
                    const tab = e.target as HTMLElement;
                    tab?.scrollIntoView({
                      behavior: "smooth",
                      inline: "nearest",
                    });
                  }}
                >
                  <div
                    className={`flex items-center space-x-0.5 text-sm text-content1-foreground`}
                  >
                    {item.icon && (
                      <Icon
                        variant="outlined"
                        name={item.icon || "smart_toy"}
                      />
                    )}
                    <p>{item.name}</p>
                  </div>
                </Button>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>

      {isShowArrows && (
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={() => {
            // Scroll to the right
            tabDivRef.current?.scrollBy({
              left: 100,
              behavior: "smooth",
            });
          }}
          isDisabled={!isRightScrollable}
        >
          <Icon name="arrow_right" />
        </Button>
      )}
    </div>
  );
}
