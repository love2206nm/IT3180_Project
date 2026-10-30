/**
 * @file cancel-order.use-case.ts
 * @description Use Case Hủy đơn hàng (UC13).
 * Kiểm tra điều kiện hợp lệ, chuyển trạng thái CANCELLED và ghi log kiểm vết trong 1 transaction ACID.
 * @module application/use-cases/orders
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import { OrderStatusLog } from '../../../domain/entities/order-status-log.entity';
import { type CancelOrderInputDTO } from '../../dtos/order.dto';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class CancelOrderUseCase
  implements IUseCase<CancelOrderInputDTO, Result<{ id: string; status: OrderStatus }, string>>
{
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * Thực thi hủy đơn hàng.
   * Áp dụng nguyên tắc Fail-Closed, RBAC và chống BOLA đa trạm.
   *
   * @param input DTO hủy đơn
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<{ id: string; status: OrderStatus }, string>>}
   */
  public async execute(
    input: CancelOrderInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<{ id: string; status: OrderStatus }, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      const order = await this.orderRepository.findById(input.id);
      if (!order) {
        return failure('Đơn hàng không tồn tại trên hệ thống');
      }

      // 2. Phân quyền RBAC & Sở hữu dữ liệu trạm
      if (securityContext.role === USER_ROLE.SHIPPER) {
        return failure('Nhân viên giao hàng (Shipper) không có quyền hủy đơn hàng');
      }

      if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        const orderHubId = order.getCurrentHubId();
        if (!orderHubId || String(orderHubId) !== String(securityContext.hubId)) {
          return failure('Bạn chỉ có quyền hủy đơn hàng đang trực thuộc trạm của mình');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền hủy đơn hàng');
      }

      // 3. Kiểm tra trạng thái không được hủy
      if (order.getCurrentStatus() === ORDER_STATUS.CANCELLED) {
        return failure('Đơn hàng này đã bị hủy trước đó');
      }

      if (order.getCurrentStatus() === ORDER_STATUS.DELIVERED) {
        return failure('Không thể hủy đơn hàng đã giao thành công cho khách');
      }

      if (order.getCurrentStatus() === ORDER_STATUS.RETURNED) {
        return failure('Không thể hủy đơn hàng đã hoàn tất chuyển hoàn');
      }

      if (order.getCurrentStatus() === ORDER_STATUS.OUT_FOR_DELIVERY) {
        return failure('Đơn hàng đang trên đường giao, vui lòng yêu cầu Shipper báo giao thất bại trước khi hủy');
      }

      const previousStatus = order.getCurrentStatus();

      // Cập nhật thực thể
      order.cancel(input.reason);

      // Tạo audit log
      const actorId = securityContext.userId;
      const log = new OrderStatusLog({
        orderId: order.getId()!,
        hubId: order.getCurrentHubId(),
        actorId,
        previousStatus,
        newStatus: ORDER_STATUS.CANCELLED,
        note: `Đơn hàng đã bị hủy. Lý do: ${input.reason}`,
      });

      const saved = await this.orderRepository.saveWithAuditLog(order, log);

      return success({
        id: String(saved.getId()),
        status: saved.getCurrentStatus(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Hủy đơn hàng thất bại: ${errorMsg}`);
    }
  }
}
