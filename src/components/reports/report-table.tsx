"use client";

import {
  columnFilteringFeature,
  createCoreRowModel,
  createFilteredRowModel,
  createSortedRowModel,
  columnOrderingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { ArrowDown, ArrowDownUp, ArrowUp, Check, ChevronDown, ChevronUp, Columns3, Filter, Search, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { ComponentType } from "react";
import { BookingRow } from "@/components/bookings/booking-row";
import { PaymentRow } from "@/components/payments/payment-row";
import { ReportTableRow } from "@/components/reports/report-table-row";
import type { ReportTableRowProps } from "@/components/reports/report-table-row";

export const reportTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  coreRowModel: createCoreRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
});

type ReportTableProps<TData extends object> = {
  title: string;
  description: string;
  icon: ReactNode;
  rows: TData[];
  // TanStack uses a shared TValue slot for heterogeneous columns in useTable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<typeof reportTableFeatures, TData, any>[];
  pageSize?: number;
  rowKind?: "booking" | "payment";
  currentPage: number;
  totalRecords: number;
  pageCount: number;
  pageParam: "bookingPage" | "paymentPage";
  paginationParams: Record<string, string>;
};

export function ReportTable<TData extends object>({
  title,
  description,
  icon,
  rows,
  columns,
  pageSize = 20,
  rowKind,
  currentPage,
  totalRecords,
  pageCount,
  pageParam,
  paginationParams,
}: ReportTableProps<TData>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useTable({
    features: reportTableFeatures,
    columns,
    data: rows,
    state: { columnFilters, columnOrder, columnVisibility, sorting },
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
  });
  const visibleRows = table.getRowModel().rows;
  const RowComponent: ComponentType<ReportTableRowProps> =
    rowKind === "booking"
      ? BookingRow
      : rowKind === "payment"
        ? PaymentRow
        : ReportTableRow;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-[-0.02em]">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ColumnVisibilityMenu
            table={table}
            columnOrder={columnOrder}
            setColumnOrder={setColumnOrder}
          />
          <span className="rounded-full border border-border bg-muted px-2.5 py-1.5 text-foreground">
            {totalRecords} records
          </span>
          {columnFilters.length > 0 && (
            <button
              type="button"
              onClick={() => table.resetColumnFilters(true)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 font-medium text-primary hover:bg-primary/10"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-muted">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="relative whitespace-nowrap border-b border-r border-border px-3 py-2.5 font-semibold text-muted-foreground last:border-r-0"
                  >
                    {!header.isPlaceholder && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 rounded px-0.5 py-1 text-left hover:text-primary"
                          aria-label={`Sort by ${header.column.id}`}
                        >
                          <table.FlexRender header={header} />
                          {header.column.getIsSorted() === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ArrowDownUp className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                        <ColumnFilterMenu
                          column={header.column}
                          values={table
                            .getCoreRowModel()
                            .rows.map((row) => String(row.getValue(header.column.id) ?? ""))}
                        />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.length ? (
              visibleRows.map((row, rowIndex) => (
                <RowComponent
                  key={row.id}
                  rowId={row.id}
                  index={rowIndex}
                  cells={row.getVisibleCells().map((cell) => ({
                    id: cell.id,
                    content: table.FlexRender({ cell }),
                  }))}
                />
              ))
            ) : (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No records match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
          </p>
          <nav className="flex items-center gap-1" aria-label={`${title} pagination`}>
            <PaginationLink
              currentPage={currentPage}
              page={currentPage - 1}
              pageCount={pageCount}
              pageParam={pageParam}
              params={paginationParams}
              label="Previous"
            />
            {paginationPages(currentPage, pageCount).map((page, index) =>
              page === null ? (
                <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-muted-foreground">
                  …
                </span>
              ) : (
                <PaginationLink
                  key={page}
                  currentPage={currentPage}
                  page={page}
                  pageCount={pageCount}
                  pageParam={pageParam}
                  params={paginationParams}
                  label={String(page)}
                />
              ),
            )}
            <PaginationLink
              currentPage={currentPage}
              page={currentPage + 1}
              pageCount={pageCount}
              pageParam={pageParam}
              params={paginationParams}
              label="Next"
            />
          </nav>
        </div>
      )}
    </section>
  );
}

function paginationPages(currentPage: number, pageCount: number) {
  const pages = new Set([1, pageCount]);
  for (let page = Math.max(1, currentPage - 2); page <= Math.min(pageCount, currentPage + 2); page++) {
    pages.add(page);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, index) => {
    if (index === 0) return [page];
    return [sorted[index - 1] + 1 < page ? null : undefined, page].filter(
      (entry): entry is number | null => entry !== undefined,
    );
  });
}

function PaginationLink({
  currentPage,
  page,
  pageCount,
  pageParam,
  params,
  label,
}: {
  currentPage: number;
  page: number;
  pageCount: number;
  pageParam: "bookingPage" | "paymentPage";
  params: Record<string, string>;
  label: string;
}) {
  const disabled = page < 1 || page > pageCount;
  const query = new URLSearchParams(params);
  query.set(pageParam, String(Math.max(1, Math.min(pageCount, page))));
  const href = `/?${query.toString()}`;
  const selected = page === currentPage;

  if (disabled) {
    return (
      <span className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground opacity-50" aria-disabled="true">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={selected ? "page" : undefined}
      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        selected
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </Link>
  );
}

type FilterableColumn = {
  id: string;
  getFilterValue: () => unknown;
  getIsFiltered: () => boolean;
  setFilterValue: (value: unknown) => void;
  clearSorting: () => void;
  toggleSorting: (desc?: boolean) => void;
};

type VisibilityTable = {
  getAllLeafColumns: () => Array<{
    id: string;
    getCanHide: () => boolean;
    getIsVisible: () => boolean;
    getToggleVisibilityHandler: () => (event: React.ChangeEvent<HTMLInputElement>) => void;
    getIndex: () => number;
  }>;
  getIsAllColumnsVisible: () => boolean;
  toggleAllColumnsVisible: (value: boolean) => void;
}

function ColumnVisibilityMenu({
  table,
  columnOrder,
  setColumnOrder,
}: {
  table: VisibilityTable;
  columnOrder: ColumnOrderState;
  setColumnOrder: (updater: (order: ColumnOrderState) => ColumnOrderState) => void;
}) {
  const [open, setOpen] = useState(false);
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-card-foreground hover:bg-muted"
      >
        <Columns3 className="h-3.5 w-3.5" />
        Columns
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close column visibility menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-10 z-40 max-h-[min(70vh,32rem)] w-64 overflow-y-auto rounded-xl border border-border bg-popover p-2 text-left text-popover-foreground shadow-xl">
            <button
              type="button"
              onClick={() => table.toggleAllColumnsVisible(!table.getIsAllColumnsVisible())}
              className="flex w-full items-center gap-2 rounded-md border-b border-border px-2 py-2 text-left text-xs font-semibold hover:bg-muted"
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${table.getIsAllColumnsVisible() ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                {table.getIsAllColumnsVisible() && <Check className="h-3 w-3" />}
              </span>
              Toggle all columns
            </button>
            {columns.map((column) => {
              const currentOrder = columnOrder.length
                ? columnOrder
                : table.getAllLeafColumns().map((entry) => entry.id);
              const orderedIndex = currentOrder.indexOf(column.id);
              return (
                <div
                  key={column.id}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="truncate">{column.id}</span>
                  </label>
                  <button
                    type="button"
                    aria-label={`Move ${column.id} up`}
                    disabled={orderedIndex <= 0}
                    onClick={() =>
                      setColumnOrder((order) => {
                        const next = order.length ? [...order] : currentOrder;
                        const position = next.indexOf(column.id);
                        if (position <= 0) return next;
                        [next[position - 1], next[position]] = [next[position], next[position - 1]];
                        return next;
                      })
                    }
                    className="rounded p-1 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${column.id} down`}
                    disabled={orderedIndex < 0 || orderedIndex >= currentOrder.length - 1}
                    onClick={() =>
                      setColumnOrder((order) => {
                        const next = order.length ? [...order] : currentOrder;
                        const position = next.indexOf(column.id);
                        if (position < 0 || position >= next.length - 1) return next;
                        [next[position + 1], next[position]] = [next[position], next[position + 1]];
                        return next;
                      })
                    }
                    className="rounded p-1 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ColumnFilterMenu({
  column,
  values,
}: {
  column: FilterableColumn;
  values: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const uniqueValues = [...new Set(values)].sort((a, b) => a.localeCompare(b));
  const selected = Array.isArray(column.getFilterValue())
    ? (column.getFilterValue() as string[])
    : uniqueValues;
  const filteredValues = uniqueValues.filter((value) =>
    value.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  function toggleValue(value: string) {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    column.setFilterValue(next.length ? next : undefined);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Filter ${column.id}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex h-7 w-7 items-center justify-center rounded-md transition ${column.getIsFiltered() ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
      >
        {column.getIsFiltered() ? <Filter className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close filter menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-9 z-40 w-64 rounded-xl border border-border bg-popover p-3 text-left font-normal text-popover-foreground shadow-xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold">Filter: {column.id}</p>
              <button
                type="button"
                onClick={() => column.setFilterValue(undefined)}
                className="shrink-0 text-[11px] font-medium text-primary hover:underline"
              >
                Clear
              </button>
            </div>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search values"
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="mb-2 flex gap-2 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => column.setFilterValue(uniqueValues)}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => column.setFilterValue(undefined)}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Deselect all
              </button>
            </div>
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {filteredValues.map((value) => {
                const checked = selected.includes(value);
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => toggleValue(value)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted"
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{value || "(blank)"}</span>
                  </button>
                );
              })}
              {!filteredValues.length && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">No values found.</p>
              )}
            </div>
            <div className="mt-2 flex border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  column.clearSorting();
                  setOpen(false);
                }}
                className="flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted"
              >
                Reset sort
              </button>
              <button
                type="button"
                onClick={() => {
                  column.toggleSorting(false);
                  setOpen(false);
                }}
                className="flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
              >
                Sort A → Z
              </button>
              <button
                type="button"
                onClick={() => {
                  column.toggleSorting(true);
                  setOpen(false);
                }}
                className="flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
              >
                Sort Z → A
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
