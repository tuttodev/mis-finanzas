/** PostgreSQL error codes that the repositories translate into user-facing errors. */
export enum PostgresErrorCode {
  UniqueViolation = '23505',
  ForeignKeyViolation = '23503',
}
