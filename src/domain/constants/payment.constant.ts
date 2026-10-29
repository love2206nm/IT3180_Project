/**
 * @file payment.constant.ts
 * @description Định nghĩa các quy chuẩn thanh toán cước phí và tiền thu hộ (COD).
 * @module domain/constants
 */

/**
 * Bên chịu trách nhiệm thanh toán cước phí vận chuyển.
 */
export const PAYMENT_BY = {
  /** Người gửi thanh toán cước phí */
  SENDER: 'SENDER',
  /** Người nhận thanh toán cước phí khi nhận hàng */
  RECEIVER: 'RECEIVER',
} as const;

export type PaymentBy = (typeof PAYMENT_BY)[keyof typeof PAYMENT_BY];

/**
 * Trạng thái thanh toán của cước phí và tiền thu hộ.
 */
export const PAYMENT_STATUS = {
  /** Chưa thanh toán */
  UNPAID: 'UNPAID',
  /** Đã thanh toán đầy đủ */
  PAID: 'PAID',
  /** Đã hoàn tiền cho người gửi/người nhận */
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
