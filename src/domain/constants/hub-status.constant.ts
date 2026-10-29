/**
 * @file hub-status.constant.ts
 * @description Định nghĩa các trạng thái hoạt động của Trạm giao nhận (Hub).
 * @module domain/constants
 */

export const HUB_STATUS = {
  /** Trạm đang hoạt động, có thể tiếp nhận và xuất hàng */
  ACTIVE: 'ACTIVE',
  /** Trạm tạm dừng hoạt động để bảo trì hoặc đóng cửa */
  INACTIVE: 'INACTIVE',
} as const;

export type HubStatus = (typeof HUB_STATUS)[keyof typeof HUB_STATUS];
