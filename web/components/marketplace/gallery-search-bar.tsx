import Icon from "@/components/misc/icon";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
} from "@heroui/react";

type FilterLabel = { name: string };
type SortLabel<T extends string> = { name: string; value: T };

interface GallerySearchBarProps<T extends string> {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterLabels: FilterLabel[];
  selectedFilterIndex: number;
  onFilterChange: (index: number) => void;
  sortLabels: SortLabel<T>[];
  sortValue: T;
  onSortChange: (value: T) => void;
  className?: string;
}

export default function GallerySearchBar<T extends string>({
  searchQuery,
  onSearchChange,
  filterLabels,
  selectedFilterIndex,
  onFilterChange,
  sortLabels,
  sortValue,
  onSortChange,
  className,
}: GallerySearchBarProps<T>) {
  return (
    <Input
      size="sm"
      placeholder="Search..."
      className={className}
      value={searchQuery}
      onValueChange={onSearchChange}
      startContent={
        <div>
          <Icon name="search" variant="outlined" />
        </div>
      }
      endContent={
        <div className="flex items-center gap-1">
          <Dropdown>
            <DropdownTrigger>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                title={filterLabels[selectedFilterIndex]?.name ?? "All"}
              >
                <Icon
                  name={
                    selectedFilterIndex === 0 ? "filter_alt_off" : "filter_alt"
                  }
                />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Filter">
              {filterLabels.map((item, index) => (
                <DropdownItem
                  key={item.name}
                  onPress={() => onFilterChange(index)}
                >
                  {item.name}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
          <Dropdown>
            <DropdownTrigger>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                title={sortLabels.find((s) => s.value === sortValue)?.name}
              >
                <Icon
                  name={
                    sortValue.startsWith("name") ? "sort_by_alpha" : "sort"
                  }
                />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Sort">
              {sortLabels.map((item) => (
                <DropdownItem
                  key={item.value}
                  onPress={() => onSortChange(item.value)}
                >
                  {item.name}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>
      }
    />
  );
}
