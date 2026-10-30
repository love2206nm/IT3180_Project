/**
 * @file jwt-auth-token.service.ts
 * @description Triển khai dịch vụ cấp phát, kiểm tra JWT Token và quản lý bảo mật phiên đăng nhập (Fail-Fast, Brute-Force Defense).
 * @module infrastructure/security
 */

import crypto from 'node:crypto';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import type {
  IAuthTokenService,
  AuthTokenPayload,
  LoginLockoutStatus,
} from '../../application/interfaces/auth-token.service.interface';
import { env } from '../config/env';

interface FailedAttemptRecord {
  count: number;
  lockedUntil: Date | null;
  lastAttemptAt: Date;
}

/** Số lần đăng nhập sai tối đa cho phép trước khi tạm khóa */
const MAX_FAILED_ATTEMPTS = 5;

/** Thời gian tạm khóa tài khoản: 15 phút (ms) */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Chu kỳ dọn dẹp bộ nhớ đệm (TTL Sweep): 10 phút (ms) */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

export class JwtAuthTokenService implements IAuthTokenService {
  private readonly secretKey: Secret;
  private readonly defaultExpiresIn: string;
  private readonly revokedTokenIds: Set<string>;
  private readonly failedAttemptsMap: Map<string, FailedAttemptRecord>;
  private readonly cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Khởi tạo dịch vụ JWT Token & Session Security.
   * Loại bỏ hoàn toàn fallback tĩnh (CWE-798); nạp từ cấu hình env đã kiểm định Zod.
   *
   * @param secretKey Khóa bí mật JWT tùy chọn (dùng khi kiểm thử)
   * @param defaultExpiresIn Thời gian sống mặc định của token (mặc định '1d')
   */
  constructor(secretKey?: string, defaultExpiresIn: string = '1d') {
    this.secretKey = secretKey || env.JWT_SECRET;
    this.defaultExpiresIn = defaultExpiresIn || env.JWT_EXPIRES_IN;
    this.revokedTokenIds = new Set<string>();
    this.failedAttemptsMap = new Map<string, FailedAttemptRecord>();

    // Thiết lập timer định kỳ quét dọn RAM, dùng unref() để không chặn Node.js event loop
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredRecords();
    }, CLEANUP_INTERVAL_MS);

    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Tạo chuỗi JWT Token có thời hạn dựa trên payload thông tin người dùng.
   * Tự động sinh `jti` (JWT ID) duy nhất nếu payload chưa có.
   *
   * @param payload Dữ liệu định danh người dùng
   * @param expiresIn Thời gian sống của token (ví dụ: '1d', '7d')
   * @returns {string} Chuỗi JWT đã ký
   */
  public generateToken(payload: AuthTokenPayload, expiresIn?: string): string {
    const enrichedPayload: AuthTokenPayload = {
      ...payload,
      jti: payload.jti || crypto.randomUUID(),
    };

    const signOptions: SignOptions = {
      expiresIn: (expiresIn || this.defaultExpiresIn) as SignOptions['expiresIn'],
    };

    return jwt.sign(enrichedPayload, this.secretKey, signOptions);
  }

  /**
   * Giải mã và kiểm tra tính hợp lệ của chuỗi JWT Token.
   *
   * @param token Chuỗi JWT Token nhận được từ Cookie hoặc Header
   * @returns {AuthTokenPayload | null} Trả về payload nếu hợp lệ, null nếu token không hợp lệ hoặc đã bị thu hồi
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
   *
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
   *
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

  /**
   * Ghi nhận một lần đăng nhập thất bại và tự động khóa tạm thời sau 5 lần nhập sai.
   *
   * @param identifier Tên đăng nhập hoặc Email
   * @returns {Promise<LoginLockoutStatus>}
   */
  public async recordFailedLogin(identifier: string): Promise<LoginLockoutStatus> {
    const key = identifier.trim().toLowerCase();
    const existing = this.failedAttemptsMap.get(key);
    const newCount = (existing?.count ?? 0) + 1;
    const now = new Date();

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
      this.failedAttemptsMap.set(key, {
        count: newCount,
        lockedUntil,
        lastAttemptAt: now,
      });

      return {
        isLocked: true,
        remainingMinutes: 15,
      };
    }

    this.failedAttemptsMap.set(key, {
      count: newCount,
      lockedUntil: null,
      lastAttemptAt: now,
    });

    return {
      isLocked: false,
    };
  }

  /**
   * Xóa bộ đếm số lần đăng nhập sai khi người dùng đăng nhập thành công.
   *
   * @param identifier Tên đăng nhập hoặc Email
   */
  public async resetLoginAttempts(identifier: string): Promise<void> {
    const key = identifier.trim().toLowerCase();
    this.failedAttemptsMap.delete(key);
  }

  /**
   * Kiểm tra xem tài khoản có đang trong thời gian bị tạm khóa hay không.
   *
   * @param identifier Tên đăng nhập hoặc Email
   * @returns {Promise<LoginLockoutStatus>}
   */
  public async checkLoginLockout(identifier: string): Promise<LoginLockoutStatus> {
    const key = identifier.trim().toLowerCase();
    const record = this.failedAttemptsMap.get(key);

    if (!record?.lockedUntil) {
      return { isLocked: false };
    }

    const now = new Date();
    if (record.lockedUntil > now) {
      const remainingMinutes = Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 60000);
      return {
        isLocked: true,
        remainingMinutes,
      };
    }

    // Thời gian khóa đã hết -> Tự động giải phóng
    this.failedAttemptsMap.delete(key);
    return { isLocked: false };
  }

  /**
   * Quét dọn các bản ghi lockout đã hết hạn khỏi bộ nhớ đệm (TTL Sweep).
   */
  private cleanupExpiredRecords(): void {
    const now = new Date();
    for (const [key, record] of this.failedAttemptsMap.entries()) {
      if (record.lockedUntil && record.lockedUntil <= now) {
        this.failedAttemptsMap.delete(key);
      } else if (now.getTime() - record.lastAttemptAt.getTime() > LOCKOUT_DURATION_MS) {
        this.failedAttemptsMap.delete(key);
      }
    }
  }

  /**
   * Giải phóng tài nguyên timer và xóa bộ nhớ đệm (Dành cho kiểm thử hoặc tắt server).
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.revokedTokenIds.clear();
    this.failedAttemptsMap.clear();
  }
}
