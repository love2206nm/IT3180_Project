/**
 * @file security-context.interface.ts
 * @description Ngữ cảnh bảo mật và thông tin định danh người dùng xác thực từ Server Session / JWT Token.
 * Giúp các Use Cases và Server Actions phân quyền mà không tin tưởng định danh từ Client (chống IDOR/BOLA).
 * @module application/interfaces
 */

import type { UserRole } from '../../domain/constants/roles.constant';

/**
 * Ngữ cảnh người dùng đã được xác thực an toàn từ máy chủ.
 */
export interface SecurityContext {
  /** ID người dùng thực hiện thao tác */
  userId: string;

  /** Tên đăng nhập */
  username: string;

  /** Vai trò của người dùng trong hệ thống */
  role: UserRole;

  /** ID trạm giao nhận trực thuộc (nếu có, null với Admin) */
  hubId: string | null;
}

