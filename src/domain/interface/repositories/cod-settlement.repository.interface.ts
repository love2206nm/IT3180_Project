/**
 * @file cod-settlement.repository.interface.ts
 * @description Hợp đồng lưu trữ và truy vấn Phiên đối soát tiền thu hộ COD (COD Settlement Port).
 * @module domain/interface/repositories
 */

import { CODSettlement } from '../../entities/cod-settlement.entity';
import type { CODSettlementStatus } from '../../constants/cod-status.constant';

export interface ICODSettlementRepository {
  /**
   * Tìm phiên đối soát theo ID.
   */
  findById(id: string | number): Promise<CODSettlement | null>;

  /**
   * Tìm phiên đối soát theo Mã định danh (ví dụ: 'COD-20261029-01').
   */
  findByCode(settlementCode: string): Promise<CODSettlement | null>;

  /**
   * Lấy danh sách các phiên nộp tiền của một Shipper cụ thể.
   */
  findByShipper(shipperId: string | number, status?: CODSettlementStatus): Promise<CODSettlement[]>;

  /**
   * Lấy danh sách các phiên nộp tiền tại một Trạm.
   */
  findByHub(hubId: string | number, status?: CODSettlementStatus): Promise<CODSettlement[]>;

  /**
   * Lưu hoặc cập nhật phiên đối soát COD.
   */
  save(settlement: CODSettlement): Promise<CODSettlement>;

  /**
   * Kiểm tra xem các đơn hàng đã nằm trong phiên đối soát đang hoạt động (PENDING hoặc CONFIRMED) hay chưa (UC22).
   * Chống gian lận nộp trùng tiền COD (Double-Spending) và xử lý Race Condition cấp CSDL.
   *
   * @param orderIds Danh sách ID các đơn hàng cần kiểm tra
   * @returns {Promise<string[]>} Danh sách các ID đơn hàng đã bị khóa trong phiên đối soát khác
   */
  hasOrdersInActiveSettlement(orderIds: (string | number)[]): Promise<string[]>;
}
