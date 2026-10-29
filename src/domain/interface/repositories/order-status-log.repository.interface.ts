/**
 * @file order-status-log.repository.interface.ts
 * @description Hợp đồng lưu trữ và truy vấn Lịch sử hành trình bưu kiện (Audit Log Repository Port).
 * @module domain/interface/repositories
 */

import { OrderStatusLog } from '../../entities/order-status-log.entity';

export interface IOrderStatusLogRepository {
  /**
   * Lấy toàn bộ lịch sử trạng thái của một đơn hàng, sắp xếp theo thời gian mới nhất (UC11, UC23).
   */
  findByOrderId(orderId: string | number): Promise<OrderStatusLog[]>;

  /**
   * Lưu một bản ghi lịch sử kiểm vết mới.
   */
  save(log: OrderStatusLog): Promise<OrderStatusLog>;

  /**
   * Lưu hàng loạt bản ghi log (khi xử lý đơn hàng loạt).
   */
  saveBatch(logs: OrderStatusLog[]): Promise<void>;
}
