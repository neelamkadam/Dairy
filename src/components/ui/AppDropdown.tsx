import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

const AppDropdown = ({ triggerText, menuItems, onItemSelect ,className}:any) => {
  return (
    <DropdownMenu >
      <DropdownMenuTrigger className={ `${className}`}>{triggerText}</DropdownMenuTrigger>
      <DropdownMenuContent >
        {menuItems.map(({key,value}:any) => (
          <DropdownMenuItem key={key} onClick={() => onItemSelect(key,value)} >
            {value}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AppDropdown;
