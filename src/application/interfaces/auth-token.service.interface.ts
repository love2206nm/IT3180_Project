/**
 * @file auth-token.service.interface.ts
 * @description Hợp đồng dịch vụ tạo, xác thực Token đăng nhập và quản lý bảo mật phiên (JWT & Brute-Force Port).
 * @module application/interfaces
 */

import type { UserRole } from '../../domain/constants/roles.constant';

/**
 * Payload chứa thông tin nhân sự được mã hóa bên trong JWT Token.
 */
export interface AuthTokenPayload {
  /** ID người dùng */
  userId: string;
  /** Tên đăng nhập */
  username: string;
  /** Vai trò trong hệ thống */
  role: UserRole;
  /** ID trạm giao nhận trực thuộc (nếu có, null với Admin) */
  hubId: string | null;
  /** Định danh duy nhất của token (chống replay attack và hỗ trợ thu hồi) */
  jti?: string;
  /** Phiên bản token của người dùng (tăng lên khi đổi mật khẩu để vô hiệu hóa token cũ) */
  tokenVersion?: number;
}

/**
 * Trạng thái khóa tài khoản tạm thời chống tấn công dò mật khẩu (Brute-Force).
 */
export interface LoginLockoutStatus {
  /** Có đang bị tạm khóa hay không */
  isLocked: boolean;
  /** Số phút còn lại trước khi được mở khóa (nếu bị khóa) */
  remainingMinutes?: number;
}

/**
 * Cổng giao tiếp dịch vụ phát hành, kiểm tra Token xác thực và chống tấn công Brute-Force.
 */
export interface IAuthTokenService {
  /**
   * Tạo chuỗi JWT Token có thời hạn dựa trên payload thông tin người dùng.
   *
   * @param payload Dữ liệu định danh người dùng
   * @param expiresIn Thời gian sống của token (ví dụ: '1d', '7d')
   * @returns {string} Chuỗi JWT đã ký
   */
  generateToken(payload: AuthTokenPayload, expiresIn?: string): string;

  /**
   * Giải mã và kiểm tra tính hợp lệ của chuỗi JWT Token.
   *
   * @param token Chuỗi JWT Token nhận được từ HTTP-Only Cookie hoặc Header
   * @returns {AuthTokenPayload | null} Trả về payload nếu hợp lệ, null nếu token giả mạo hoặc hết hạn
   */
  verifyToken(token: string): AuthTokenPayload | null;

  /**
   * Thu hồi token (đưa vào blacklist hoặc đánh dấu vô hiệu hóa) khi Đăng xuất / Khóa tài khoản.
   *
   * @param token Chuỗi JWT Token cần thu hồi
   */
  revokeToken(token: string): Promise<void>;

  /**
   * Kiểm tra xem token đã bị đưa vào danh sách thu hồi (blacklist) hay chưa.
   *
   * @param token Chuỗi JWT Token cần kiểm tra
   * @returns {Promise<boolean>} true nếu token đã bị thu hồi
   */
  isTokenRevoked(token: string): Promise<boolean>;

  /**
   * Ghi nhận một lần đăng nhập thất bại của tài khoản.
   * Tự động tạm khóa nếu vượt quá số lần cho phép (ví dụ 5 lần).
   *
   * @param identifier Tên đăng nhập hoặc Email
   * @returns {Promise<LoginLockoutStatus>} Trạng thái khóa sau lần thử này
   */
  recordFailedLogin(identifier: string): Promise<LoginLockoutStatus>;

  /**
   * Xóa bộ đếm số lần đăng nhập thất bại khi người dùng đăng nhập thành công.
   *
   * @param identifier Tên đăng nhập hoặc Email
   */
  resetLoginAttempts(identifier: string): Promise<void>;

  /**
   * Kiểm tra xem tài khoản có đang trong thời gian bị tạm khóa hay không.
   *
   * @param identifier Tên đăng nhập hoặc Email
   * @returns {Promise<LoginLockoutStatus>}
   */
  checkLoginLockout(identifier: string): Promise<LoginLockoutStatus>;
}
