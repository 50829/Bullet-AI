type ColorSwatchOption<T extends string | null> = {
  value: T;
  swatch: string;
  label: string;
};

type ColorSwatchPickerProps<T extends string | null> = {
  value: T;
  options: Array<ColorSwatchOption<T>>;
  onChange: (value: T) => void;
  nullable?: boolean;
  disabled?: boolean;
  className?: string;
};

export function ColorSwatchPicker<T extends string | null>({
  value,
  options,
  onChange,
  nullable = false,
  disabled = false,
  className = "",
}: ColorSwatchPickerProps<T>) {
  const visibleOptions = nullable
    ? options
    : options.filter((option) => option.value !== null);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {visibleOptions.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value ?? "theme"}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`h-8 w-8 rounded-lg border-2 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
              selected
                ? "border-[var(--color-text-primary)]"
                : "border-transparent"
            }`}
            style={{ backgroundColor: option.swatch }}
            aria-label={option.label}
            aria-pressed={selected}
            title={option.label}
          />
        );
      })}
    </div>
  );
}
