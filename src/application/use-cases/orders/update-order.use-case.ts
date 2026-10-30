/**
 * @file update-order.use-case.ts
 * @description Use Case Cập nhật thông tin đơn hàng trước khi xuất kho giao (UC12).
 * Chỉ cho phép cập nhật khi đơn đang ở trạng thái CREATED hoặc AT_HUB.
 * @module application/use-cases/orders
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { Address } from '../../../domain/value-objects/address.vo';
import { type UpdateOrderInputDTO, type OrderDetailDTO } from '../../dtos/order.dto';
import { ORDER_STATUS } from '../../../domain/constants/order-status.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class UpdateOrderUseCase
  implements IUseCase<UpdateOrderInputDTO, Result<OrderDetailDTO, string>>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly hubRepository: IHubRepository
  ) {}

  /**
   * Thực thi cập nhật thông tin đơn hàng
   * Áp dụng chính sách Fail-Closed, chống Delivery Hijacking và Horizontal Privilege Escalation.
   *
   * @param input Thông tin cập nhật đơn hàng
   * @param securityContext Ngữ cảnh người dùng thực hiện thao tác
   * @returns {Promise<Result<OrderDetailDTO, string>>}
   */
  public async execute(
    input: UpdateOrderInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<OrderDetailDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed: Bắt buộc phải có SecurityContext từ phiên hợp lệ
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      const order = await this.orderRepository.findById(input.id);
      if (!order) {
        return failure('Đơn hàng không tồn tại trên hệ thống');
      }

      // 2. Phân quyền RBAC & Kiểm soát phạm vi trạm (Hub Isolation)
      if (securityContext.role === USER_ROLE.SHIPPER) {
        return failure('Nhân viên giao hàng không có quyền chỉnh sửa thông tin người nhận của đơn hàng');
      }

      if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        const orderHubId = order.getCurrentHubId();
        if (!orderHubId || String(orderHubId) !== String(securityContext.hubId)) {
          return failure('Bạn chỉ có quyền cập nhật đơn hàng đang trực thuộc trạm của mình');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền chỉnh sửa đơn hàng');
      }

      // 3. Kiểm tra trạng thái: Không được phép sửa khi đang giao hoặc đã kết thúc
      if (
        order.getCurrentStatus() !== ORDER_STATUS.CREATED &&
        order.getCurrentStatus() !== ORDER_STATUS.AT_HUB
      ) {
        return failure(
          `Không thể chỉnh sửa thông tin khi đơn hàng đang ở trạng thái "${order.getCurrentStatus()}" (chỉ cho phép sửa khi đơn ở trạm hoặc mới tạo)`
        );
      }

      // Xây dựng thông tin cập nhật
      const receiverName = input.receiverName ?? order.getReceiverName();
      const receiverPhone = input.receiverPhone
        ? PhoneNumber.create(input.receiverPhone)
        : order.getReceiverPhone();

      const currentAddr = order.getReceiverAddress();
      const receiverAddress = Address.create({
        street: input.receiverAddress ?? currentAddr.getStreet(),
        province: input.receiverProvince ?? currentAddr.getProvince(),
        district: input.receiverDistrict ?? currentAddr.getDistrict(),
        ward: input.receiverWard !== undefined ? input.receiverWard ?? undefined : currentAddr.getWard(),
      });

      order.updateReceiverInfo({
        name: receiverName,
        phone: receiverPhone,
        address: receiverAddress,
      });

      if (input.notes !== undefined && input.notes !== null) {
        order.updateNotes(input.notes);
      }

      const saved = await this.orderRepository.save(order);

      let currentHubName: string | null = null;
      if (saved.getCurrentHubId()) {
        const hub = await this.hubRepository.findById(saved.getCurrentHubId()!);
        currentHubName = hub ? hub.getName() : null;
      }

      const output: OrderDetailDTO = {
        id: String(saved.getId()),
        trackingCode: saved.getTrackingCode().getValue(),
        currentHubId: saved.getCurrentHubId() !== null ? String(saved.getCurrentHubId()) : null,
        currentHubName,
        assignedShipperId:
          saved.getAssignedShipperId() !== null ? String(saved.getAssignedShipperId()) : null,
        assignedShipperName: null,
        senderName: saved.getSenderName(),
        senderPhone: saved.getSenderPhone().toStandardString(),
        senderAddress: saved.getSenderAddress(),
        receiverName: saved.getReceiverName(),
        receiverPhone: saved.getReceiverPhone().toStandardString(),
        receiverAddress: saved.getReceiverAddress().getStreet(),
        receiverProvince: saved.getReceiverAddress().getProvince(),
        receiverDistrict: saved.getReceiverAddress().getDistrict(),
        receiverWard: saved.getReceiverAddress().getWard() ?? null,
        weightGram: saved.getDimensions().getWeightGram(),
        lengthCm: saved.getDimensions().getLengthCm(),
        widthCm: saved.getDimensions().getWidthCm(),
        heightCm: saved.getDimensions().getHeightCm(),
        billableWeightGram: saved.getDimensions().getBillableWeightGram(),
        codAmount: saved.getCodAmount().getAmountAsNumber(),
        shippingFee: saved.getShippingFee().getAmountAsNumber(),
        paymentBy: saved.getPaymentBy(),
        paymentStatus: saved.getPaymentStatus(),
        currentStatus: saved.getCurrentStatus(),
        deliveryAttempts: saved.getDeliveryAttempts(),
        maxAttempts: saved.getMaxAttempts(),
        notes: saved.getNotes(),
        createdAt: saved.getCreatedAt(),
        updatedAt: saved.getUpdatedAt(),
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Cập nhật đơn hàng thất bại: ${errorMsg}`);
    }
  }
}
