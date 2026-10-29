/**
 * @file cod-status.constant.ts
 * @description Định nghĩa các trạng thái của phiên nộp và đối soát tiền thu hộ (COD).
 * @module domain/constants
 */

export const COD_SETTLEMENT_STATUS = {
  /** Shipper đã tạo phiên nộp tiền, đang chờ quản lý xác nhận */
  PENDING: 'PENDING',
  /** Quản lý trạm đã kiểm đếm và xác nhận khớp tiền vào quỹ trạm */
  CONFIRMED: 'CONFIRMED',
  /** Phiên nộp bị từ chối do lệch số tiền thực tế hoặc có sai sót */
  REJECTED: 'REJECTED',
} as const;

export type CODSettlementStatus = (typeof COD_SETTLEMENT_STATUS)[keyof typeof COD_SETTLEMENT_STATUS];
