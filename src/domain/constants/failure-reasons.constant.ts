/**
 * @file failure-reasons.constant.ts
 * @description Danh mục chuẩn các lý do giao hàng không thành công.
 * @module domain/constants
 */

export const DELIVERY_FAILURE_REASON = {
  /** Không liên lạc được với người nhận (gọi quá 3 cuộc không bắt máy hoặc thuê bao) */
  CUSTOMER_UNREACHABLE: 'CUSTOMER_UNREACHABLE',

  /** Người nhận hẹn giao lại vào thời gian hoặc ngày khác */
  CUSTOMER_RESCHEDULED: 'CUSTOMER_RESCHEDULED',

  /** Sai thông tin địa chỉ hoặc số điện thoại người nhận */
  WRONG_ADDRESS_OR_PHONE: 'WRONG_ADDRESS_OR_PHONE',

  /** Người nhận từ chối nhận hàng (không đặt mua, sai hàng, hàng hư hỏng) */
  CUSTOMER_REJECTED: 'CUSTOMER_REJECTED',

  /** Lý do thời tiết bất khả kháng, thiên tai hoặc sự cố trên đường */
  FORCE_MAJEURE: 'FORCE_MAJEURE',

  /** Lý do khác (yêu cầu bắt buộc phải ghi chú rõ) */
  OTHER: 'OTHER',
} as const;

export type DeliveryFailureReason = (typeof DELIVERY_FAILURE_REASON)[keyof typeof DELIVERY_FAILURE_REASON];

export const DELIVERY_FAILURE_REASON_LABELS: Record<DeliveryFailureReason, string> = {
  [DELIVERY_FAILURE_REASON.CUSTOMER_UNREACHABLE]: 'Không liên lạc được (quá 3 cuộc)',
  [DELIVERY_FAILURE_REASON.CUSTOMER_RESCHEDULED]: 'Khách hẹn giao lại ngày khác',
  [DELIVERY_FAILURE_REASON.WRONG_ADDRESS_OR_PHONE]: 'Sai địa chỉ hoặc số điện thoại',
  [DELIVERY_FAILURE_REASON.CUSTOMER_REJECTED]: 'Khách từ chối nhận hàng',
  [DELIVERY_FAILURE_REASON.FORCE_MAJEURE]: 'Thời tiết / Sự cố bất khả kháng',
  [DELIVERY_FAILURE_REASON.OTHER]: 'Lý do khác (ghi chú)',
};
