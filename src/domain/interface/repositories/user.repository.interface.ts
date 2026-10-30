/**
 * @file user.repository.interface.ts
 * @description Hợp đồng lưu trữ và truy vấn Người dùng / Nhân sự (User Repository Port).
 * @module domain/interface/repositories
 */

import { User } from '../../entities/user.entity';
import type { UserRole } from '../../constants/roles.constant';
import type { UserStatus } from '../../constants/user-status.constant';

export interface UserSearchCriteria {
  hubId?: string | number;
  role?: UserRole;
  status?: UserStatus;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

/**
 * Cổng giao tiếp lưu trữ nhân sự và tài khoản người dùng (Port).
 */
export interface IUserRepository {
  /**
   * Tìm người dùng theo ID.
   */
  findById(id: string | number): Promise<User | null>;

  /**
   * Tìm nhiều người dùng theo danh sách ID (Batch Loader tối ưu khử N+1 queries).
   *
   * @param ids Danh sách ID người dùng
   * @returns {Promise<User[]>}
   */
  findByIds(ids: (string | number)[]): Promise<User[]>;

  /**
   * Tìm người dùng theo Tên đăng nhập (UC01 - Login).
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Tìm người dùng theo Email liên hệ.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Tìm người dùng theo Số điện thoại.
   */
  findByPhone(phone: string): Promise<User | null>;

  /**
   * Lấy danh sách nhân viên trực thuộc một trạm lọc theo vai trò và trạng thái (UC05).
   */
  findByHub(hubId: string | number, role?: UserRole, status?: UserStatus): Promise<User[]>;

  /**
   * Lấy danh sách Shipper đang hoạt động tại trạm để gán đơn (UC16).
   */
  findActiveShippersByHub(hubId: string | number): Promise<User[]>;

  /**
   * Lưu hoặc cập nhật thông tin nhân viên (UC06, UC07, UC08).
   */
  save(user: User): Promise<User>;

  /**
   * Tìm kiếm phân trang danh sách nhân sự (UC04).
   */
  search(criteria: UserSearchCriteria): Promise<{ users: User[]; total: number }>;
}
