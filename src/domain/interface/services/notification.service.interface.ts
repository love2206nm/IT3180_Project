/**
 * @file notification.service.interface.ts
 * @description Hợp đồng dịch vụ Gửi thông báo sự kiện bưu kiện (Notification Service Port).
 * @module domain/interface/services
 */

import type { OrderStatus } from '../../constants/order-status.constant';

/**
 * Cổng giao tiếp gửi thông báo (SMS / Zalo ZNS / Push Notification / Webhook).
 */
export interface INotificationService {
  /**
   * Gửi thông báo cập nhật tiến độ bưu kiện đến khách hàng.
   * @param trackingCode Mã vận đơn
   * @param newStatus Trạng thái mới của đơn
   * @param recipientPhone Số điện thoại người nhận/gửi
   * @param note Ghi chú hoặc thông tin bổ sung (ví dụ: Shipper đang trên đường tới)
   */
  notifyStatusChange(
    trackingCode: string,
    newStatus: OrderStatus,
    recipientPhone: string,
    note?: string
  ): Promise<void>;
}
