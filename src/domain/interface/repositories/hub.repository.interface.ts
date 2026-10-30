/**
 * @file hub.repository.interface.ts
 * @description Hợp đồng lưu trữ và truy vấn Trạm giao nhận (Hub Repository Port).
 * @module domain/interface/repositories
 */

import { Hub } from '../../entities/hub.entity';
import type { HubStatus } from '../../constants/hub-status.constant';

export interface IHubRepository {
  /**
   * Tìm trạm theo ID.
   */
  findById(id: string | number): Promise<Hub | null>;

  /**
   * Tìm nhiều trạm theo danh sách ID (Batch Loader tối ưu khử N+1 queries).
   *
   * @param ids Danh sách ID các trạm
   * @returns {Promise<Hub[]>}
   */
  findByIds(ids: (string | number)[]): Promise<Hub[]>;

  /**
   * Tìm trạm theo Mã duy nhất (ví dụ: 'HUB-HAN-01').
   */
  findByCode(code: string): Promise<Hub | null>;

  /**
   * Lấy toàn bộ danh sách trạm (có thể lọc theo trạng thái hoạt động).
   */
  findAll(status?: HubStatus): Promise<Hub[]>;

  /**
   * Tìm các trạm thuộc một Tỉnh/Thành phố.
   */
  findByProvince(province: string): Promise<Hub[]>;

  /**
   * Lưu hoặc cập nhật trạm.
   */
  save(hub: Hub): Promise<Hub>;
}
