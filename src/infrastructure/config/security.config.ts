/**
 * @file security.config.ts
 * @description Định nghĩa các hằng số và cấu hình HTTP Security Headers chuẩn OWASP phòng thủ biên.
 * Bảo vệ chống tấn công Clickjacking, MIME-Sniffing, XSS, và ép buộc kết nối an toàn qua HTTPS.
 * @module infrastructure/config
 */

export interface SecurityHeaderItem {
  readonly key: string;
  readonly value: string;
}

/**
 * Danh mục HTTP Response Security Headers chuẩn OWASP phòng thủ biên.
 */
export const SECURITY_HEADERS: readonly SecurityHeaderItem[] = Object.freeze([
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none';",
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
]);
