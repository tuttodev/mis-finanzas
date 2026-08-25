import type { ParsedColillaItem, ParsedColillaSummary } from '@/types/finance';

const MONTH_NAMES: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

const DEVENGOS_KEYWORDS = [
  'sueldo',
  'salario',
  'basico',
  'básico',
  'conectividad',
  'transporte',
  'auxilio',
  'bono',
  'bonificaci',
  'comisi',
  'prima',
  'recargo',
  'hora extra',
  'horas extra',
  'vacacion',
  'incapacidad',
  'retroactivo',
  'alimentaci',
  'cesantia',
  'cesantía',
  'interes',
  'deveng',
  'ingreso',
  'haber',
  'rodamiento',
  'viatico',
  'viático',
];

const DEDUCCIONES_KEYWORDS = [
  'salud',
  'pension',
  'pensión',
  'solidaridad',
  'fsp',
  'retefuente',
  'retenci',
  'fuente',
  'libranza',
  'fondo',
  'cooperativa',
  'embargo',
  'seguro',
  'ahorro',
  'descuento',
  'deducci',
  'prestamo',
  'préstamo',
  'sancion',
  'sanción',
  'afc',
  'voluntari',
  'exequial',
  'sindicato',
];

const IGNORE_PATTERNS = [
  /^p[aá]gina/i,
  /^nit/i,
  /^cc\b/i,
  /^c[eé]dula/i,
  /^documento/i,
  /^cargo/i,
  /^cuenta\b/i,
  /^banco\b/i,
  /^contrato/i,
  /^eps\b/i,
  /^afp\b/i,
  /^arl\b/i,
  /^caja\b/i,
  /^dias\b/i,
  /^d[íi]as\b/i,
  /^horas\b/i,
  /^tarifa\b/i,
  /^porcentaje\b/i,
  /^total\s/i,
  /^suma\s/i,
  /^neto\b/i,
  /^periodo\b/i,
  /^fecha\b/i,
  /^concepto\b/i,
  /^descripcion\b/i,
  /^c[oó]digo\b/i,
];

export function parseCOPNumber(raw: string): number | null {
  if (!raw) return null;
  // Clean string: remove $, COP, non-numeric except . and , and -
  let clean = raw.replace(/[^\d.,-]/g, '').trim();
  if (!clean || clean === '-' || clean === '.' || clean === ',') return null;

  const isNegative = clean.startsWith('-');
  if (isNegative) clean = clean.slice(1);

  // If both dot and comma exist:
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');

  let numStr = clean;
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // E.g. 1.234.567,89 -> dot is thousand, comma is decimal
      numStr = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // E.g. 1,234,567.89 -> comma is thousand, dot is decimal
      numStr = clean.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Only comma
    const parts = clean.split(',');
    if (parts.length > 2) {
      // Multiple commas e.g. 1,234,567 -> thousands
      numStr = clean.replace(/,/g, '');
    } else if (parts[1]?.length === 3 && parts[0].length <= 3) {
      // E.g. 150,000 -> thousands
      numStr = clean.replace(/,/g, '');
    } else if (parts[1]?.length <= 2) {
      // E.g. 150,50 -> decimals
      numStr = parts[0] + '.' + parts[1];
    } else {
      numStr = clean.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    // Only dot
    const parts = clean.split('.');
    if (parts.length > 2) {
      // Multiple dots e.g. 1.234.567 -> thousands
      numStr = clean.replace(/\./g, '');
    } else if (parts[1]?.length === 3 && parts[0].length <= 3) {
      // E.g. 150.000 -> thousands
      numStr = clean.replace(/\./g, '');
    } else if (parts[1]?.length <= 2) {
      // E.g. 150.50 -> decimals
      numStr = clean;
    } else {
      numStr = clean.replace(/\./g, '');
    }
  }

  const result = parseFloat(numStr);
  if (isNaN(result)) return null;
  return isNegative ? -result : result;
}

function cleanConceptName(name: string): string {
  return name
    .replace(/^[\d\s\-.:]+/, '') // Remove leading codes e.g. "001 - " or "1001 "
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function isIgnoreLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) return true;
  return IGNORE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function detectMonthKey(text: string): { monthKey: string | null; period: string | null; payDate: string | null } {
  let monthKey: string | null = null;
  let period: string | null = null;
  let payDate: string | null = null;

  // Search for month names and years: e.g. "Agosto 2026" or "Agosto de 2026"
  const monthMatch = text.match(
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de)?\s+(202\d)\b/i,
  );
  if (monthMatch) {
    const monthNum = MONTH_NAMES[monthMatch[1].toLowerCase()];
    const year = monthMatch[2];
    if (monthNum && year) {
      monthKey = `${year}-${monthNum}`;
      period = `${monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1)} ${year}`;
    }
  }

  // Search for date patterns: DD/MM/YYYY
  const dateMatches = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](202\d)\b/g);
  if (dateMatches && dateMatches.length > 0) {
    const lastDate = dateMatches[dateMatches.length - 1];
    const parts = lastDate.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      payDate = `${year}-${month}-${day}`;
      if (!monthKey) {
        monthKey = `${year}-${month}`;
        period = `${month}/${year}`;
      }
    }
  }

  return { monthKey, period, payDate };
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Load the Node-only PDF.js runtime only when an upload is processed. This
  // prevents native canvas dependencies from being evaluated while Next.js
  // builds the route module.
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });

  try {
    const data = await parser.getText();
    return data.text || '';
  } finally {
    await parser.destroy();
  }
}

export function parseColillaText(text: string): ParsedColillaSummary {
  const { monthKey, period, payDate } = detectMonthKey(text);

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let totalDevengado = 0;
  let totalDeducciones = 0;
  let netoPagar = 0;

  // Extract totals if present in text
  for (const line of lines) {
    const lower = line.toLowerCase();
    // Total Devengado
    if (
      (lower.includes('total devengado') || lower.includes('total devengos') || lower.includes('total ingresos') || lower.includes('suma devengos')) &&
      !lower.includes('deducci')
    ) {
      const numbers = extractNumbersFromLine(line);
      if (numbers.length > 0) {
        totalDevengado = Math.max(...numbers);
      }
    }

    // Total Deducciones
    if (
      lower.includes('total deducci') ||
      lower.includes('total descuentos') ||
      lower.includes('total egresos') ||
      lower.includes('suma deducci')
    ) {
      const numbers = extractNumbersFromLine(line);
      if (numbers.length > 0) {
        totalDeducciones = Math.max(...numbers);
      }
    }

    // Neto a pagar
    if (
      lower.includes('neto a pagar') ||
      lower.includes('total a pagar') ||
      lower.includes('neto pagado') ||
      lower.includes('total neto') ||
      lower.includes('valor a pagar') ||
      lower.includes('neto a consignar')
    ) {
      const numbers = extractNumbersFromLine(line);
      if (numbers.length > 0) {
        netoPagar = Math.max(...numbers);
      }
    }
  }

  const devengos: ParsedColillaItem[] = [];
  const deducciones: ParsedColillaItem[] = [];

  // Parse lines
  let currentSection: 'devengos' | 'deducciones' | 'unknown' = 'unknown';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Section header detection
    if (
      (lower === 'devengados' ||
        lower === 'devengos' ||
        lower === 'ingresos' ||
        lower === 'haberes' ||
        lower.startsWith('conceptos devengados') ||
        lower.startsWith('ingresos de nómina')) &&
      !lower.includes('total')
    ) {
      currentSection = 'devengos';
      continue;
    }

    if (
      (lower === 'deducciones' ||
        lower === 'descuentos' ||
        lower === 'egresos' ||
        lower.startsWith('conceptos deducidos') ||
        lower.startsWith('descuentos de nómina')) &&
      !lower.includes('total')
    ) {
      currentSection = 'deducciones';
      continue;
    }

    if (isIgnoreLine(line)) continue;

    // Check if line contains a recognizable item
    const parsedItem = parseLineToItem(line, currentSection);
    if (!parsedItem) continue;

    if (parsedItem.kind === 'income') {
      // Avoid duplicate or total line
      if (!isTotalOrSubtotal(parsedItem.name)) {
        devengos.push(parsedItem);
      }
    } else if (parsedItem.kind === 'deduction') {
      if (!isTotalOrSubtotal(parsedItem.name)) {
        deducciones.push(parsedItem);
      }
    }
  }

  // Calculate sum of extracted items
  const sumDevengos = devengos.reduce((sum, item) => sum + item.amount, 0);
  const sumDeducciones = deducciones.reduce((sum, item) => sum + item.amount, 0);

  if (totalDevengado === 0) totalDevengado = sumDevengos;
  if (totalDeducciones === 0) totalDeducciones = sumDeducciones;
  if (netoPagar === 0) netoPagar = totalDevengado - totalDeducciones;

  return {
    period,
    monthKey,
    payDate,
    devengos,
    deducciones,
    totalDevengado,
    totalDeducciones,
    netoPagar,
    rawText: text.slice(0, 2000),
  };
}

function isTotalOrSubtotal(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.startsWith('total') ||
    lower.startsWith('subtotal') ||
    lower.startsWith('suma') ||
    lower.startsWith('neto') ||
    lower.includes('a pagar') ||
    lower.includes('a consignar')
  );
}

function extractNumbersFromLine(line: string): number[] {
  // Matches currency amounts e.g. $ 1.234.567,00 or 1.234.567 or 1,234,567.00
  const numberTokens = line.match(/(?:[\$]|COP\s*)?[\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g);
  if (!numberTokens) return [];

  const results: number[] = [];
  for (const token of numberTokens) {
    const num = parseCOPNumber(token);
    if (num !== null && num > 0) {
      results.push(num);
    }
  }
  return results;
}

function parseLineToItem(
  line: string,
  currentSection: 'devengos' | 'deducciones' | 'unknown',
): ParsedColillaItem | null {
  // Find potential amount in the line
  // Typical line: "001 Sueldo Básico 30 9.000.000" or "Salud 4% 360.000" or "Auxilio Conectividad 162.000"
  const tokens = line.split(/\s{2,}|\t/); // Split by multiple spaces or tabs if table
  
  let concept = '';
  let amount = 0;

  if (tokens.length >= 2) {
    concept = tokens[0];
    const lastToken = tokens[tokens.length - 1];
    const parsed = parseCOPNumber(lastToken);
    if (parsed !== null && parsed > 0) {
      amount = parsed;
    }
  }

  if (amount === 0) {
    // Try matching name and last numeric token from the end of the line
    const match = line.match(/^(.*?)(?:[\$]|COP\s*)?(\b[\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*$/);
    if (match) {
      concept = match[1];
      const parsed = parseCOPNumber(match[2]);
      if (parsed !== null && parsed > 0) {
        amount = parsed;
      }
    }
  }

  if (!concept || amount <= 0) return null;

  const cleanedName = cleanConceptName(concept);
  if (cleanedName.length < 3) return null;

  // Determine kind: income vs deduction
  let kind: 'income' | 'deduction' = 'income';

  if (currentSection === 'deducciones') {
    kind = 'deduction';
  } else if (currentSection === 'devengos') {
    kind = 'income';
  } else {
    // Keyword heuristic
    const isDevengo = matchesKeywords(cleanedName, DEVENGOS_KEYWORDS);
    const isDeduccion = matchesKeywords(cleanedName, DEDUCCIONES_KEYWORDS);

    if (isDeduccion && !isDevengo) {
      kind = 'deduction';
    } else {
      kind = 'income';
    }
  }

  return {
    id: `item-${Math.random().toString(36).slice(2, 9)}`,
    name: cleanedName,
    amount,
    kind,
    originalText: line,
    selected: true,
  };
}
