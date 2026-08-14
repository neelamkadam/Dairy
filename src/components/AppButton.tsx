import { Loader2 } from "lucide-react";

interface ButtonProps {
    label?: string;
    className?: string;
    onClick?: () => void;
    type?: "submit" | "reset" | "button";
    disabled?: boolean;
    isLoading?: boolean;
}

const AppButton = ({
    label,
    className,
    onClick,
    type = "button",
    disabled = false,
    isLoading = false
}: ButtonProps) => {
    return (
        <button
            type={type}
            className={`px-3 py-3 flex items-center justify-center gap-2 bg-primary border-white text-white border-[1px] border-opacity-25 rounded-md shadow-sm transition-colors hover:shadow-md ${className}`}
            onClick={onClick}
            disabled={disabled || isLoading}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {label}
        </button>
    );
};

export default AppButton;
