/**
 * @file common-validators.ts
 * @description Các Zod Schemas và hàm kiểm tra dữ liệu bảo mật dùng chung (chống XSS, SSRF, DoS).
 * @module application/dtos
 */

import { z } from 'zod';
import { DELIVERY_CONSTRAINTS } from '../../domain/constants/delivery-constraints.constant';

/**
 * Regex phát hiện các ký tự thẻ HTML hoặc ký tự nhúng mã độc nguy hiểm (<, >, {, }).
 */
const DANGEROUS_XSS_REGEX = /[<>{}]/;

/**
 * Tạo Zod String Schema an toàn cho các trường văn bản tự do (chống Stored XSS).
 *
 * @param min Độ dài tối thiểu (mặc định 0)
 * @param max Độ dài tối đa (mặc định 500)
 * @param fieldName Tên trường để hiển thị thông báo lỗi thân thiện
 */
export function createSafeTextSchema(min: number = 0, max: number = 500, fieldName: string = 'Trường này'): z.ZodString {
  let schema = z.string().trim();
  if (min > 0) {
    schema = schema.min(min, `${fieldName} phải có ít nhất ${min} ký tự`);
  }
  schema = schema.max(max, `${fieldName} không được vượt quá ${max} ký tự`);

  return schema.refine((val) => !DANGEROUS_XSS_REGEX.test(val), {
    message: `${fieldName} không được chứa các ký tự đặc biệt nguy hiểm (<, >, {, })`,
  });
}

/**
 * Schema xác thực URL ảnh bằng chứng giao hàng POD (chống SSRF và Localhost/Intranet Exfiltration).
 * Chỉ chấp nhận giao thức HTTPS và các domain nằm trong danh sách Whitelist chính thức.
 */
export const ProofImageUrlSchema = z
  .string()
  .trim()
  .url('Đường dẫn ảnh POD không đúng định dạng URL')
  .refine(
    (urlStr: string) => {
      try {
        const parsed = new URL(urlStr);

        // 1. Kiểm tra protocol: Bắt buộc HTTPS (trừ localhost dùng khi test local)
        const isLocalhost = parsed.hostname === 'localhost';
        if (!isLocalhost && parsed.protocol !== 'https:') {
          return false;
        }

        // 2. Chống port scanning mạng nội bộ (PostgreSQL 5432, Redis 6379, v.v.)
        if (parsed.port && parsed.port !== '80' && parsed.port !== '443' && parsed.port !== '3000') {
          return false;
        }

        // 3. Kiểm tra Whitelist domain lưu trữ hợp lệ
        const allowedHosts: readonly string[] = DELIVERY_CONSTRAINTS.ALLOWED_POD_DOMAINS;
        const isHostAllowed = allowedHosts.some(
          (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
        );

        return isHostAllowed;
      } catch {
        return false;
      }
    },
    {
      message: 'Đường dẫn ảnh POD phải sử dụng giao thức HTTPS và được tải lên từ máy chủ lưu trữ chính thức của hệ thống',
    }
  );
