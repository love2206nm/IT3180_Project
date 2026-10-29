/**
 * @file user-status.constant.ts
 * @description Định nghĩa các trạng thái hoạt động của tài khoản người dùng.
 * @module domain/constants
 */

export const USER_STATUS = {
  /** Tài khoản đang hoạt động bình thường */
  ACTIVE: 'ACTIVE',
  /** Tài khoản tạm ngừng hoạt động hoặc đã bị vô hiệu hóa (Soft Delete) */
  INACTIVE: 'INACTIVE',
  /** Tài khoản bị khóa do vi phạm hoặc nhập sai mật khẩu quá số lần quy định */
  LOCKED: 'LOCKED',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
