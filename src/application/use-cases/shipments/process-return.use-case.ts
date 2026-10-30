/**
 * @file process-return.use-case.ts
 * @description Use Case Xuất trạm chuyển hoàn về người gửi / kho gốc (UC20).
 * Quản lý vòng đời đơn hàng chuyển hoàn: RETURN_PENDING -> RETURNING -> RETURNED.
 * @module application/use-cases/shipments
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import { OrderStatusLog } from '../../../domain/entities/order-status-log.entity';
import { type ProcessReturnOrderInputDTO } from '../../dtos/shipment.dto';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class ProcessReturnOrderUseCase
  implements IUseCase<ProcessReturnOrderInputDTO, Result<{ orderId: string; status: OrderStatus }, string>>
{
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * Thực thi xuất trạm chuyển hoàn về người gửi.
   * Áp dụng nguyên tắc Fail-Closed, RBAC và Hub Isolation.
   *
   * @param input DTO xử lý hoàn
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<{ orderId: string; status: OrderStatus }, string>>}
   */
  public async execute(
    input: ProcessReturnOrderInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<{ orderId: string; status: OrderStatus }, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phân quyền RBAC & Sở hữu trạm (Kiểm tra trước khi truy vấn DB để chống DoS)
      if (securityContext.role === USER_ROLE.SHIPPER) {
        return failure('Chỉ Quản lý trạm hoặc Nhân viên điều phối kho mới có quyền xử lý chuyển hoàn');
      }

      if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        if (String(input.hubId) !== String(securityContext.hubId)) {
          return failure('Bạn chỉ có quyền xử lý chuyển hoàn tại trạm của mình');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền xử lý chuyển hoàn');
      }

      const order = await this.orderRepository.findById(input.orderId);
      if (!order) {
        return failure('Đơn hàng không tồn tại trên hệ thống');
      }

      const currentStatus = order.getCurrentStatus();

      if (currentStatus !== ORDER_STATUS.RETURN_PENDING) {
        return failure(
          `Đơn hàng đang ở trạng thái "${currentStatus}", không thể xử lý chuyển hoàn (phải ở trạng thái RETURN_PENDING)`
        );
      }

      // Chuyển sang RETURNED
      order.markReturned();
      const targetStatus = ORDER_STATUS.RETURNED;
      const logNote = input.note ?? 'Đã hoàn tất trả hàng về tay người gửi thành công';

      const actorId = securityContext.userId;

      const log = new OrderStatusLog({
        orderId: order.getId()!,
        hubId: input.hubId,
        actorId,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        note: logNote,
      });

      const saved = await this.orderRepository.saveWithAuditLog(order, log);

      return success({
        orderId: String(saved.getId()),
        status: saved.getCurrentStatus(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Xử lý chuyển hoàn thất bại: ${errorMsg}`);
    }
  }
}
