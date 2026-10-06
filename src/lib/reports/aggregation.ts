import Decimal from "decimal.js";

export const BOOKING_HEADERS = [
  "Property",
  "Booking Date",
  "Booking Reference",
  "Order Reference",
  "OTA Reference",
  "Group",
  "Guest First Name",
  "Guest Last Name",
  "Check In",
  "Check Out",
  "Nights",
  "Room/Unit Type",
  "Rate Plan",
  "Room/Unit Name",
  "Beds",
  "Adults",
  "Children",
  "Currency",
  "Total Revenue",
  "Paid Amount",
  "Room/Unit Revenue",
  "Other Revenue",
  "Method",
  "Source",
  "Channel",
  "Payment Method",
  "Booking Status",
  "Arrival",
  "Guest Email",
  "Guest Phone 1",
  "Guest Phone 2",
  "Booking Notes",
  "Extras Booked Online",
  "Promo Name",
  "Promo Code",
  "Promo Discount",
  "Booking Date and Time",
  "CompanyName",
  "MemberId",
  "Tag",
] as const;

export const PAYMENT_HEADERS = [
  "ReceivedDateTime",
  "PaymentID",
  "Forename",
  "GroupReference",
  "Company",
  "business_name",
  "RoomId",
  "OrderReference",
  "BookingReference",
  "transferred",
  "Textbox24",
  "BookedDate",
  "CheckinDatetime",
  "CheckoutDatetime",
  "channel",
  "channelreference",
  "PaymentType2",
  "PaymentMethod",
  "CardType",
  "CardLast4Digits",
  "IsVirtual",
  "Description",
  "UserName",
  "LastUpdatedDateTime",
  "GWStart",
  "GWEnd",
  "GatewayReference",
  "SettledAmount",
  "SettledDate",
  "Card1",
  "Cash1",
  "Vouchers1",
  "Textbox29",
  "OTAPrepaid1",
  "Eviivo",
  "OnAccount",
  "Direct1",
] as const;

export const PAYMENT_METHOD_COLUMNS = [
  "Cash",
  "Card",
  "Bank Transfer",
  "On Account",
  "Prepaid",
  "External Card",
  "PayPal",
] as const;

export type PaymentMethodColumn = (typeof PAYMENT_METHOD_COLUMNS)[number];
export type SourceRecord = Record<string, string>;

export type BookingSource = {
  source: SourceRecord;
  internalCompany?: string | null;
};

export type PaymentSource = {
  source: SourceRecord;
};

export type BookingReportRow = {
  id: string;
  source: SourceRecord;
  internalCompany: string;
  paymentTotals: Record<PaymentMethodColumn, string>;
  transactionTotal: string;
  dueAmount: string;
  balanceStatus: "Paid" | "Partially paid" | "Unpaid";
};

export type PaymentReportRow = {
  id: string;
  source: SourceRecord;
};

export function parseDecimalAmount(value: string, fieldName: string) {
  const raw = value.trim();
  if (!raw) return new Decimal(0);

  const negativeParentheses = /^\(.*\)$/.test(raw);
  const normalized = raw.replace(/[£$€,\s()]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid monetary value in "${fieldName}".`);
  }

  const amount = new Decimal(normalized);
  return negativeParentheses ? amount.abs().negated() : amount;
}

export function cleanBookingRecord(record: SourceRecord) {
  const source = { ...record };
  const bookingStatus = source["Booking Status"]?.trim().toLocaleLowerCase();
  const sourceTotal = parseDecimalAmount(source["Total Revenue"] ?? "", "Total Revenue");
  const sourcePaid = parseDecimalAmount(source["Paid Amount"] ?? "", "Paid Amount");

  if (bookingStatus === "canceled" && sourceTotal.isZero() && sourcePaid.isZero()) {
    return { dropped: true as const, source };
  }

  let otherRevenue = parseDecimalAmount(source["Other Revenue"] ?? "", "Other Revenue");
  if (otherRevenue.equals(100)) {
    source["Other Revenue"] = "";
    otherRevenue = new Decimal(0);
  }

  const roomRevenue = parseDecimalAmount(source["Room/Unit Revenue"] ?? "", "Room/Unit Revenue");
  const promoDiscount = source["Promo Discount"]?.trim()
    ? parseDecimalAmount(source["Promo Discount"], "Promo Discount").toFixed(2)
    : "";
  source["Total Revenue"] = roomRevenue.plus(otherRevenue).toFixed(2);
  source["Paid Amount"] = sourcePaid.toFixed(2);
  source["Room/Unit Revenue"] = roomRevenue.toFixed(2);
  source["Other Revenue"] = otherRevenue.isZero() ? "" : otherRevenue.toFixed(2);
  if (promoDiscount) source["Promo Discount"] = promoDiscount;
  return {
    dropped: false as const,
    source,
    totalRevenue: roomRevenue.plus(otherRevenue).toFixed(2),
    otherRevenue: otherRevenue.isZero() ? null : otherRevenue.toFixed(2),
    roomRevenue: roomRevenue.toFixed(2),
    paidAmount: sourcePaid.toFixed(2),
  };
}

const paymentMethodAliases: Record<string, PaymentMethodColumn> = {
  cash: "Cash",
  cash1: "Cash",
  card: "Card",
  card1: "Card",
  "credit card": "Card",
  "debit card": "Card",
  "bank transfer": "Bank Transfer",
  transfer: "Bank Transfer",
  onaccount: "On Account",
  "on account": "On Account",
  prepaid: "Prepaid",
  otaprepaid1: "Prepaid",
  externalcard: "External Card",
  "external card": "External Card",
  paypal: "PayPal",
};

export function normalizePaymentMethod(value: string): PaymentMethodColumn | null {
  return paymentMethodAliases[value.trim().toLocaleLowerCase()] ?? null;
}

export function buildBookingReportRows(
  bookings: BookingSource[],
  payments: PaymentSource[],
): BookingReportRow[] {
  const paymentsByBooking = new Map<string, PaymentSource[]>();

  for (const payment of payments) {
    const bookingReference = payment.source.BookingReference?.trim();
    if (!bookingReference) continue;
    const existing = paymentsByBooking.get(bookingReference) ?? [];
    existing.push(payment);
    paymentsByBooking.set(bookingReference, existing);
  }

  return bookings.map(({ source: originalSource, internalCompany }) => {
    const cleaned = cleanBookingRecord(originalSource);
    if (cleaned.dropped) return null;
    const source = cleaned.source;
    const paymentTotals = Object.fromEntries(
      PAYMENT_METHOD_COLUMNS.map((method) => [method, new Decimal(0)]),
    ) as Record<PaymentMethodColumn, Decimal>;

    for (const { source: payment } of paymentsByBooking.get(source["Booking Reference"]?.trim() ?? "") ?? []) {
      const method = normalizePaymentMethod(payment.PaymentMethod ?? "");
      if (method) {
        paymentTotals[method] = paymentTotals[method].plus(
          parseDecimalAmount(payment.Direct1 ?? "", "Direct1"),
        );
      }
    }

    const transactionTotal = PAYMENT_METHOD_COLUMNS.reduce(
      (sum, method) => sum.plus(paymentTotals[method]),
      new Decimal(0),
    );
    const bookingPaidAmount = parseDecimalAmount(source["Paid Amount"] ?? "", "Paid Amount");
    const dueAmount = Decimal.max(
      new Decimal(cleaned.totalRevenue).minus(bookingPaidAmount),
      0,
    );

    return {
      id: source["Booking Reference"] ?? "",
      source,
      internalCompany: internalCompany ?? "",
      paymentTotals: Object.fromEntries(
        PAYMENT_METHOD_COLUMNS.map((method) => [method, paymentTotals[method].toFixed(2)]),
      ) as Record<PaymentMethodColumn, string>,
      transactionTotal: transactionTotal.toFixed(2),
      dueAmount: dueAmount.toFixed(2),
      balanceStatus: dueAmount.isZero()
        ? "Paid"
        : bookingPaidAmount.isZero()
          ? "Unpaid"
          : "Partially paid",
    };
  }).filter((row): row is BookingReportRow => row !== null);
}

export function buildPaymentReportRows(payments: PaymentSource[]): PaymentReportRow[] {
  return payments.map(({ source }) => ({
    id: source.PaymentID || `${source.BookingReference ?? ""}-${source.ReceivedDateTime ?? ""}`,
    source,
  }));
}
