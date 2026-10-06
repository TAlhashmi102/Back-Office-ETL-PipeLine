import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildBookingReportRows,
  buildPaymentReportRows,
  type BookingSource,
  type PaymentSource,
  type SourceRecord,
} from "@/lib/reports/aggregation";

export const REPORT_PAGE_SIZE = 20;

export type ReportFilters = {
  from: string;
  to: string;
  property: string;
  bookingPage: number;
  paymentPage: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isDateString(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function normalizeReportFilters(params: SearchParams, now = new Date()): ReportFilters {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
  let from = first(params.from);
  let to = first(params.to);
  from = isDateString(from) ? from : monthStart;
  to = isDateString(to) ? to : monthEnd;
  if (from > to) [from, to] = [to, from];

  return {
    from,
    to,
    property: first(params.property)?.trim() ?? "",
    bookingPage: parsePage(first(params.bookingPage)),
    paymentPage: parsePage(first(params.paymentPage)),
  };
}

function jsonToSourceRecord(value: Prisma.JsonValue): SourceRecord {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error("A stored report row does not contain a JSON object.");
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      item === null ? "" : typeof item === "string" ? item : String(item),
    ]),
  );
}

function dateBounds(filters: ReportFilters) {
  const start = new Date(`${filters.from}T00:00:00.000Z`);
  const endExclusive = new Date(`${filters.to}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { start, endExclusive };
}

function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE));
}

const emptyResult = (filters: ReportFilters, notice: string) => ({
  bookings: [],
  payments: [],
  properties: [],
  filters: { ...filters, bookingPage: 1, paymentPage: 1 },
  bookingTotal: 0,
  paymentTotal: 0,
  bookingPageCount: 1,
  paymentPageCount: 1,
  summary: { revenue: "0.00", paid: "0.00", outstanding: "0.00", activeBookings: 0 },
  notice,
});

export async function getReports(filters: ReportFilters) {
  const { start, endExclusive } = dateBounds(filters);
  const bookingWhere: Prisma.BookingWhereInput = {
    deleted_at: null,
    arrival_date: { gte: start, lt: endExclusive },
    ...(filters.property ? { property_name: filters.property } : {}),
  };
  const paymentWhere: Prisma.PaymentWhereInput = {
    deleted_at: null,
    payment_date: { gte: start, lt: endExclusive },
    ...(filters.property ? { property_name: filters.property } : {}),
  };

  try {
    const [bookingStats, paymentTotal, bookingPropertyGroups, paymentPropertyGroups] =
      await Promise.all([
      prisma.$queryRaw<
        Array<{
          booking_total: number;
          revenue: string;
          paid: string;
          outstanding: string;
          active_bookings: number;
        }>
      >(Prisma.sql`
        SELECT
          COUNT(*)::int AS booking_total,
          COALESCE(SUM(total_amount), 0)::text AS revenue,
          COALESCE(SUM(paid_amount), 0)::text AS paid,
          COALESCE(SUM(GREATEST(total_amount - paid_amount, 0)), 0)::text AS outstanding,
          COUNT(*) FILTER (
            WHERE booking_status IS NULL
              OR LOWER(booking_status) NOT IN ('canceled', 'cancelled')
          )::int AS active_bookings
        FROM bookings
        WHERE deleted_at IS NULL
          AND arrival_date >= ${start}
          AND arrival_date < ${endExclusive}
          ${filters.property ? Prisma.sql`AND property_name = ${filters.property}` : Prisma.empty}
      `),
      prisma.payment.count({ where: paymentWhere }),
      prisma.booking.groupBy({
        by: ["property_name"],
        where: { deleted_at: null, property_name: { not: null } },
        orderBy: { property_name: "asc" },
      }),
      prisma.payment.groupBy({
        by: ["property_name"],
        where: { deleted_at: null, property_name: { not: null } },
        orderBy: { property_name: "asc" },
      }),
    ]);

    const bookingTotal = bookingStats[0]?.booking_total ?? 0;
    const bookingPageCount = pageCount(bookingTotal);
    const paymentPageCount = pageCount(paymentTotal);
    const bookingPage = Math.min(filters.bookingPage, bookingPageCount);
    const paymentPage = Math.min(filters.paymentPage, paymentPageCount);

    const [bookingRecords, paymentRecords] = await Promise.all([
      prisma.booking.findMany({
        where: bookingWhere,
        orderBy: [{ arrival_date: { sort: "desc", nulls: "last" } }, { id: "asc" }],
        skip: (bookingPage - 1) * REPORT_PAGE_SIZE,
        take: REPORT_PAGE_SIZE,
      }),
      prisma.payment.findMany({
        where: paymentWhere,
        orderBy: [{ payment_date: { sort: "desc", nulls: "last" } }, { id: "asc" }],
        skip: (paymentPage - 1) * REPORT_PAGE_SIZE,
        take: REPORT_PAGE_SIZE,
      }),
    ]);

    const bookingReferences = bookingRecords.map((booking) => booking.booking_reference);
    const relatedPayments = bookingReferences.length
      ? await prisma.payment.findMany({
          where: {
            deleted_at: null,
            booking_reference: { in: bookingReferences },
            payment_date: { gte: start, lt: endExclusive },
          },
          select: { source_data: true },
        })
      : [];

    const bookingSources: BookingSource[] = bookingRecords.map((booking) => ({
      source: jsonToSourceRecord(booking.source_data),
      internalCompany: booking.internal_company,
    }));
    const paymentSources: PaymentSource[] = relatedPayments.map((payment) => ({
      source: jsonToSourceRecord(payment.source_data),
    }));
    const pagePaymentSources: PaymentSource[] = paymentRecords.map((payment) => ({
      source: jsonToSourceRecord(payment.source_data),
    }));
    const stats = bookingStats[0];

    const properties = [
      ...new Set(
        [...bookingPropertyGroups, ...paymentPropertyGroups]
          .map((group) => group.property_name?.trim())
          .filter((property): property is string => Boolean(property)),
      ),
    ].sort((left, right) => left.localeCompare(right));

    return {
      bookings: buildBookingReportRows(bookingSources, paymentSources),
      payments: buildPaymentReportRows(pagePaymentSources),
      properties,
      filters: { ...filters, bookingPage, paymentPage },
      bookingTotal,
      paymentTotal,
      bookingPageCount,
      paymentPageCount,
      summary: {
        revenue: stats?.revenue ?? "0.00",
        paid: stats?.paid ?? "0.00",
        outstanding: stats?.outstanding ?? "0.00",
        activeBookings: stats?.active_bookings ?? 0,
      },
      notice: "Live report data",
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return emptyResult(filters, "Database schema is not ready; no report data is being displayed.");
    }
    throw error;
  }
}
