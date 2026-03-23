import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { useState } from "react";

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

  return (
    <div
      className="relative"
      style={{
        height,
        width,
      }}
    >
      <div className="absolute -top-1.5 z-20 flex w-full justify-center">
        <div
          className="flex pt-1 h-3 w-8 cursor-grab flex-col items-center justify-start active:h-16 active:w-16 active:cursor-grabbing"
          onClick={(e) => {
            e.preventDefault();
            setIsShowingMenu((prev) => !prev);
          }}
        >
          <div className="bg-default-500 h-1 w-8 rounded-full"></div>

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
        {children}
      </div>
    </div>
  );
}

function AppControl() {
  return <></>;
}
