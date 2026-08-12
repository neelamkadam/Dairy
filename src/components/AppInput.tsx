import { cn } from "@/lib/utils";
import { ChangeEvent, FocusEvent } from "react";
import {
  FieldValues,
  Path,
  RegisterOptions,
  UseFormReturn,
} from "react-hook-form";


interface InputFieldProps<T extends FieldValues> {
  name: Path<T>;
  // form: UseFormReturn<T, any, undefined>;
  type?: "text" | "email" | "password" | "number" | "url";
  label?: string;
  validation?: RegisterOptions<T, Path<T>>;
  placeholder?: string;
  readonly?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlure?: (event: FocusEvent<HTMLInputElement>) => void;
  maxLength?: number; // Added maxLength prop
  form: UseFormReturn<T>;
  className?:string;
  isError?:boolean
}

const AppInputField = <T extends FieldValues>({
  name,
  type = "text",
  label,
  className,
  validation,
  placeholder,
  form,
  readonly,
  onChange,
  onBlure,
  maxLength, // Destructure maxLength
  isError = false
}: InputFieldProps<T>) => {
  // Determine validation options, directly using validation object
  const validationOptions = validation
    ? {
      ...validation,
      required:
        typeof validation.required === "string"
          ? validation.required
          : validation.required === true
            ? "Required"
            : undefined,
    }
    : {};

  // const isError = !!form.formState.errors[name]; // Check if there's an error for this field

  return (
    <div className="mb-1 ">
      {label && (
        <div className="flex space-x-1">
          <label
            htmlFor={name}
            className="block text-sm xl:text-[15px] font-bold text-[#394557]"
          >
            {label}
          </label>
          {validation && validation.required && (
            <div className="text-red-500">*</div>
          )}
        </div>
      )}
      <input
        id={name}
        type={type}
        disabled={readonly}
        placeholder={placeholder} 
        // placeholder={form.formState.errors[name]?.message?.toString() ? form.formState.errors[name]?.message?.toString() : placeholder} 
        autoComplete="off"
        maxLength={maxLength} // Apply maxLength here
        {...form.register(name, validationOptions)}
        onChange={(event) => {
          form.register(name, validationOptions).onChange(event);
          if (onChange) {
            onChange(event);
          }
        }}
        onBlur={(event) => {
          form.register(name, validationOptions).onBlur(event);
          if (onBlure) {
            onBlure(event);
          }
        }}

        style={{
          fontSize: "17px",
          color: (form.formState.errors[name]?.message as string) ? "black" : "#293343",
        }} 
        className={cn(
          `mt-1 block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm xl:text-base ${className}`,
          (form.formState.errors[name]?.message as string)
            ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50"
            : ""
        )}
      />
      {isError && (
        <p className="mt-2 text-sm text-red-600 text-start">
          {(form.formState.errors[name]?.message as string)}
        </p>
      )}
    </div>
  );
};

export default AppInputField;
