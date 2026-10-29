/**
 * @file mapper-helpers.ts
 * @description Các hàm hỗ trợ chuyển đổi an toàn giữa kiểu dữ liệu của CSDL (BigInt, Decimal)
 * và kiểu dữ liệu của Domain Entities (string, number, Value Objects).
 * @module infrastructure/database/mappers
 */

/**
 * Chuyển đổi an toàn từ string hoặc number (Domain ID) sang BigInt (Prisma/PostgreSQL ID).
 * @param {string | number | null | undefined} value Giá trị ID từ domain
 * @returns {bigint | null} BigInt tương ứng hoặc null
 */
export function toBigInt(value: string | number | null | undefined): bigint | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return BigInt(value);
}

/**
 * Chuyển đổi an toàn từ BigInt (Prisma/PostgreSQL ID) sang chuỗi string (Domain ID).
 * Lý do: Số nguyên 64-bit trong PostgreSQL vượt quá Number.MAX_SAFE_INTEGER trong JS,
 * nên chuyển sang chuỗi string đảm bảo tuyệt đối không bị tràn số (overflow).
 * @param {bigint | null | undefined} value Giá trị BigInt từ database
 * @returns {string | null} Chuỗi ID hoặc null
 */
export function fromBigInt(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toString();
}

/**
 * Chuyển đổi an toàn từ Decimal (Prisma) sang số thực number trong TypeScript.
 * @param {unknown} value Giá trị Decimal từ database
 * @returns {number} Số thực hoặc 0 nếu không hợp lệ
 */
export function fromDecimal(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const decimalObj = value as { toNumber: () => number };
    return decimalObj.toNumber();
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}
