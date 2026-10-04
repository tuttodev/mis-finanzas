import type { ParseColillaResponse, PayrollDocument } from '../domain/plan.types';

export interface PayrollDocumentsRepository {
  upload(params: { userId: string; planId: string; file: File }): Promise<PayrollDocument>;
  list(planId: string): Promise<PayrollDocument[]>;
  createSignedUrl(storagePath: string): Promise<string>;
  download(storagePath: string): Promise<Blob>;
}

export interface PayslipParserGateway {
  /** Extracts payroll concepts from a payslip PDF on the server. */
  parse(file: File, accessToken: string): Promise<ParseColillaResponse>;
}
