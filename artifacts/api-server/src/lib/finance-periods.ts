export type FinancePeriod = "today" | "week" | "month" | "quarter" | "year" | "custom";

export type FinancePeriodRange = {
  start: string;
  end: string;
};

export type FinanceTransactionLike = {
  type: string;
  amount: string | number;
  transactionDate: string;
  farmId?: string | null;
};

function datePartsInTimeZone(now: Date, timeZone: string): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return [Number(values.year), Number(values.month), Number(values.day)];
}

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getFinancePeriodRange(
  period: FinancePeriod,
  options: { now?: Date; timeZone?: string; start?: string; end?: string } = {},
): FinancePeriodRange {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? "UTC";
  const [year, month, day] = datePartsInTimeZone(now, timeZone);
  const today = isoDate(year, month, day);

  if (period === "custom") {
    if (!options.start || !options.end || options.start > options.end) {
      throw new Error("Custom finance periods require a valid start and end date");
    }
    return { start: options.start, end: options.end };
  }

  if (period === "today") return { start: today, end: today };
  if (period === "month") return { start: isoDate(year, month, 1), end: isoDate(year, month, daysInMonth(year, month)) };
  if (period === "quarter") {
    const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const endMonth = startMonth + 2;
    return { start: isoDate(year, startMonth, 1), end: isoDate(year, endMonth, daysInMonth(year, endMonth)) };
  }
  if (period === "year") return { start: isoDate(year, 1, 1), end: isoDate(year, 12, 31) };

  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const start = addDays(today, -daysFromMonday);
  return { start, end: addDays(start, 6) };
}

export function summarizeFinanceTransactions(
  transactions: FinanceTransactionLike[],
  range: FinancePeriodRange,
  farmId?: string,
) {
  const scoped = transactions.filter((transaction) => {
    const inFarm = farmId === undefined || transaction.farmId === farmId;
    return inFarm && transaction.transactionDate >= range.start && transaction.transactionDate <= range.end;
  });

  const revenue = scoped.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const expenses = scoped.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    transactionCount: scoped.length,
    range,
  };
}
