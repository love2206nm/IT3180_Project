/**
 * @file create-staff.use-case.ts
 * @description Use Case Thêm mới nhân sự & Cấp tài khoản (UC05).
 * Kiểm tra RBAC, tính duy nhất của username/email/phone, băm mật khẩu và lưu người dùng mới.
 * @module application/use-cases/staff
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import type { IPasswordHasherService } from '../../interfaces/password-hasher.service.interface';
import { User } from '../../../domain/entities/user.entity';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { type CreateStaffInputDTO, type StaffItemDTO } from '../../dtos/staff.dto';
import { USER_ROLE } from '../../../domain/constants/roles.constant';
import { USER_STATUS } from '../../../domain/constants/user-status.constant';

export class CreateStaffUseCase
  implements IUseCase<CreateStaffInputDTO, Result<StaffItemDTO, string>>
{
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hubRepository: IHubRepository,
    private readonly passwordHasher: IPasswordHasherService
  ) {}

  /**
   * Thực thi tạo mới nhân sự
   * Áp dụng nguyên tắc Fail-Closed và phân quyền chặt chẽ RBAC.
   *
   * @param input Dữ liệu tạo nhân viên
   * @param securityContext Ngữ cảnh người dùng đang thao tác
   * @returns {Promise<Result<StaffItemDTO, string>>}
   */
  public async execute(
    input: CreateStaffInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<StaffItemDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phân quyền RBAC Defense-in-Depth
      if (securityContext.role === USER_ROLE.HUB_MANAGER) {
        if (input.role === USER_ROLE.ADMIN || input.role === USER_ROLE.HUB_MANAGER) {
          return failure('Quản lý trạm không được phép tạo tài khoản Quản trị viên hoặc Quản lý khác');
        }
        if (!securityContext.hubId) {
          return failure('Tài khoản Quản lý chưa được gán trạm làm việc trực thuộc');
        }
        if (input.hubId !== securityContext.hubId) {
          return failure('Quản lý trạm chỉ được phép tạo nhân sự thuộc trạm của mình');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền thêm mới nhân sự vào hệ thống');
      }

      // 2. Ràng buộc chức vụ với trạm
      let targetHubId = input.hubId ?? null;
      if (input.role !== USER_ROLE.ADMIN && !targetHubId) {
        return failure('Nhân sự chức vụ này bắt buộc phải gắn với một trạm giao nhận cụ thể', {
          hubId: ['Vui lòng chọn trạm làm việc'],
        });
      }

      if (targetHubId) {
        const hub = await this.hubRepository.findById(targetHubId);
        if (!hub) {
          return failure('Trạm giao nhận được chọn không tồn tại trên hệ thống', {
            hubId: ['Trạm không hợp lệ'],
          });
        }
      }

      // 3. Kiểm tra tính duy nhất (Username, Email, Phone)
      const existingUsername = await this.userRepository.findByUsername(input.username);
      if (existingUsername) {
        return failure('Tên đăng nhập này đã tồn tại trên hệ thống', {
          username: ['Tên đăng nhập đã được sử dụng'],
        });
      }

      const existingEmail = await this.userRepository.findByEmail(input.email);
      if (existingEmail) {
        return failure('Địa chỉ email này đã được sử dụng', {
          email: ['Email đã tồn tại'],
        });
      }

      const phoneVo = PhoneNumber.create(input.phone);
      const existingPhone = await this.userRepository.findByPhone(phoneVo.toStandardString());
      if (existingPhone) {
        return failure('Số điện thoại này đã được sử dụng bởi một tài khoản khác', {
          phone: ['Số điện thoại đã tồn tại'],
        });
      }

      // 4. Băm mật khẩu
      const passwordHash = await this.passwordHasher.hash(input.password);

      // 5. Khởi tạo thực thể User
      const newUser = new User({
        username: input.username,
        passwordHash,
        fullName: input.fullName,
        email: input.email,
        phone: phoneVo,
        role: input.role,
        hubId: targetHubId,
        status: USER_STATUS.ACTIVE,
      });

      const saved = await this.userRepository.save(newUser);

      let hubName: string | null = null;
      if (targetHubId) {
        const hub = await this.hubRepository.findById(targetHubId);
        hubName = hub ? hub.getName() : null;
      }

      const output: StaffItemDTO = {
        id: String(saved.getId()),
        hubId: saved.getHubId() !== null ? String(saved.getHubId()) : null,
        hubName,
        username: saved.getUsername(),
        fullName: saved.getFullName(),
        email: saved.getEmail(),
        phone: saved.getPhone().toStandardString(),
        role: saved.getRole(),
        status: saved.getStatus(),
        lastLoginAt: saved.getLastLoginAt(),
        createdAt: saved.getCreatedAt(),
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Thêm mới nhân viên thất bại: ${errorMsg}`);
    }
  }
}
