import { ApiRoute } from '@/shared/http/api-route.enum';
import { MimeType } from '@/shared/http/mime-type.enum';
import type { ParseColillaResponse } from '../../domain/plan.types';
import type { PayslipParserGateway } from '../payroll-documents.repository';

/** Sends a payslip PDF to the app's parsing route handler. */
export class HttpPayslipParserGateway implements PayslipParserGateway {
  async parse(file: File, accessToken: string): Promise<ParseColillaResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(ApiRoute.ParseColilla, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const responseBody = await response.text();
    let json: ParseColillaResponse | null = null;

    if (contentType.includes(MimeType.Json)) {
      try {
        json = JSON.parse(responseBody) as ParseColillaResponse;
      } catch {
        // Fall through to the generic server error below.
      }
    }

    if (!json) {
      throw new Error(
        response.status >= 500
          ? 'El servidor no pudo procesar el PDF. Revisa los registros del servidor e inténtalo de nuevo.'
          : 'La respuesta del servidor no fue válida. Inténtalo de nuevo.',
      );
    }

    if (!response.ok || !json.success || !json.data) {
      throw new Error(json.error || 'No se pudo procesar la colilla');
    }

    return json;
  }
}
