interface ButtonProps {
    label?:string,
    className?:string,
    onClick?:()=>void,
    type?:"submit" | "reset" | "button"
    disabled ?: boolean;
}
const AppButton = ({label,className,onClick,type="button",disabled=false}:ButtonProps) => {
  return (
    <button
    type={type}
    className={` px-3 py-3 bg-primary border-white text-white border-[1px] border-opacity-25 rounded-lg  ${className}`}
    onClick={onClick}
    disabled ={disabled}
    >
        {label}
    </button>
  )
}

export default AppButton
