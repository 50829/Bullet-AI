import { Eye, EyeOff } from "lucide-react";
import { AuthInput } from "./AuthInput";

type PasswordFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  visible: boolean;
  invalid?: boolean;
  showLabel: string;
  hideLabel: string;
  onToggleVisible: () => void;
};

export function PasswordField({
  visible,
  invalid = false,
  showLabel,
  hideLabel,
  onToggleVisible,
  className = "",
  ...props
}: PasswordFieldProps) {
  const label = visible ? hideLabel : showLabel;

  return (
    <div className="relative">
      <AuthInput
        {...props}
        invalid={invalid}
        type={visible ? "text" : "password"}
        className={`pr-12 ${className}`}
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggleVisible}
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        aria-label={label}
        title={label}
        disabled={props.disabled}
      >
        {visible ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
      </button>
    </div>
  );
}
