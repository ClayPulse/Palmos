import { Button, Tooltip } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import Icon from "./icon";
import { ContextMenuState, TabItem } from "@/lib/types";
import ContextMenu from "../interface/context-menu";

export default function Tabs({
  tabItems,
  selectedItem,
  setSelectedItem,
  isShowPagination = false,
  onTabReady,
  onTabClose,
  isClosable = true,
}: {
  tabItems: TabItem[];
  selectedItem: TabItem | undefined;
  setSelectedItem: Dispatch<SetStateAction<TabItem | undefined>>;
  isShowPagination?: boolean;
  onTabReady?: (tabItem: TabItem | undefined) => void;
  onTabClose?: (tabItem: TabItem | undefined) => void;
  isClosable?: boolean;
}) {
  const tabsRootRef = useRef<HTMLDivElement | null>(null);
  const scrollableDivRef = useRef<HTMLDivElement | null>(null);
  const tabsContentRef = useRef<HTMLDivElement | null>(null);
  const [isLeftScrollable, setIsLeftScrollable] = useState<boolean>(false);
  const [isRightScrollable, setIsRightScrollable] = useState<boolean>(false);

  const [targetLocation, setTargetLocation] = useState<number>(0);
  const [targetWidth, setTargetWidth] = useState<number>(0);

  const scrollControlWidth = 32;

  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  const [contextItem, setContextItem] = useState<TabItem | undefined>(
    undefined,
  );

  function updateScroll() {
    if (
      scrollableDivRef.current &&
      tabsRootRef.current &&
      tabsContentRef.current
    ) {
      // Update the scrollable state based on current element width
      const isOverflow =
        tabsContentRef.current.clientWidth + 2 * scrollControlWidth + 8 >=
        tabsRootRef.current.clientWidth;

      const isLeftScrollable =
        isShowPagination &&
        isOverflow &&
        scrollableDivRef.current.scrollLeft > 0;
      const isRightScrollable =
        isShowPagination &&
        isOverflow &&
        scrollableDivRef.current.scrollLeft +
          scrollableDivRef.current.clientWidth <
          tabsContentRef.current.clientWidth; // 8 for padding

      setIsLeftScrollable(isLeftScrollable);
      setIsRightScrollable(isRightScrollable);
    }
  }

  function handleOnContextMenu(e: React.MouseEvent, item: TabItem) {
    e.preventDefault();
    // Get parent element position
    const current = e.currentTarget as HTMLElement;
    const container = current.parentElement?.parentElement as HTMLElement;
    const containerRect = container.getBoundingClientRect();

    setContextMenuState({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
      isOpen: true,
    });

    setContextItem(item);
  }

  // Update scroll on window resize
  useEffect(() => {
    const handleResize = () => {
      updateScroll();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    updateScroll();
  }, [tabItems]);

  useEffect(() => {
    const targetElement = document.getElementById(selectedItem?.name || "");

    if (targetElement) {
      setTargetLocation(targetElement.offsetLeft - 4); // Adjust for padding
      setTargetWidth(targetElement.clientWidth);
    }
  }, [selectedItem]);

  return (
    <div
      ref={tabsRootRef}
      className="scrollbar-hide grid h-full w-full grid-cols-[max-content_auto_max-content] items-center overflow-x-auto px-1"
    >
      {isLeftScrollable ? (
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={() => {
            // Scroll to the left
            scrollableDivRef.current?.scrollBy({
              left: -100,
              behavior: "smooth",
            });
            updateScroll();
          }}
          isDisabled={!isLeftScrollable}
        >
          <Icon name="arrow_left" />
        </Button>
      ) : (
        <div></div>
      )}

      <div
        className="scrollbar-hide relative flex items-center overflow-x-auto px-1 py-1"
        onScroll={(e) => {
          updateScroll();
        }}
        ref={scrollableDivRef}
      >
        <AnimatePresence>
          <motion.div
            className="bg-content4 border-divider absolute z-10 h-8 rounded-xl border-1 shadow-md"
            animate={{ x: targetLocation, width: targetWidth }} // Only animate x
            transition={{
              type: "spring",
              duration: 0.8,
            }}
            onAnimationComplete={() => {
              if (onTabReady) {
                onTabReady(selectedItem);
              }
            }}
          />
        </AnimatePresence>
        {isClosable && (
          <ContextMenu state={contextMenuState} setState={setContextMenuState}>
            <div className="flex flex-col">
              <Button
                className="text-medium h-12 sm:h-8 sm:text-sm"
                variant="light"
                onPress={(e) => {
                  if (onTabClose) {
                    onTabClose(contextItem);
                  }
                  setContextMenuState({ x: 0, y: 0, isOpen: false });
                }}
                color="danger"
              >
                Close Tab
                <Icon name="delete" variant="outlined" />
              </Button>
            </div>
          </ContextMenu>
        )}
        <div className="flex items-center" ref={tabsContentRef}>
          {tabItems.map((item, index) => (
            <div
              key={index}
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
                  onContextMenu={(e) => handleOnContextMenu(e, item)}
                >
                  <div
                    className={`text-content1-foreground flex items-center space-x-0.5 text-sm`}
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

      {isRightScrollable ? (
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={() => {
            // Scroll to the right
            scrollableDivRef.current?.scrollBy({
              left: 100,
              behavior: "smooth",
            });
            updateScroll();
          }}
          isDisabled={!isRightScrollable}
        >
          <Icon name="arrow_right" />
        </Button>
      ) : (
        <div></div>
      )}
    </div>
  );
}
