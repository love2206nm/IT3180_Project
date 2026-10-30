/**
 * @file update-profile.use-case.ts
 * @description Use Case Cập nhật thông tin cá nhân (UC03).
 * Kiểm tra tính hợp lệ, tính duy nhất của số điện thoại và cập nhật hồ sơ người dùng.
 * @module application/use-cases/auth
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { type UpdateProfileInputDTO, type UserProfileDTO } from '../../dtos/auth.dto';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class UpdateProfileUseCase implements IUseCase<UpdateProfileInputDTO, Result<UserProfileDTO, string>> {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Thực thi cập nhật hồ sơ cá nhân.
   * Chống IDOR/BOLA: Định danh người dùng lấy trực tiếp từ SecurityContext của Server Session.
   *
   * @param input Thông tin cập nhật (fullName, phone)
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<UserProfileDTO, string>>}
   */
  public async execute(
    input: UpdateProfileInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<UserProfileDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Chống IDOR: Chỉ cập nhật hồ sơ của chính người dùng đăng nhập
      const targetUserId = securityContext.userId;
      const user = await this.userRepository.findById(targetUserId);
      if (!user) {
        return failure('Người dùng không tồn tại');
      }

      const newPhone = PhoneNumber.create(input.phone);

      // Nếu thay đổi số điện thoại, kiểm tra trùng lặp với người dùng khác
      if (newPhone.toStandardString() !== user.getPhone().toStandardString()) {
        const existingWithPhone = await this.userRepository.findByPhone(newPhone.toStandardString());
        if (existingWithPhone && String(existingWithPhone.getId()) !== String(user.getId())) {
          return failure('Số điện thoại này đã được sử dụng bởi một tài khoản khác', {
            phone: ['Số điện thoại đã tồn tại trong hệ thống'],
          });
        }
      }

      user.updateProfile(input.fullName, newPhone);
      const savedUser = await this.userRepository.save(user);

      const output: UserProfileDTO = {
        id: String(savedUser.getId()),
        username: savedUser.getUsername(),
        fullName: savedUser.getFullName(),
        email: savedUser.getEmail(),
        phone: savedUser.getPhone().toStandardString(),
        role: savedUser.getRole(),
        status: savedUser.getStatus(),
        hubId: savedUser.getHubId() !== null ? String(savedUser.getHubId()) : null,
        lastLoginAt: savedUser.getLastLoginAt(),
        createdAt: savedUser.getCreatedAt(),
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Cập nhật thông tin thất bại: ${errorMsg}`);
    }
  }
}

export interface GetProfileInputDTO {
  userId?: string;
}

/**
 * Use Case Xem thông tin cá nhân (UC03).
 * Chống BOLA: Người dùng thông thường chỉ xem được chính mình; chỉ ADMIN mới có thể xem người khác.
 */
export class GetProfileUseCase implements IUseCase<GetProfileInputDTO, Result<UserProfileDTO, string>> {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(
    input: GetProfileInputDTO = {},
    securityContext?: SecurityContext
  ): Promise<Result<UserProfileDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Chống IDOR: Chỉ ADMIN mới được xem profile tài khoản khác
      let targetUserId = securityContext.userId;
      if (input.userId && input.userId !== securityContext.userId) {
        if (securityContext.role !== USER_ROLE.ADMIN) {
          return failure('Bạn chỉ có quyền xem thông tin cá nhân của chính mình');
        }
        targetUserId = input.userId;
      }

      const user = await this.userRepository.findById(targetUserId);
      if (!user) {
        return failure('Người dùng không tồn tại');
      }

      const output: UserProfileDTO = {
        id: String(user.getId()),
        username: user.getUsername(),
        fullName: user.getFullName(),
        email: user.getEmail(),
        phone: user.getPhone().toStandardString(),
        role: user.getRole(),
        status: user.getStatus(),
        hubId: user.getHubId() !== null ? String(user.getHubId()) : null,
        lastLoginAt: user.getLastLoginAt(),
        createdAt: user.getCreatedAt(),
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Lấy thông tin cá nhân thất bại: ${errorMsg}`);
    }
  }
}
