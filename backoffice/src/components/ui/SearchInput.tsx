import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
  return (
    <label className="relative block w-full max-w-sm">
      <span className="visually-hidden">Search</span>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bo-muted)]" aria-hidden />
      <input
        className="bo-search w-full pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
