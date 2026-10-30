/**
 * @file delivery-constraints.constant.ts
 * @description Định nghĩa các ràng buộc và thông số cấu hình nghiệp vụ giao vận (chống magic numbers).
 * @module domain/constants
 */

export const DELIVERY_CONSTRAINTS = {
  /** Số lần giao hàng tối đa trước khi tự động chuyển hoàn */
  MAX_DELIVERY_ATTEMPTS: 3,

  /** Khối lượng tối thiểu của bưu kiện (gram) */
  MIN_WEIGHT_GRAM: 1,

  /** Khối lượng tối đa cho phép tiếp nhận tại trạm thông thường (50kg = 50,000g) */
  MAX_WEIGHT_GRAM: 50000,

  /** Hệ số quy đổi thể tích sang khối lượng tiêu chuẩn ngành bưu chính: (D x R x C cm) / 5000 */
  VOLUMETRIC_DIVISOR: 5000,

  /** Đơn vị tiền tệ chuẩn của hệ thống */
  DEFAULT_CURRENCY: 'VND',

  /** Độ dài tối đa của ghi chú đơn hàng */
  MAX_NOTES_LENGTH: 500,

  /** Dung lượng tối đa của ảnh bằng chứng giao hàng POD (5MB) */
  MAX_POD_FILE_SIZE_BYTES: 5 * 1024 * 1024,

  /** Số lần đăng nhập sai tối đa trước khi tạm khóa tài khoản */
  MAX_LOGIN_FAILED_ATTEMPTS: 5,

  /** Số tiền thu hộ COD tối đa cho 1 đơn hàng (50 triệu VNĐ - chống lỗi tràn số Decimal(12,2)) */
  MAX_COD_AMOUNT_VND: 50000000,

  /** Cước phí vận chuyển tối đa cho 1 đơn hàng (10 triệu VNĐ) */
  MAX_SHIPPING_FEE_VND: 10000000,

  /** Số lượng đơn hàng tối đa trong 1 lần import Excel hàng loạt (chống OOM DoS) */
  MAX_IMPORT_BATCH_SIZE: 200,

  /** Số lượng đơn hàng tối đa trong 1 lần gán cho Shipper */
  MAX_ASSIGN_BATCH_SIZE: 100,

  /** Số lượng đơn hàng tối đa trong 1 phiên đối soát nộp tiền COD */
  MAX_SETTLEMENT_BATCH_SIZE: 100,

  /** Độ dài tối đa của từ khóa tìm kiếm (chống Database CPU DoS) */
  MAX_SEARCH_TERM_LENGTH: 100,

  /** Độ dài tối đa của định danh đơn hàng tra cứu */
  MAX_IDENTIFIER_LENGTH: 50,

  /** Danh sách domain lưu trữ ảnh POD hợp lệ (chống SSRF) */
  ALLOWED_POD_DOMAINS: ['r2.deliveryhub.vn', 'storage.deliveryhub.vn', 'localhost'] as const,
} as const;
