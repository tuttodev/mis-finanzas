import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { StorageBucket } from '@/infrastructure/supabase/storage-bucket.enum';
import { ensureSuccess } from '@/infrastructure/supabase/supabase-result';
import { SupabaseTable } from '@/infrastructure/supabase/supabase-table.enum';
import { MimeType } from '@/shared/http/mime-type.enum';
import type { PayrollDocument } from '../../domain/plan.types';
import type { PayrollDocumentsRepository } from '../payroll-documents.repository';
import type { PayrollDocumentDTO } from './plan.dto';

/** Signed links to payroll documents expire after ten minutes. */
const SIGNED_URL_TTL_SECONDS = 10 * 60;

function mapPayrollDocument(dto: PayrollDocumentDTO): PayrollDocument {
  return {
    id: dto.id,
    planId: dto.plan_id,
    storagePath: dto.storage_path,
    originalName: dto.original_name,
    mimeType: dto.mime_type,
    fileSize: dto.file_size,
    createdAt: dto.created_at,
  };
}

export class SupabasePayrollDocumentsRepository implements PayrollDocumentsRepository {
  constructor(private readonly client: SupabaseClient) {}

  private get storage() {
    return this.client.storage.from(StorageBucket.PayrollDocuments);
  }

  async upload({ userId, planId, file }: { userId: string; planId: string; file: File }): Promise<PayrollDocument> {
    const storagePath = `${userId}/${planId}/${crypto.randomUUID()}.pdf`;

    const { error: uploadError } = await this.storage.upload(storagePath, file, {
      contentType: MimeType.Pdf,
      upsert: false,
    });
    ensureSuccess(uploadError);

    const { data, error: metadataError } = await this.client
      .from(SupabaseTable.PayrollDocuments)
      .insert({
        plan_id: planId,
        storage_path: storagePath,
        original_name: file.name,
        mime_type: MimeType.Pdf,
        file_size: file.size,
      })
      .select('*')
      .single();

    if (metadataError || !data) {
      await this.storage.remove([storagePath]);
      throw new Error(metadataError?.message ?? 'No se pudo registrar el documento');
    }

    return mapPayrollDocument(data as PayrollDocumentDTO);
  }

  async list(planId: string): Promise<PayrollDocument[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.PayrollDocuments)
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false });
    ensureSuccess(error);
    return ((data ?? []) as PayrollDocumentDTO[]).map(mapPayrollDocument);
  }

  async createSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await this.storage.createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? 'No se pudo generar el enlace del documento');
    }
    return data.signedUrl;
  }

  async download(storagePath: string): Promise<Blob> {
    const { data, error } = await this.storage.download(storagePath);
    if (error || !data) {
      throw new Error(error?.message ?? 'No se pudo descargar el documento');
    }
    return data;
  }
}
