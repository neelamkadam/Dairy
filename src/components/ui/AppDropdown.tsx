import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

const AppDropdown = ({ triggerText, selectedKey, menuItems, onItemSelect ,className}:any) => {
  const selectedItem = menuItems.find((item: any) => item.key === selectedKey);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{selectedItem?.flag || "🌐"}</span>
          {triggerText}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg">
        {menuItems.map(({key,value,flag}:any) => (
          <DropdownMenuItem key={key} onClick={() => onItemSelect(key,value)} className="hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="text-lg">{flag}</span>
              {value}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AppDropdown;
