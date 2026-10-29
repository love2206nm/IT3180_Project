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
} as const;
