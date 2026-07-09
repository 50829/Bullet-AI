type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: Array<SegmentedControlOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-1 ${className}`}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
              selected
                ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
