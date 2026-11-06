import { Sql } from '../scheduling/scheduling';

// Platform admin işlemlerini AdminIslem tablosuna yazar.
// Önceki ve yeni değer JSON olarak saklanır; null ise o taraf boş bırakılır.
export async function audit(
  sql: Sql,
  adminId: number,
  islem: string,
  hedefTablo: string,
  hedefId: string | number,
  onceki: object | null,
  yeni: object | null,
): Promise<void> {
  await sql(
    `INSERT INTO "AdminIslem" ("adminId", islem, "hedefTablo", "hedefId", "oncekiDeger", "yeniDeger")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      adminId,
      islem,
      hedefTablo,
      String(hedefId),
      onceki === null ? null : JSON.stringify(onceki),
      yeni === null ? null : JSON.stringify(yeni),
    ],
  );
}
