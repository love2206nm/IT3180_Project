/**
 * @file get-staff-list.use-case.ts
 * @description Use Case Xem danh sách nhân viên phân trang và lọc theo tiêu chí (UC04).
 * Hỗ trợ phân quyền RBAC: Hub Manager chỉ xem được nhân sự thuộc trạm của mình.
 * @module application/use-cases/staff
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import { type GetStaffListQueryDTO, type StaffListOutputDTO, type StaffItemDTO } from '../../dtos/staff.dto';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class GetStaffListUseCase
  implements IUseCase<GetStaffListQueryDTO, Result<StaffListOutputDTO, string>>
{
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hubRepository: IHubRepository
  ) {}

  /**
   * Thực thi tìm kiếm danh sách nhân sự
   * @param query Tiêu chí lọc và phân trang
   * @param securityContext Ngữ cảnh người dùng đang thao tác
   * @returns {Promise<Result<StaffListOutputDTO, string>>}
   */
  public async execute(
    query: GetStaffListQueryDTO,
    securityContext?: SecurityContext
  ): Promise<Result<StaffListOutputDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phòng thủ sâu RBAC: Hub Manager chỉ được xem nhân sự tại trạm của mình
      let effectiveHubId = query.hubId;
      if (securityContext.role === USER_ROLE.HUB_MANAGER) {
        if (!securityContext.hubId) {
          return failure('Tài khoản Quản lý trạm chưa được gán trạm trực thuộc');
        }
        effectiveHubId = securityContext.hubId;
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền xem danh sách nhân sự hệ thống');
      }

      const page = query.page ?? 1;
      const limit = query.limit ?? 10;

      const { users, total } = await this.userRepository.search({
        hubId: effectiveHubId,
        role: query.role,
        status: query.status,
        page,
        limit,
      });

      // Lấy thông tin trạm để enrich hubName
      const hubMap = new Map<string, string>();
      const hubIds = Array.from(
        new Set(users.map((u) => u.getHubId()).filter((id): id is string | number => id !== null))
      );

      for (const hid of hubIds) {
        const hub = await this.hubRepository.findById(hid);
        if (hub) {
          hubMap.set(String(hid), hub.getName());
        }
      }

      const items: StaffItemDTO[] = users.map((u) => {
        const hubId = u.getHubId() !== null ? String(u.getHubId()) : null;
        return {
          id: String(u.getId()),
          hubId,
          hubName: hubId ? hubMap.get(hubId) ?? null : null,
          username: u.getUsername(),
          fullName: u.getFullName(),
          email: u.getEmail(),
          phone: u.getPhone().toStandardString(),
          role: u.getRole(),
          status: u.getStatus(),
          lastLoginAt: u.getLastLoginAt(),
          createdAt: u.getCreatedAt(),
        };
      });

      const totalPages = Math.ceil(total / limit) || 1;

      const output: StaffListOutputDTO = {
        items,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Không thể lấy danh sách nhân sự: ${errorMsg}`);
    }
  }
}
