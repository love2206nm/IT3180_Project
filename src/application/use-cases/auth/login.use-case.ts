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

/** Số lần đăng nhập sai tối đa cho phép */
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Reset bộ nhớ đệm tạm khóa (Hỗ trợ tương thích ngược cho Unit Test).
 */
export function resetLoginLockoutCache(): void {
  // Được hỗ trợ thông qua resetLoginAttempts trên authTokenService
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
      const lockout = await this.authTokenService.checkLoginLockout(identifier);
      if (lockout.isLocked) {
        return failure(
          `Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau ${lockout.remainingMinutes ?? 15} phút.`
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
        // Ghi nhận số lần đăng nhập sai thông qua Auth Security Service
        const failedLockout = await this.authTokenService.recordFailedLogin(identifier);
        if (failedLockout.isLocked) {
          return failure(
            `Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau ${failedLockout.remainingMinutes ?? 15} phút.`
          );
        }

        return failure('Tên đăng nhập hoặc mật khẩu không chính xác');
      }

      // Đăng nhập thành công -> Xóa bộ đếm thất bại
      await this.authTokenService.resetLoginAttempts(identifier);

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
