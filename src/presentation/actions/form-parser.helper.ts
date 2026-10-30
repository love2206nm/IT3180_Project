/**
 * @file form-parser.helper.ts
 * @description Tiện ích chuyển đổi dữ liệu đầu vào linh hoạt (Hybrid Input: Plain Object DTO hoặc FormData).
 * Tự động chuyển đổi các giá trị từ FormData (chuỗi rỗng, mảng JSON, số coerced) thành Plain Object để Zod Schema thẩm định.
 * @module presentation/actions/form-parser.helper
 */

/**
 * Kiểm tra xem một đối tượng có phải là FormData hay không (tương thích đa môi trường).
 * @param {unknown} value Giá trị cần kiểm tra
 * @returns {boolean}
 */
export function isFormData(value: unknown): value is FormData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { entries?: unknown }).entries === 'function'
  );
}

/**
 * Chuyển đổi dữ liệu đầu vào (DTO hoặc FormData) sang Plain Object chuẩn để Zod parse.
 * - Chuỗi rỗng `""` được chuyển thành `undefined` để không làm đứt validation của các trường optional.
 * - Chuỗi JSON hợp lệ (ví dụ mảng ID: `'["1","2"]'`) được tự động parse sang Array.
 * - Hỗ trợ gom nhóm nhiều giá trị cùng tên khóa thành Array (ví dụ nhiều checkbox hoặc file).
 *
 * @template T Kiểu dữ liệu mong đợi
 * @param {T | FormData} input Dữ liệu thô từ Client (Server Action)
 * @returns {Record<string, unknown>} Plain Object chuẩn hóa
 */
export function parseActionInput<T>(input: T | FormData): Record<string, unknown> {
  if (!isFormData(input)) {
    if (typeof input === 'object' && input !== null) {
      return input as unknown as Record<string, unknown>;
    }
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of input.entries()) {
    // Nếu là chuỗi, xử lý chuỗi rỗng và chuỗi JSON
    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed === '') {
        // Bỏ qua hoặc gán undefined để schema optional() nhận diện đúng
        continue;
      }

      // Tự động giải mã nếu là JSON Array hoặc JSON Object hợp lệ
      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try {
          result[key] = JSON.parse(trimmed);
          continue;
        } catch {
          // Nếu parse lỗi thì giữ nguyên chuỗi
        }
      }

      // Xử lý giá trị trùng lặp thành mảng
      if (key in result) {
        const existing = result[key];
        if (Array.isArray(existing)) {
          existing.push(trimmed);
        } else {
          result[key] = [existing, trimmed];
        }
      } else {
        result[key] = trimmed;
      }
    } else {
      // Giá trị là File / Blob
      if (key in result) {
        const existing = result[key];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          result[key] = [existing, value];
        }
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}
