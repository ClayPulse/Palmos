import { MenuAction, PlatformEnum } from "@/lib/types";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import Icon from "../misc/icon";
import { useState } from "react";
import { getPlatform } from "@/lib/platform-api/platform-checker";

export default function NavMenuDropdown({
  menuActions,
}: {
  menuActions?: MenuAction[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dropdown onOpenChange={(isOpen) => setIsOpen(isOpen)}>
      <DropdownTrigger>
        <Button
          variant="light"
          className="text-md data-[is-active=true]:bg-default h-fit min-w-0 px-3 py-2 sm:px-4"
          data-is-active={isOpen}
        >
          File
        </Button>
      </DropdownTrigger>
      <DropdownMenu>
        {menuActions?.map((action) => (
          <DropdownItem
            key={action.name}
            onPress={() => {
              action.actionFunc();
            }}
            shortcut={
              getPlatform() !== PlatformEnum.Capacitor &&
              getPlatform() !== PlatformEnum.WebMobile
                ? action.shortcut
                : null
            }
            description={action.description}
            startContent={
              action.icon ? (
                <div className="w-6">
                  <Icon name={action.icon} variant="round" />
                </div>
              ) : null
            }
          >
            {action.name}
          </DropdownItem>
        )) ?? []}
      </DropdownMenu>
    </Dropdown>
  );
}
