/**
 * @file order-status.constant.ts
 * @description Định nghĩa vòng đời trạng thái đơn hàng và ma trận chuyển đổi trạng thái hợp lệ.
 * @module domain/constants
 */

/**
 * Danh mục toàn bộ các trạng thái khả dụng của đơn hàng trong hệ thống Delivery Hub.
 * Tuân thủ theo mục 3 trong tài liệu database_design.md.
 */
export const ORDER_STATUS = {
  /** Đơn hàng mới được tạo trên hệ thống hoặc tại trạm, chưa nhập kho */
  CREATED: 'CREATED',
  /** Đơn hàng đã về đến trạm giao nhận và quét mã check-in nhập kho */
  AT_HUB: 'AT_HUB',
  /** Đơn hàng đã bàn giao cho Shipper và đang trên đường giao tới người nhận */
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  /** Giao hàng thành công (đã xác nhận POD và thu tiền COD nếu có) */
  DELIVERED: 'DELIVERED',
  /** Giao hàng thất bại lần 1 hoặc 2 (chờ lưu kho để giao lại) */
  FAILED_ATTEMPT: 'FAILED_ATTEMPT',
  /** Đơn giao thất bại quá 3 lần hoặc khách từ chối nhận, chờ chuyển hoàn */
  RETURN_PENDING: 'RETURN_PENDING',
  /** Đã hoàn trả bưu kiện thành công về người gửi */
  RETURNED: 'RETURNED',
  /** Đơn hàng bị hủy trước khi giao */
  CANCELLED: 'CANCELLED',
} as const;

/**
 * Type đại diện cho giá trị trạng thái đơn hàng.
 */
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Ma trận các trạng thái tiếp theo hợp lệ (State Machine Transition Matrix).
 * Ngăn chặn tuyệt đối việc chuyển trạng thái bất hợp lệ (ví dụ: từ DELIVERED quay về AT_HUB).
 */
export const VALID_ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.CREATED]: [
    ORDER_STATUS.AT_HUB,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.AT_HUB]: [
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.RETURN_PENDING,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.FAILED_ATTEMPT,
    ORDER_STATUS.RETURN_PENDING,
  ],
  [ORDER_STATUS.FAILED_ATTEMPT]: [
    ORDER_STATUS.AT_HUB,
    ORDER_STATUS.RETURN_PENDING,
  ],
  [ORDER_STATUS.RETURN_PENDING]: [
    ORDER_STATUS.RETURNED,
  ],
  [ORDER_STATUS.DELIVERED]: [], // Trạng thái kết thúc (Terminal State)
  [ORDER_STATUS.RETURNED]: [],  // Trạng thái kết thúc (Terminal State)
  [ORDER_STATUS.CANCELLED]: [], // Trạng thái kết thúc (Terminal State)
};
