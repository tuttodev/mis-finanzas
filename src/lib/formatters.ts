export const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
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

export function formatCOPInput(value: string | number) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';

    return value.toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const sanitized = value.trim().replace(/[^\d.,]/g, '');
  if (!sanitized) return '';

  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');
  let decimalIndex = lastComma;

  if (lastDot > lastComma) {
    const digitsAfterDot = sanitized.slice(lastDot + 1).replace(/\D/g, '').length;
    const dotCount = sanitized.match(/\./g)?.length ?? 0;
    const dotIsDecimal =
      lastComma >= 0 ||
      digitsAfterDot === 0 ||
      digitsAfterDot < 3 ||
      (dotCount > 1 && digitsAfterDot <= 2);

    decimalIndex = dotIsDecimal ? lastDot : -1;
  }

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
  const groupedInteger = normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return decimalIndex >= 0 ? `${groupedInteger},${fractionDigits}` : groupedInteger;
}

export function formatCOPCompact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions.toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}M`;
  }
  if (abs >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands.toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}K`;
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
  const formatted = formatCOPInput(value);
  const normalized = formatted
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return roundCurrencyAmount(amount);
}

export function roundCurrencyAmount(value: number) {
  const sign = value < 0 ? -1 : 1;
  return sign * (Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100);
}
