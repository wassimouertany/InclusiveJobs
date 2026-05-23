import { useMemo, useState } from "react";

export function useFakePagination<T>(items: T[], pageSize = 8) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const paginated = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, totalPages]);

  return {
    page,
    setPage,
    totalPages,
    paginated,
    total: items.length,
  };
}
