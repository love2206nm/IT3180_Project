/**
 * @file login.use-case.ts
 * @description Use Case Đăng nhập hệ thống (UC01).
 * Xác thực thông tin tài khoản, kiểm tra trạng thái hoạt động, ghi nhận đăng nhập và cấp JWT Token.
 * @module application/use-cases/auth
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import type { IPasswordHasherService } from '../../interfaces/password-hasher.service.interface';
import type { IAuthTokenService } from '../../interfaces/auth-token.service.interface';
import { type LoginInputDTO, type LoginOutputDTO } from '../../dtos/auth.dto';
import { USER_STATUS } from '../../../domain/constants/user-status.constant';

interface FailedAttemptRecord {
  count: number;
  lockedUntil: Date | null;
}

/**
 * Bộ nhớ đệm lưu trữ số lần đăng nhập thất bại theo username/email.
 * Ngăn chặn tấn công Brute-Force và Credential Stuffing (UC01).
 */
const failedAttemptsMap = new Map<string, FailedAttemptRecord>();

/** Số lần đăng nhập sai tối đa cho phép trước khi tạm khóa */
const MAX_FAILED_ATTEMPTS = 5;

/** Thời gian tạm khóa tài khoản: 15 phút (ms) */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/**
 * Reset bộ nhớ đệm tạm khóa (Dành cho Unit Test)
 */
export function resetLoginLockoutCache(): void {
  failedAttemptsMap.clear();
}

export class LoginUserUseCase implements IUseCase<LoginInputDTO, Result<LoginOutputDTO, string>> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasherService,
    private readonly authTokenService: IAuthTokenService
  ) {}

  /**
   * Thực thi nghiệp vụ đăng nhập
   * Áp dụng cơ chế chống Brute-Force: Tạm khóa 15 phút sau 5 lần nhập sai liên tiếp.
   *
   * @param input Thông tin đăng nhập (usernameOrEmail, password)
   * @returns {Promise<Result<LoginOutputDTO, string>>}
   */
  public async execute(input: LoginInputDTO): Promise<Result<LoginOutputDTO, string>> {
    try {
      const identifier = input.usernameOrEmail.trim().toLowerCase();

      // 1. Kiểm tra trạng thái tạm khóa Brute-Force (Lockout)
      const record = failedAttemptsMap.get(identifier);
      const now = new Date();
      if (record?.lockedUntil && record.lockedUntil > now) {
        const remainingMinutes = Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 60000);
        return failure(
          `Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
        );
      }

      const isEmail = identifier.includes('@');
      const user = isEmail
        ? await this.userRepository.findByEmail(identifier)
        : await this.userRepository.findByUsername(identifier);

      if (!user) {
        return failure('Tên đăng nhập hoặc mật khẩu không chính xác');
      }

      // 2. Kiểm tra mật khẩu
      const isPasswordValid = await this.passwordHasher.compare(input.password, user.getPasswordHash());
      if (!isPasswordValid) {
        // Ghi nhận số lần đăng nhập sai
        const currentCount = (record?.count ?? 0) + 1;
        if (currentCount >= MAX_FAILED_ATTEMPTS) {
          failedAttemptsMap.set(identifier, {
            count: currentCount,
            lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
          });
          return failure(
            `Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau 15 phút.`
          );
        }

        failedAttemptsMap.set(identifier, {
          count: currentCount,
          lockedUntil: null,
        });

        return failure('Tên đăng nhập hoặc mật khẩu không chính xác');
      }

      // Đăng nhập thành công -> Xóa bộ đếm thất bại
      failedAttemptsMap.delete(identifier);

      // 3. Kiểm tra trạng thái tài khoản
      if (user.getStatus() === USER_STATUS.LOCKED) {
        return failure('Tài khoản của bạn đã bị khóa do vi phạm hoặc bảo mật. Vui lòng liên hệ quản trị viên');
      }

      if (user.getStatus() === USER_STATUS.INACTIVE) {
        return failure('Tài khoản của bạn hiện đang ngừng hoạt động');
      }

      // Ghi nhận thời gian đăng nhập
      user.recordLogin();
      await this.userRepository.save(user);

      const userIdStr = String(user.getId());
      const hubIdStr = user.getHubId() !== null ? String(user.getHubId()) : null;

      // Sinh JWT token
      const expiresIn = '1d';
      const token = this.authTokenService.generateToken(
        {
          userId: userIdStr,
          username: user.getUsername(),
          role: user.getRole(),
          hubId: hubIdStr,
        },
        expiresIn
      );

      const output: LoginOutputDTO = {
        user: {
          id: userIdStr,
          username: user.getUsername(),
          fullName: user.getFullName(),
          email: user.getEmail(),
          phone: user.getPhone().toStandardString(),
          role: user.getRole(),
          status: user.getStatus(),
          hubId: hubIdStr,
        },
        token,
        expiresIn,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống khi đăng nhập';
      return failure(`Đăng nhập thất bại: ${errorMsg}`);
    }
  }
}
