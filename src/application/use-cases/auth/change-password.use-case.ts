/**
 * @file change-password.use-case.ts
 * @description Use Case Đổi mật khẩu tài khoản người dùng (UC02).
 * Kiểm tra mật khẩu hiện tại, băm mật khẩu mới và cập nhật bản ghi người dùng.
 * @module application/use-cases/auth
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import type { IPasswordHasherService } from '../../interfaces/password-hasher.service.interface';
import { type ChangePasswordInputDTO } from '../../dtos/auth.dto';

export class ChangePasswordUseCase
  implements IUseCase<ChangePasswordInputDTO, Result<{ message: string }, string>>
{
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasherService
  ) {}

  /**
   * Thực thi nghiệp vụ đổi mật khẩu.
   * Áp dụng nguyên tắc Fail-Closed và chống BOLA/IDOR (chỉ đổi mật khẩu tài khoản của chính mình).
   *
   * @param input Thông tin đổi mật khẩu (currentPassword, newPassword, confirmPassword)
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<{ message: string }, string>>}
   */
  public async execute(
    input: ChangePasswordInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<{ message: string }, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      if (input.newPassword !== input.confirmPassword) {
        return failure('Mật khẩu xác nhận không khớp với mật khẩu mới', {
          confirmPassword: ['Mật khẩu xác nhận không khớp'],
        });
      }

      // 2. Chống IDOR: Chỉ đổi mật khẩu của chính người dùng đăng nhập
      const targetUserId = securityContext.userId;
      const user = await this.userRepository.findById(targetUserId);
      if (!user) {
        return failure('Người dùng không tồn tại');
      }

      // Kiểm tra mật khẩu cũ
      const isCurrentValid = await this.passwordHasher.compare(
        input.currentPassword,
        user.getPasswordHash()
      );
      if (!isCurrentValid) {
        return failure('Mật khẩu hiện tại không chính xác', {
          currentPassword: ['Mật khẩu hiện tại không chính xác'],
        });
      }

      // Kiểm tra mật khẩu mới không được trùng mật khẩu cũ
      const isSameAsOld = await this.passwordHasher.compare(input.newPassword, user.getPasswordHash());
      if (isSameAsOld) {
        return failure('Mật khẩu mới không được trùng với mật khẩu hiện tại', {
          newPassword: ['Vui lòng chọn mật khẩu mới khác mật khẩu cũ'],
        });
      }

      // Băm mật khẩu mới
      const newHash = await this.passwordHasher.hash(input.newPassword);
      user.updatePassword(newHash);

      await this.userRepository.save(user);

      return success({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Đổi mật khẩu thất bại: ${errorMsg}`);
    }
  }
}
