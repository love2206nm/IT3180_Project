/**
 * @file order.repository.interface.ts
 * @description Hợp đồng lưu trữ và truy vấn Đơn hàng / Bưu kiện (Order Repository Port).
 * @module domain/interface/repositories
 */

import { Order } from '../../entities/order.entity';
import { OrderStatusLog } from '../../entities/order-status-log.entity';
import type { OrderStatus } from '../../constants/order-status.constant';

export interface OrderSearchCriteria {
  trackingCode?: string;
  senderPhone?: string;
  receiverPhone?: string;
  currentHubId?: string | number;
  assignedShipperId?: string | number;
  status?: OrderStatus | OrderStatus[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Số liệu thống kê hiệu suất giao hàng và COD tổng hợp của một Shipper (UC21).
 */
export interface ShipperPerformanceStat {
  shipperId: string;
  totalAssigned: number;
  totalDelivered: number;
  totalFailed: number;
  totalCodCollected: number;
}

/**
 * Cổng giao tiếp lưu trữ và truy vấn bưu kiện đơn hàng (Port).
 */
export interface IOrderRepository {
  /**
   * Tìm đơn hàng theo ID nội bộ.
   */
  findById(id: string | number): Promise<Order | null>;

  /**
   * Tìm đơn hàng theo Mã vận đơn duy nhất (UC15, UC23).
   */
  findByTrackingCode(trackingCode: string): Promise<Order | null>;

  /**
   * Lấy danh sách đơn hàng đang ở một trạm cụ thể theo trạng thái (UC10, UC16).
   */
  findByHubAndStatus(hubId: string | number, status?: OrderStatus | OrderStatus[]): Promise<Order[]>;

  /**
   * Lấy danh sách đơn hàng đang được phân công cho một Shipper (UC17).
   */
  findByShipperAndStatus(shipperId: string | number, status?: OrderStatus | OrderStatus[]): Promise<Order[]>;

  /**
   * Lưu hoặc cập nhật thông tin đơn hàng đơn lẻ.
   */
  save(order: Order): Promise<Order>;

  /**
   * Lưu cập nhật đơn hàng kèm ghi nhận bản ghi kiểm vết bất biến trong 1 transaction (ACID).
   */
  saveWithAuditLog(order: Order, log: OrderStatusLog): Promise<Order>;

  /**
   * Lưu hàng loạt đơn hàng mới (UC14 - Import Excel).
   */
  createBatch(orders: Order[]): Promise<Order[]>;

  /**
   * Gán hàng loạt đơn hàng cho một Shipper trong 1 transaction và tự động ghi log (UC16).
   */
  assignOrdersBatch(
    orderIds: (string | number)[],
    shipperId: string | number,
    actorId: string | number,
    note?: string
  ): Promise<number>;

  /**
   * Lấy danh sách đơn hàng đã giao thành công (DELIVERED, PAID) có thu COD nhưng chưa đối soát (UC22).
   */
  findUnsettledCodOrdersByShipper(shipperId: string | number): Promise<Order[]>;

  /**
   * Tìm kiếm đơn hàng phân trang theo nhiều tiêu chí lọc (UC10).
   */
  search(criteria: OrderSearchCriteria): Promise<{ orders: Order[]; total: number }>;

  /**
   * Thống kê số lượng đơn hàng theo từng trạng thái (UC21).
   */
  countByStatus(hubId?: string | number): Promise<Record<OrderStatus, number>>;

  /**
   * Thống kê tổng hợp hiệu suất toàn bộ Shipper tại trạm trong 1 câu truy vấn aggregate (UC21).
   *
   * @param hubId ID của trạm
   * @returns {Promise<ShipperPerformanceStat[]>}
   */
  getShipperPerformanceStats(hubId: string | number): Promise<ShipperPerformanceStat[]>;
}
