/**
 * @file assign-orders.use-case.ts
 * @description Use Case Điều phối & Gán danh sách đơn hàng cho Shipper (UC16).
 * Kiểm tra tính khả dụng của Shipper, tính hợp lệ của từng đơn hàng và gán hàng loạt trong 1 transaction ACID.
 * @module application/use-cases/shipments
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import {
  type AssignOrdersToShipperInputDTO,
  type AssignOrdersResultDTO,
} from '../../dtos/shipment.dto';
import { ORDER_STATUS } from '../../../domain/constants/order-status.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class AssignOrdersToShipperUseCase
  implements IUseCase<AssignOrdersToShipperInputDTO, Result<AssignOrdersResultDTO, string>>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Thực thi gán danh sách đơn hàng cho Shipper theo đợt (Batch).
   * Áp dụng nguyên tắc Fail-Closed, RBAC và Data Ownership trạm.
   *
   * @param input DTO điều phối gán đơn
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<AssignOrdersResultDTO, string>>}
   */
  public async execute(
    input: AssignOrdersToShipperInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<AssignOrdersResultDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phân quyền RBAC & Sở hữu dữ liệu trạm
      if (securityContext.role === USER_ROLE.SHIPPER) {
        return failure('Nhân viên giao hàng không có quyền điều phối đơn hàng');
      }

      if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        if (String(input.hubId) !== String(securityContext.hubId)) {
          return failure('Bạn chỉ có quyền điều phối đơn hàng tại trạm của mình');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền điều phối đơn hàng');
      }

      // 3. Kiểm tra Shipper
      const shipper = await this.userRepository.findById(input.shipperId);
      if (!shipper) {
        return failure('Nhân viên giao hàng (Shipper) không tồn tại trên hệ thống', {
          shipperId: ['Không tìm thấy Shipper'],
        });
      }

      if (!shipper.isShipper()) {
        return failure('Nhân sự được chọn không phải là Shipper');
      }

      if (!shipper.isActive()) {
        return failure('Tài khoản Shipper này hiện đang bị khóa hoặc ngừng hoạt động');
      }

      if (String(shipper.getHubId()) !== String(input.hubId)) {
        return failure('Shipper này không thuộc trạm giao nhận thực hiện điều phối');
      }

      // 2. Kiểm tra danh sách đơn hàng hợp lệ
      const validOrderIds: (string | number)[] = [];
      const errors: { orderId: string; reason: string }[] = [];

      for (const orderId of input.orderIds) {
        const order = await this.orderRepository.findById(orderId);
        if (!order) {
          errors.push({ orderId, reason: 'Đơn hàng không tồn tại' });
          continue;
        }

        if (String(order.getCurrentHubId()) !== String(input.hubId)) {
          errors.push({ orderId, reason: 'Đơn hàng không có mặt tại trạm hiện tại' });
          continue;
        }

        const currentStatus = order.getCurrentStatus();
        if (
          currentStatus !== ORDER_STATUS.AT_HUB &&
          currentStatus !== ORDER_STATUS.FAILED_ATTEMPT
        ) {
          errors.push({
            orderId,
            reason: `Đơn hàng đang ở trạng thái "${currentStatus}", không thể gán đi giao`,
          });
          continue;
        }

        validOrderIds.push(order.getId()!);
      }

      if (validOrderIds.length === 0) {
        return failure('Không có đơn hàng nào hợp lệ để gán cho Shipper', {
          orderIds: errors.map((e) => `${e.orderId}: ${e.reason}`),
        });
      }

      // 4. Thực hiện gán hàng loạt trong Transaction ACID
      const actorId = securityContext.userId;
      const note = `Đã bàn giao cho Shipper ${shipper.getFullName()}`;

      const assignedCount = await this.orderRepository.assignOrdersBatch(
        validOrderIds,
        input.shipperId,
        actorId,
        note
      );

      const output: AssignOrdersResultDTO = {
        totalRequested: input.orderIds.length,
        assignedCount,
        failedCount: errors.length,
        assignedOrderIds: validOrderIds.map(String),
        errors,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Điều phối đơn hàng thất bại: ${errorMsg}`);
    }
  }
}
