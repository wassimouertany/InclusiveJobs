interface FilterChipsProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

export default function FilterChips({ label, value, options, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="bo-kicker">{label}</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`bo-chip ${value === opt.value ? "active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
