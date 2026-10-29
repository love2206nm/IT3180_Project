/**
 * @file delivery-zone.repository.interface.ts
 * @description Hợp đồng lưu trữ và truy vấn Tuyến giao hàng & Phân công Shipper (UC08).
 * @module domain/interface/repositories
 */

import { DeliveryZone } from '../../entities/delivery-zone.entity';

/**
 * Cổng giao tiếp lưu trữ tuyến giao hàng trực thuộc trạm (Port).
 */
export interface IDeliveryZoneRepository {
  /**
   * Tìm tuyến giao hàng theo ID.
   * @param id ID của tuyến giao hàng
   * @returns {Promise<DeliveryZone | null>}
   */
  findById(id: string | number): Promise<DeliveryZone | null>;

  /**
   * Tìm tuyến theo mã duy nhất (ví dụ: 'ZONE-CG-01').
   * @param code Mã tuyến
   * @returns {Promise<DeliveryZone | null>}
   */
  findByCode(code: string): Promise<DeliveryZone | null>;

  /**
   * Lấy danh sách toàn bộ các tuyến thuộc một trạm giao nhận (UC08).
   * @param hubId ID của trạm
   * @returns {Promise<DeliveryZone[]>}
   */
  findByHubId(hubId: string | number): Promise<DeliveryZone[]>;

  /**
   * Lưu hoặc cập nhật thông tin tuyến giao hàng.
   * @param zone Thực thể DeliveryZone
   * @returns {Promise<DeliveryZone>}
   */
  save(zone: DeliveryZone): Promise<DeliveryZone>;

  /**
   * Phân công tuyến giao hàng cho một Shipper phụ trách (UC08).
   * @param shipperId ID của Shipper
   * @param zoneId ID của tuyến
   * @returns {Promise<void>}
   */
  assignShipperToZone(shipperId: string | number, zoneId: string | number): Promise<void>;

  /**
   * Hủy phân công tuyến của Shipper.
   * @param shipperId ID của Shipper
   * @param zoneId ID của tuyến
   * @returns {Promise<void>}
   */
  removeShipperFromZone(shipperId: string | number, zoneId: string | number): Promise<void>;

  /**
   * Lấy danh sách các tuyến đang được phân công cho một Shipper.
   * @param shipperId ID của Shipper
   * @returns {Promise<DeliveryZone[]>}
   */
  findAssignedZonesByShipper(shipperId: string | number): Promise<DeliveryZone[]>;
}
