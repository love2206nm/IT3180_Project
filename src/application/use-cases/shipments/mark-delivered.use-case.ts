/**
 * @file mark-delivered.use-case.ts
 * @description Use Case Xác nhận Giao hàng thành công (POD & Thu tiền COD - UC17, UC18).
 * Kiểm tra phân công Shipper, xác thực số tiền COD thu khớp giá trị đơn, lưu ảnh POD và tọa độ GPS trong 1 transaction ACID.
 * @module application/use-cases/shipments
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import { OrderStatusLog } from '../../../domain/entities/order-status-log.entity';
import { Coordinates } from '../../../domain/value-objects/coordinates.vo';
import { Money } from '../../../domain/value-objects/money.vo';
import { type MarkDeliveredInputDTO } from '../../dtos/shipment.dto';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export interface MarkDeliveredOutputDTO {
  orderId: string;
  status: OrderStatus;
  codCollected: number;
}

export class MarkDeliveredUseCase
  implements IUseCase<MarkDeliveredInputDTO, Result<MarkDeliveredOutputDTO, string>>
{
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * Thực thi xác nhận giao hàng thành công (POD).
   * Áp dụng nguyên tắc Fail-Closed và Data Ownership (chỉ Shipper được gán mới được xác nhận).
   *
   * @param input DTO xác nhận giao hàng
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<MarkDeliveredOutputDTO, string>>}
   */
  public async execute(
    input: MarkDeliveredInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<MarkDeliveredOutputDTO, string>> {
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
        return failure('Chỉ nhân viên giao hàng được phân công mới có quyền xác nhận giao hàng');
      }

      // 3. Kiểm tra trạng thái hiện tại
      if (order.getCurrentStatus() !== ORDER_STATUS.OUT_FOR_DELIVERY) {
        return failure(
          `Không thể xác nhận giao thành công vì đơn hàng đang ở trạng thái "${order.getCurrentStatus()}" (phải là OUT_FOR_DELIVERY)`
        );
      }

      // 4. Kiểm tra số tiền COD thực thu
      const codCollectedVo = Money.fromNumber(input.codCollected);
      if (order.requiresCOD()) {
        if (!codCollectedVo.equals(order.getCodAmount())) {
          return failure(
            `Số tiền COD thực thu (${codCollectedVo.formatVND()}) không khớp với số tiền cần thu của đơn (${order.getCodAmount().formatVND()})`,
            {
              codCollected: ['Số tiền COD không chính xác'],
            }
          );
        }
      }

      const previousStatus = order.getCurrentStatus();

      // 5. Cập nhật thực thể
      order.markDelivered(codCollectedVo);

      // 6. Xử lý tọa độ GPS nếu có
      let locationVo: Coordinates | null = null;
      if (input.locationLat !== undefined && input.locationLng !== undefined) {
        locationVo = Coordinates.create(input.locationLat, input.locationLng);
      }

      // 7. Tạo bản ghi audit log
      const log = new OrderStatusLog({
        orderId: order.getId()!,
        hubId: order.getCurrentHubId(),
        actorId: shipperId,
        previousStatus,
        newStatus: ORDER_STATUS.DELIVERED,
        proofImageUrl: input.proofImageUrl ?? null,
        location: locationVo,
        note: input.note ?? 'Giao hàng thành công đến tay người nhận',
      });

      const saved = await this.orderRepository.saveWithAuditLog(order, log);

      const output: MarkDeliveredOutputDTO = {
        orderId: String(saved.getId()),
        status: saved.getCurrentStatus(),
        codCollected: input.codCollected,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Xác nhận giao hàng thất bại: ${errorMsg}`);
    }
  }
}
