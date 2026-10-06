import type { ReactNode } from "react";

export type ReportTableRowProps = {
  rowId: string;
  index: number;
  cells: Array<{ id: string; content: ReactNode }>;
};

export function ReportTableRow({ rowId, index, cells }: ReportTableRowProps) {
  return (
    <tr
      data-row-id={rowId}
      className={`group transition-colors hover:bg-muted ${index % 2 ? "bg-muted/50" : "bg-card"}`}
    >
      {cells.map((cell) => (
        <td
          key={cell.id}
          className="whitespace-nowrap border-b border-r border-border px-3 py-3 text-card-foreground last:border-r-0"
        >
          {cell.content}
        </td>
      ))}
    </tr>
  );
}
