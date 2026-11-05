// PostgreSQL hata kodları
export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';

export function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code;
}
