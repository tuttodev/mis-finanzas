export const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

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

export function formatCOP(value: number) {
  return copFormatter.format(value);
}

export function formatCOPCompact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions.toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands.toLocaleString('es-CO', { maximumFractionDigits: 0 })}K`;
  }
  return formatCOP(value);
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

export function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function parseCurrencyInput(value: string) {
  const normalized = value
    .trim()
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}
