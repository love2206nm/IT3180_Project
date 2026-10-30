/**
 * @file mark-failed-attempt.use-case.ts
 * @description Use Case Báo giao thất bại & Tái giao hoặc Chuyển hoàn (UC19).
 * Tự động tăng bộ đếm số lần giao; nếu đạt tối đa 3 lần hoặc khách từ chối, tự động chuyển RETURN_PENDING.
 * @module application/use-cases/shipments
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import { OrderStatusLog } from '../../../domain/entities/order-status-log.entity';
import { Coordinates } from '../../../domain/value-objects/coordinates.vo';
import { type MarkFailedAttemptInputDTO } from '../../dtos/shipment.dto';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { DELIVERY_FAILURE_REASON } from '../../../domain/constants/failure-reasons.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export interface MarkFailedAttemptOutputDTO {
  orderId: string;
  status: OrderStatus;
  deliveryAttempts: number;
  isReturnPending: boolean;
}

export class MarkFailedAttemptUseCase
  implements IUseCase<MarkFailedAttemptInputDTO, Result<MarkFailedAttemptOutputDTO, string>>
{
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * Thực thi báo cáo giao hàng không thành công.
   * Áp dụng nguyên tắc Fail-Closed và Data Ownership (chỉ Shipper được gán mới được thao tác).
   *
   * @param input DTO báo giao thất bại
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<MarkFailedAttemptOutputDTO, string>>}
   */
  public async execute(
    input: MarkFailedAttemptInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<MarkFailedAttemptOutputDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      const order = await this.orderRepository.findById(input.orderId);
      if (!order) {
        return failure('Đơn hàng không tồn tại trên hệ thống');
      }

      // 2. Phân quyền & Định danh Shipper an toàn
      const shipperId = securityContext.userId;
      if (securityContext.role === USER_ROLE.SHIPPER) {
        if (String(order.getAssignedShipperId()) !== shipperId) {
          return failure('Đơn hàng này không được phân công cho bạn đi giao');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Chỉ nhân viên giao hàng được phân công mới có quyền báo giao thất bại');
      }

      // 3. Kiểm tra trạng thái hiện tại
      if (order.getCurrentStatus() !== ORDER_STATUS.OUT_FOR_DELIVERY) {
        return failure(
          `Không thể báo giao thất bại vì đơn hàng đang ở trạng thái "${order.getCurrentStatus()}" (phải là OUT_FOR_DELIVERY)`
        );
      }

      const previousStatus = order.getCurrentStatus();

      // 4. Cập nhật số lần giao thất bại
      order.recordFailedAttempt(input.failureReason);

      // Nếu khách từ chối nhận hàng (CUSTOMER_REJECTED), chuyển thẳng sang RETURN_PENDING
      if (input.failureReason === DELIVERY_FAILURE_REASON.CUSTOMER_REJECTED) {
        order.markReturnPending();
      }

      const newStatus = order.getCurrentStatus();

      // 5. Tọa độ GPS nếu có
      let locationVo: Coordinates | null = null;
      if (input.locationLat !== undefined && input.locationLng !== undefined) {
        locationVo = Coordinates.create(input.locationLat, input.locationLng);
      }

      // 6. Tạo audit log
      const log = new OrderStatusLog({
        orderId: order.getId()!,
        hubId: order.getCurrentHubId(),
        actorId: shipperId,
        previousStatus,
        newStatus,
        failureReason: input.failureReason,
        proofImageUrl: input.proofImageUrl ?? null,
        location: locationVo,
        note: input.note ?? `Giao hàng không thành công: ${input.failureReason}`,
      });

      const saved = await this.orderRepository.saveWithAuditLog(order, log);

      const isReturnPending = saved.getCurrentStatus() === ORDER_STATUS.RETURN_PENDING;

      const output: MarkFailedAttemptOutputDTO = {
        orderId: String(saved.getId()),
        status: saved.getCurrentStatus(),
        deliveryAttempts: saved.getDeliveryAttempts(),
        isReturnPending,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Báo giao thất bại gặp lỗi: ${errorMsg}`);
    }
  }
}
