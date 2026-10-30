/**
 * @file check-in-hub.use-case.ts
 * @description Use Case Quét mã Check-in nhập trạm (Inbound Scan - UC15).
 * Kiểm tra mã vận đơn, cập nhật trạng thái AT_HUB và vị trí trạm trong 1 transaction ACID.
 * @module application/use-cases/shipments
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import { OrderStatusLog } from '../../../domain/entities/order-status-log.entity';
import { type CheckInHubInputDTO } from '../../dtos/shipment.dto';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export interface CheckInHubOutputDTO {
  orderId: string;
  trackingCode: string;
  status: OrderStatus;
  hubName: string;
}

export class CheckInHubUseCase
  implements IUseCase<CheckInHubInputDTO, Result<CheckInHubOutputDTO, string>>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly hubRepository: IHubRepository
  ) {}

  /**
   * Thực thi quét mã Inbound Check-in nhập trạm.
   * Áp dụng nguyên tắc Fail-Closed, RBAC và Hub Isolation.
   *
   * @param input DTO quét mã check-in
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<CheckInHubOutputDTO, string>>}
   */
  public async execute(
    input: CheckInHubInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<CheckInHubOutputDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phân quyền RBAC & Sở hữu trạm
      if (securityContext.role === USER_ROLE.SHIPPER) {
        return failure('Nhân viên giao hàng không có quyền quét mã nhập kho');
      }

      if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        if (String(input.hubId) !== String(securityContext.hubId)) {
          return failure('Bạn chỉ có quyền quét mã nhập kho tại trạm của mình');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền quét mã nhập kho');
      }

      // 3. Kiểm tra Trạm tiếp nhận
      const hub = await this.hubRepository.findById(input.hubId);
      if (!hub) {
        return failure('Trạm giao nhận không tồn tại trên hệ thống');
      }

      // 4. Tìm đơn hàng theo mã vận đơn
      const normalizedCode = input.trackingCode.trim().toUpperCase();
      const order = await this.orderRepository.findByTrackingCode(normalizedCode);
      if (!order) {
        return failure('Mã vận đơn không tồn tại trên hệ thống. Quý khách vui lòng kiểm tra lại');
      }

      // 5. Kiểm tra trạng thái đơn: không cho phép nhập kho nếu đã kết thúc
      if (order.isFinalState()) {
        return failure(
          `Đơn hàng đang ở trạng thái "${order.getCurrentStatus()}" đã kết thúc, không thể quét nhập trạm`
        );
      }

      const previousStatus = order.getCurrentStatus();

      // 6. Cập nhật trạng thái sang AT_HUB
      order.markArrivedAtHub(input.hubId);

      // 7. Ghi log kiểm vết
      const actorId = securityContext.userId;
      const logNote = input.note ?? `Đã quét mã nhập kho tại ${hub.getName()}`;

      const log = new OrderStatusLog({
        orderId: order.getId()!,
        hubId: input.hubId,
        actorId,
        previousStatus,
        newStatus: ORDER_STATUS.AT_HUB,
        note: logNote,
      });

      const saved = await this.orderRepository.saveWithAuditLog(order, log);

      const output: CheckInHubOutputDTO = {
        orderId: String(saved.getId()),
        trackingCode: saved.getTrackingCode().getValue(),
        status: saved.getCurrentStatus(),
        hubName: hub.getName(),
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Quét mã nhập trạm thất bại: ${errorMsg}`);
    }
  }
}
