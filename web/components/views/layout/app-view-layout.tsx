import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import AppControl from "./controls/app-control";

export default function AppViewLayout({
  height = "100%",
  width = "100%",
  children,
  controlActions = {},
}: {
  height?: string;
  width?: string;
  children: React.ReactNode;
  controlActions?: Record<string, (() => void) | undefined>;
}) {
  const [isShowingMenu, setIsShowingMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  return (
    <div
      className="relative"
      style={{
        height,
        width,
      }}
    >
      <div className="absolute -top-1.5 z-20 flex h-3 w-full items-center justify-center">
        <div
          className="flex h-1 w-8 cursor-grab flex-col items-center justify-start active:h-16 active:w-16 active:cursor-grabbing"
          onClick={(e) => {
            e.preventDefault();
            setIsShowingMenu((prev) => !prev);
          }}
        >
          <div className="bg-default-500 data-[is-grabbing=true]:opacity-1/2 h-1 w-8 rounded-full"></div>

          <Popover isOpen={isShowingMenu} onOpenChange={setIsShowingMenu}>
            <PopoverTrigger>
              <div></div>
            </PopoverTrigger>
            <PopoverContent>
              <div className="bg-content1 flex items-center gap-x-1 rounded-md">
                <AppControl />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="bg-content1 relative h-full w-full overflow-hidden rounded-lg shadow-md">
        {
          // Add a temporary div overlay to prevent interaction while resizing
          isResizing && (
            <div className="absolute top-0 left-0 z-20 h-full w-full" />
          )
        }
        {children}
      </div>
    </div>
  );
}
