import type { Currency } from '@/types/finance';

export const CURRENCIES: Array<{ code: Currency; label: string }> = [
  { code: 'COP', label: 'Peso colombiano' },
  { code: 'PEN', label: 'Sol peruano' },
  { code: 'USD', label: 'Dólar estadounidense' },
  { code: 'EUR', label: 'Euro' },
];

const currencyLocales: Record<Currency, string> = {
  COP: 'es-CO',
  PEN: 'es-PE',
  USD: 'en-US',
  EUR: 'es-ES',
};

const currencyFormatters = Object.fromEntries(
  CURRENCIES.map(({ code }) => [code, new Intl.NumberFormat(currencyLocales[code], {
    style: 'currency', currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2,
  })]),
) as Record<Currency, Intl.NumberFormat>;

export const shortDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const shortDateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const longDateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatCOP(value: number) {
  return formatCurrency(value, 'COP');
}

export function formatCurrency(value: number, currency: Currency) {
  return currencyFormatters[currency].format(value);
}

export function formatCurrencyInput(value: string | number, currency: Currency = 'COP') {
  const locale = currencyLocales[currency];
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
  const group = parts.find((part) => part.type === 'group')?.value ?? ',';
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';

    return value.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const sanitized = value.trim().replace(/[^\d.,]/g, '');
  if (!sanitized) return '';

  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');
  const lastSeparator = Math.max(lastComma, lastDot);
  const separator = sanitized[lastSeparator];
  const digitsAfter = lastSeparator < 0 ? 0 : sanitized.slice(lastSeparator + 1).replace(/\D/g, '').length;
  const hasOtherSeparator = lastComma >= 0 && lastDot >= 0;
  const decimalIndex = lastSeparator >= 0
    && !(separator === group && digitsAfter === 3 && !hasOtherSeparator)
    ? lastSeparator : -1;

  const integerDigits = (decimalIndex >= 0
    ? sanitized.slice(0, decimalIndex)
    : sanitized
  ).replace(/\D/g, '');
  const fractionDigits =
    decimalIndex >= 0
      ? sanitized
          .slice(decimalIndex + 1)
          .replace(/\D/g, '')
          .slice(0, 2)
      : '';

  const normalizedInteger = (integerDigits || '0').replace(/^0+(?=\d)/, '');
  const groupedInteger = normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, group);

  return decimalIndex >= 0 ? `${groupedInteger}${decimal}${fractionDigits}` : groupedInteger;
}

export function formatCOPInput(value: string | number) {
  return formatCurrencyInput(value, 'COP');
}

export function formatCurrencyCompact(value: number, currency: Currency) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${currency} ${millions.toLocaleString(currencyLocales[currency], {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}M`;
  }
  if (abs >= 1_000) {
    const thousands = value / 1_000;
    return `${currency} ${thousands.toLocaleString(currencyLocales[currency], {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}K`;
  }
  return formatCurrency(value, currency);
}

export function formatCOPCompact(value: number) {
  return formatCurrencyCompact(value, 'COP');
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function parseDateValue(value: string) {
  // Date-only strings must be parsed as local dates, not UTC midnight
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(parseDateValue(value));
}

export function formatShortDateTime(value: string) {
  return shortDateTimeFormatter.format(parseDateValue(value));
}

export function formatDateGroupLabel(value: string) {
  const date = parseDateValue(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return 'Hoy';
  if (target.getTime() === yesterday.getTime()) return 'Ayer';

  return longDateFormatter.format(date);
}

export function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function toMonthKey(dateIso: string) {
  return `${dateIso.slice(0, 7)}-01`;
}

export function currentMonthKey() {
  return toMonthKey(todayIsoDate());
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-01`;
}

const monthTitleFormatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });

export function formatMonthTitle(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const label = monthTitleFormatter.format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function parseCurrencyInput(value: string, options?: { allowZero?: boolean; currency?: Currency }) {
  const currency = options?.currency ?? 'COP';
  const formatted = formatCurrencyInput(value, currency);
  const parts = new Intl.NumberFormat(currencyLocales[currency]).formatToParts(1234567.5);
  const group = parts.find((part) => part.type === 'group')?.value ?? ',';
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
  const normalized = formatted.replaceAll(group, '').replace(decimal, '.');

  const amount = Number(normalized);
  const minValid = options?.allowZero ? 0 : Number.EPSILON;
  if (!Number.isFinite(amount) || amount < minValid) {
    return null;
  }

  return roundCurrencyAmount(amount);
}

export function roundCurrencyAmount(value: number) {
  const sign = value < 0 ? -1 : 1;
  return sign * (Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100);
}
