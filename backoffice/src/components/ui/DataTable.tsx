import type { ReactNode } from "react";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyTitle?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle = "No results found",
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <CardWrap>
        <EmptyState title={emptyTitle} description="Try adjusting your search or filters." />
      </CardWrap>
    );
  }

  return (
    <CardWrap>
      <div className="hidden md:block overflow-x-auto">
        <table className="bo-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3 p-3">
        {rows.map((row) => (
          <div key={rowKey(row)} className="bo-mobile-row">
            {columns.map((c) => (
              <div key={c.key} className="flex justify-between gap-3 text-sm py-1">
                <span className="bo-kicker">{c.header}</span>
                <span>{c.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </CardWrap>
  );
}

function CardWrap({ children }: { children: ReactNode }) {
  return <article className="bo-card overflow-hidden">{children}</article>;
}
