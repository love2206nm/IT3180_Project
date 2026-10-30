/**
 * @file bcrypt-password-hasher.service.ts
 * @description Triển khai dịch vụ băm mật khẩu bằng thuật toán Bcrypt.
 * @module infrastructure/security
 */

import bcrypt from 'bcryptjs';
import type { IPasswordHasherService } from '../../application/interfaces/password-hasher.service.interface';

export class BcryptPasswordHasherService implements IPasswordHasherService {
  private readonly saltRounds: number;

  /**
   * Khởi tạo dịch vụ BcryptPasswordHasher
   * @param saltRounds Số vòng salt rounds (mặc định là 10)
   */
  constructor(saltRounds: number = 10) {
    this.saltRounds = saltRounds;
  }

  /**
   * Băm mật khẩu thô thành chuỗi băm an toàn kèm salt.
   * @param plainPassword Mật khẩu thô
   * @returns {Promise<string>} Chuỗi hash bcrypt
   */
  public async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  /**
   * So khớp mật khẩu thô với chuỗi hash đã lưu trong CSDL.
   * @param plainPassword Mật khẩu thô
   * @param passwordHash Chuỗi hash trong DB
   * @returns {Promise<boolean>}
   */
  public async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
