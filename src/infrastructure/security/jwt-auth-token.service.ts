/**
 * @file jwt-auth-token.service.ts
 * @description Triển khai dịch vụ cấp phát và kiểm tra JWT Token.
 * @module infrastructure/security
 */

import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import type {
  IAuthTokenService,
  AuthTokenPayload,
} from '../../application/interfaces/auth-token.service.interface';

export class JwtAuthTokenService implements IAuthTokenService {
  private readonly secretKey: Secret;
  private readonly defaultExpiresIn: string;
  private readonly revokedTokenIds: Set<string>;

  /**
   * Khởi tạo dịch vụ JWT Token Service
   * @param secretKey Khóa bí mật JWT (nếu không truyền sẽ đọc từ process.env.JWT_SECRET)
   * @param defaultExpiresIn Thời gian sống mặc định của token (mặc định '1d')
   */
  constructor(secretKey?: string, defaultExpiresIn: string = '1d') {
    this.secretKey = secretKey || process.env.JWT_SECRET || 'delivery-hub-super-secret-jwt-key-for-development-2026';
    this.defaultExpiresIn = defaultExpiresIn;
    this.revokedTokenIds = new Set<string>();
  }

  /**
   * Tạo chuỗi JWT Token có thời hạn dựa trên payload thông tin người dùng.
   * @param payload Dữ liệu định danh người dùng
   * @param expiresIn Thời gian sống của token (ví dụ: '1d', '7d')
   * @returns {string} Chuỗi JWT đã ký
   */
  public generateToken(payload: AuthTokenPayload, expiresIn?: string): string {
    const signOptions: SignOptions = {
      expiresIn: (expiresIn || this.defaultExpiresIn) as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, this.secretKey, signOptions);
  }

  /**
   * Giải mã và kiểm tra tính hợp lệ của chuỗi JWT Token.
   * @param token Chuỗi JWT Token nhận được từ Cookie hoặc Header
   * @returns {AuthTokenPayload | null} Trả về payload nếu hợp lệ, null nếu token không hợp lệ
   */
  public verifyToken(token: string): AuthTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secretKey) as AuthTokenPayload;

      // Kiểm tra xem token này có trong danh sách thu hồi hay không
      if (decoded.jti && this.revokedTokenIds.has(decoded.jti)) {
        return null;
      }

      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Thu hồi token (đưa vào blacklist bộ nhớ).
   * @param token Chuỗi JWT Token cần thu hồi
   */
  public async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as AuthTokenPayload | null;
      if (decoded?.jti) {
        this.revokedTokenIds.add(decoded.jti);
      }
    } catch {
      // Bỏ qua lỗi decode khi thu hồi
    }
  }

  /**
   * Kiểm tra xem token đã bị đưa vào danh sách thu hồi hay chưa.
   * @param token Chuỗi JWT Token cần kiểm tra
   * @returns {Promise<boolean>}
   */
  public async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const decoded = jwt.decode(token) as AuthTokenPayload | null;
      if (decoded?.jti) {
        return this.revokedTokenIds.has(decoded.jti);
      }
      return false;
    } catch {
      return false;
    }
  }
}
