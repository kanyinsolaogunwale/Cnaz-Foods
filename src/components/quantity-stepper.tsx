"use client";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div
      className="inline-flex items-center rounded-xl border border-ink-200 bg-white"
      role="group"
      aria-label={`Quantity for ${label}`}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid h-10 w-10 place-items-center rounded-l-xl text-lg font-medium text-ink-800 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label={`Decrease quantity of ${label}`}
      >
        −
      </button>
      <span className="w-9 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="grid h-10 w-10 place-items-center rounded-r-xl text-lg font-medium text-ink-800 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label={`Increase quantity of ${label}`}
      >
        +
      </button>
    </div>
  );
}
