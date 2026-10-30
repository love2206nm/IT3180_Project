/**
 * @file toggle-staff-status.use-case.ts
 * @description Use Case Khóa / Mở khóa tài khoản nhân viên (UC07).
 * @module application/use-cases/staff
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import { type ToggleStaffStatusInputDTO } from '../../dtos/staff.dto';
import { USER_ROLE } from '../../../domain/constants/roles.constant';
import { USER_STATUS, type UserStatus } from '../../../domain/constants/user-status.constant';

export class ToggleStaffStatusUseCase
  implements IUseCase<ToggleStaffStatusInputDTO, Result<{ id: string; status: UserStatus }, string>>
{
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(
    input: ToggleStaffStatusInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<{ id: string; status: UserStatus }, string>> {
    try {
      const targetUser = await this.userRepository.findById(input.id);
      if (!targetUser) {
        return failure('Nhân viên không tồn tại trên hệ thống');
      }

      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Ngăn chặn tự khóa tài khoản của chính mình
      if (securityContext.userId === String(targetUser.getId())) {
        return failure('Bạn không thể tự thay đổi trạng thái tài khoản của chính mình');
      }

      // 3. Phân quyền RBAC
      if (securityContext.role === USER_ROLE.HUB_MANAGER) {
        if (String(targetUser.getHubId()) !== String(securityContext.hubId)) {
          return failure('Quản lý trạm chỉ được thao tác trên nhân sự thuộc trạm của mình');
        }
        if (targetUser.isAdmin() || targetUser.isHubManager()) {
          return failure('Quản lý trạm không có thẩm quyền khóa tài khoản Quản trị viên hoặc Quản lý khác');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền thay đổi trạng thái tài khoản nhân sự');
      }

      // 3. Thực hiện chuyển đổi trạng thái
      if (input.status === USER_STATUS.ACTIVE) {
        targetUser.activate();
      } else if (input.status === USER_STATUS.INACTIVE) {
        targetUser.deactivate();
      } else if (input.status === USER_STATUS.LOCKED) {
        targetUser.lock();
      }

      const saved = await this.userRepository.save(targetUser);

      return success({
        id: String(saved.getId()),
        status: saved.getStatus(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Cập nhật trạng thái nhân viên thất bại: ${errorMsg}`);
    }
  }
}
