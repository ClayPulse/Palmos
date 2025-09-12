import { MenuAction } from "@/lib/types";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import Icon from "../misc/icon";
import { useState } from "react";

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
          className="text-md data-[is-active=true]:bg-default h-fit min-w-0 px-4 py-2"
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
            shortcut={action.shortcut}
            description={action.description}
            startContent={
              action.icon ? <Icon name={action.icon} variant="round" /> : null
            }
          >
            {action.name}
          </DropdownItem>
        )) ?? []}
      </DropdownMenu>
    </Dropdown>
  );
}
