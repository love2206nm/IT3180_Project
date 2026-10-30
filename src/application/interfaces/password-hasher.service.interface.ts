/**
 * @file password-hasher.service.interface.ts
 * @description Hợp đồng dịch vụ Băm và So khớp Mật khẩu người dùng (Password Hasher Port).
 * @module application/interfaces
 */

/**
 * Cổng giao tiếp dịch vụ băm mật khẩu an toàn (Bcrypt / Argon2).
 */
export interface IPasswordHasherService {
  /**
   * Băm mật khẩu thô thành chuỗi băm an toàn kèm salt.
   *
   * @param plainPassword Mật khẩu thô do người dùng nhập
   * @returns {Promise<string>} Chuỗi hash an toàn
   */
  hash(plainPassword: string): Promise<string>;

  /**
   * So khớp mật khẩu thô với chuỗi hash đã lưu trong CSDL.
   *
   * @param plainPassword Mật khẩu thô người dùng nhập vào form đăng nhập
   * @param passwordHash Chuỗi hash lưu trong CSDL
   * @returns {Promise<boolean>} true nếu mật khẩu chính xác, ngược lại false
   */
  compare(plainPassword: string, passwordHash: string): Promise<boolean>;
}
