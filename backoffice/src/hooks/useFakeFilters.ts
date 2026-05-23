import { useMemo, useState } from "react";

export function useFakeFilters<T>(items: T[], filters: Record<string, string>) {
  const [active, setActive] = useState(filters);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        Object.entries(active).every(([key, value]) => {
          if (!value || value === "all") return true;
          const v = (item as Record<string, unknown>)[key];
          return String(v).toLowerCase() === value.toLowerCase();
        }),
      ),
    [items, active],
  );

  return { active, setActive, filtered, setFilter: (key: string, value: string) =>
    setActive((prev) => ({ ...prev, [key]: value })) };
}
