import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdf, parseColillaText } from '@/lib/pdf-parser';
import type { ParseColillaResponse } from '@/types/finance';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse<ParseColillaResponse>> {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se ha proporcionado ningún archivo PDF.' },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'El archivo debe ser un documento PDF.' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const rawText = await extractTextFromPdf(buffer);
    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se pudo extraer texto del PDF. Asegúrate de que el documento no sea una imagen escaneada sin texto seleccionable.',
        },
        { status: 422 },
      );
    }

    const parsedData = parseColillaText(rawText);

    if (parsedData.devengos.length === 0 && parsedData.deducciones.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se detectaron conceptos de nómina (devengos o deducciones) en el PDF. Revisa que sea una colilla de pago válida.',
          data: parsedData,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado procesando el PDF';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
