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
    className={`bg-primary border-white text-white border-[1px] border-opacity-25 rounded-[900px] w-[150px] h-[47px] mt-10 ${className}`}
    onClick={onClick}
    disabled ={disabled}
    >
        {label}
    </button>
  )
}

export default AppButton
