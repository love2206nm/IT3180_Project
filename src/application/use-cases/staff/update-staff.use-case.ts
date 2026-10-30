/**
 * @file update-staff.use-case.ts
 * @description Use Case Cập nhật thông tin nhân viên & Điều chuyển trạm (UC06).
 * @module application/use-cases/staff
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { type UpdateStaffInputDTO, type StaffItemDTO } from '../../dtos/staff.dto';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class UpdateStaffUseCase
  implements IUseCase<UpdateStaffInputDTO, Result<StaffItemDTO, string>>
{
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hubRepository: IHubRepository
  ) {}

  public async execute(
    input: UpdateStaffInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<StaffItemDTO, string>> {
    try {
      const targetUser = await this.userRepository.findById(input.id);
      if (!targetUser) {
        return failure('Nhân viên không tồn tại trên hệ thống');
      }

      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phân quyền RBAC
      if (securityContext.role === USER_ROLE.HUB_MANAGER) {
        if (String(targetUser.getHubId()) !== String(securityContext.hubId)) {
          return failure('Quản lý trạm chỉ được phép cập nhật nhân viên thuộc trạm của mình');
        }
        if (targetUser.isAdmin() || targetUser.isHubManager()) {
          return failure('Quản lý trạm không có thẩm quyền chỉnh sửa tài khoản Quản trị viên hoặc Quản lý khác');
        }
        if (input.role === USER_ROLE.ADMIN || input.role === USER_ROLE.HUB_MANAGER) {
          return failure('Quản lý trạm không được phép thăng chức nhân viên lên Quản trị viên hoặc Quản lý');
        }
        if (input.hubId && input.hubId !== securityContext.hubId) {
          return failure('Chỉ Quản trị viên (Admin) mới có quyền điều chuyển nhân viên sang trạm khác');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền chỉnh sửa thông tin nhân sự');
      }

      // 2. Cập nhật Số điện thoại nếu có
      let phoneVo = targetUser.getPhone();
      if (input.phone) {
        phoneVo = PhoneNumber.create(input.phone);
        if (phoneVo.toStandardString() !== targetUser.getPhone().toStandardString()) {
          const existingPhone = await this.userRepository.findByPhone(phoneVo.toStandardString());
          if (existingPhone && String(existingPhone.getId()) !== String(targetUser.getId())) {
            return failure('Số điện thoại này đã được sử dụng bởi một tài khoản khác', {
              phone: ['Số điện thoại đã tồn tại'],
            });
          }
        }
      }

      // 3. Cập nhật Họ tên
      const fullName = input.fullName ?? targetUser.getFullName();
      targetUser.updateProfile(fullName, phoneVo);

      // 4. Điều chuyển trạm nếu có
      if (input.hubId !== undefined) {
        if (input.hubId !== null) {
          const hub = await this.hubRepository.findById(input.hubId);
          if (!hub) {
            return failure('Trạm đích điều chuyển không tồn tại', {
              hubId: ['Trạm không hợp lệ'],
            });
          }
          targetUser.changeHub(input.hubId);
        }
      }

      const saved = await this.userRepository.save(targetUser);

      let hubName: string | null = null;
      if (saved.getHubId()) {
        const hub = await this.hubRepository.findById(saved.getHubId()!);
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
      return failure(`Cập nhật thông tin nhân viên thất bại: ${errorMsg}`);
    }
  }
}
