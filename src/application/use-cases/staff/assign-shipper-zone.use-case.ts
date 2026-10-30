/**
 * @file assign-shipper-zone.use-case.ts
 * @description Use Case Phân công tuyến giao hàng cho Shipper (UC08).
 * Kiểm tra Shipper và Tuyến đường cùng trực thuộc trạm, cập nhật phân bổ.
 * @module application/use-cases/staff
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import type { IDeliveryZoneRepository } from '../../../domain/interface/repositories/delivery-zone.repository.interface';
import { type AssignShipperZoneInputDTO } from '../../dtos/staff.dto';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class AssignShipperZoneUseCase
  implements IUseCase<AssignShipperZoneInputDTO, Result<{ message: string }, string>>
{
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly deliveryZoneRepository: IDeliveryZoneRepository
  ) {}

  public async execute(
    input: AssignShipperZoneInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<{ message: string }, string>> {
    try {
      // 1. Kiểm tra Shipper
      const shipper = await this.userRepository.findById(input.shipperId);
      if (!shipper) {
        return failure('Shipper không tồn tại trên hệ thống', {
          shipperId: ['Không tìm thấy Shipper'],
        });
      }

      if (!shipper.isShipper()) {
        return failure('Nhân sự này không có vai trò là Nhân viên giao hàng (Shipper)');
      }

      if (!shipper.isActive()) {
        return failure('Tài khoản Shipper này hiện đang bị khóa hoặc ngừng hoạt động');
      }

      // 2. Kiểm tra Tuyến đường
      const zone = await this.deliveryZoneRepository.findById(input.zoneId);
      if (!zone) {
        return failure('Tuyến giao hàng không tồn tại trên hệ thống', {
          zoneId: ['Không tìm thấy Tuyến giao hàng'],
        });
      }

      // 3. Khớp trạm giữa Shipper và Tuyến đường
      if (String(shipper.getHubId()) !== String(zone.getHubId())) {
        return failure('Shipper và Tuyến giao hàng phải cùng trực thuộc một trạm giao nhận');
      }

      // 4. Kiểm tra Fail-Closed & Phân quyền RBAC
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      if (securityContext.role === USER_ROLE.HUB_MANAGER) {
        if (String(shipper.getHubId()) !== String(securityContext.hubId)) {
          return failure('Quản lý trạm chỉ được phân tuyến cho Shipper thuộc trạm của mình');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền phân tuyến giao hàng');
      }

      // 5. Gán tuyến
      await this.deliveryZoneRepository.assignShipperToZone(input.shipperId, input.zoneId);

      return success({
        message: `Đã phân công tuyến "${zone.getName()}" cho Shipper "${shipper.getFullName()}" thành công`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Phân tuyến Shipper thất bại: ${errorMsg}`);
    }
  }
}
