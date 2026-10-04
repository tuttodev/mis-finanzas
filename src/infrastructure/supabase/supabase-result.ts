type SupabaseError = { message: string } | null;

/** Returns the row(s) of a Supabase response or throws its error. */
export function ensureData<T>(data: T | null, error: SupabaseError): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No se encontró información');
  return data;
}

/** Throws the error of a Supabase response that returns no rows. */
export function ensureSuccess(error: SupabaseError): void {
  if (error) throw new Error(error.message);
}
