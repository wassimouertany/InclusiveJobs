import { useMemo, useState } from "react";

export function useFakeSearch<T>(
  items: T[],
  predicate: (item: T, query: string) => boolean,
) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => predicate(item, q));
  }, [items, query, predicate]);

  return { query, setQuery, filtered };
}
