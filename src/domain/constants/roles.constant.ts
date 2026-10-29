/**
 * @file roles.constant.ts
 * @description Định nghĩa các vai trò (roles) trong hệ thống phân quyền của Delivery Hub.
 * @module domain/constants
 */

/**
 * Danh mục vai trò của nhân sự trong hệ thống.
 * Tuân thủ theo mục 1 của use_cases.md và bảng users trong database_design.md.
 */
export const USER_ROLE = {
  /** Quản trị viên hệ thống toàn cục */
  ADMIN: 'ADMIN',
  /** Quản lý trạm giao nhận (Hub Manager) */
  HUB_MANAGER: 'HUB_MANAGER',
  /** Nhân viên điều phối kho / Tiếp nhận hàng tại trạm (Hub Staff / Dispatcher) */
  HUB_STAFF: 'HUB_STAFF',
  /** Nhân viên giao hàng (Shipper) */
  SHIPPER: 'SHIPPER',
} as const;

/**
 * Type đại diện cho vai trò người dùng trong hệ thống.
 */
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
