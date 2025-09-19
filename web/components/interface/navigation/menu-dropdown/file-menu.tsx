import { useMenuActions } from "@/lib/hooks/use-menu-actions";
import NavMenuDropdown from "../nav-menu-dropdown";

export default function FileMenuDropDown() {
  const { menuActions } = useMenuActions("file");

  return <NavMenuDropdown category="File" menuActions={menuActions} />;
}
