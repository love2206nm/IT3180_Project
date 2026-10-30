/**
 * @file create-order.use-case.ts
 * @description Use Case Tiếp nhận / Tạo mới đơn hàng (UC09).
 * Tự động sinh mã vận đơn chuẩn, tính cước phí logistics, khởi tạo đơn hàng và ghi log kiểm vết trong 1 transaction ACID.
 * @module application/use-cases/orders
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import { Order } from '../../../domain/entities/order.entity';
import { OrderStatusLog } from '../../../domain/entities/order-status-log.entity';
import { TrackingCode } from '../../../domain/value-objects/tracking-code.vo';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { Address } from '../../../domain/value-objects/address.vo';
import { Money } from '../../../domain/value-objects/money.vo';
import { PackageDimensions } from '../../../domain/value-objects/package-dimensions.vo';
import { type CreateOrderInputDTO, type OrderDetailDTO } from '../../dtos/order.dto';
import { ORDER_STATUS } from '../../../domain/constants/order-status.constant';
import { PAYMENT_STATUS } from '../../../domain/constants/payment.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class CreateOrderUseCase
  implements IUseCase<CreateOrderInputDTO, Result<OrderDetailDTO, string>>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly hubRepository: IHubRepository
  ) {}

  /**
   * Thực thi tạo mới đơn hàng
   * Áp dụng nguyên tắc Fail-Closed và Hub Isolation (cách ly đa trạm, chống BOLA).
   *
   * @param input Dữ liệu tạo đơn
   * @param securityContext Ngữ cảnh người dùng đang thao tác
   * @returns {Promise<Result<OrderDetailDTO, string>>}
   */
  public async execute(
    input: CreateOrderInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<OrderDetailDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phân quyền RBAC & Xác định trạm tiếp nhận
      if (securityContext.role === USER_ROLE.SHIPPER) {
        return failure('Nhân viên giao hàng không có quyền tạo đơn hàng');
      }

      let hubId = input.currentHubId ?? null;
      if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        if (!securityContext.hubId) {
          return failure('Tài khoản nhân sự chưa được gán trạm làm việc trực thuộc');
        }
        // Khóa cứng trạm tiếp nhận tại trạm của nhân viên này
        hubId = securityContext.hubId;
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền tạo đơn hàng');
      }

      let hubName: string | null = null;
      if (hubId) {
        const hub = await this.hubRepository.findById(hubId);
        if (!hub) {
          return failure('Trạm giao nhận tiếp nhận không tồn tại trên hệ thống', {
            currentHubId: ['Trạm không hợp lệ'],
          });
        }
        hubName = hub.getName();
      }

      // 2. Tự động sinh mã vận đơn chuẩn duy nhất (TRK-YYYYMMDD-XXXXXX)
      const trackingCode = TrackingCode.generate();

      // 3. Khởi tạo Value Objects
      const senderPhone = PhoneNumber.create(input.senderPhone);
      const receiverPhone = PhoneNumber.create(input.receiverPhone);
      const receiverAddress = Address.create({
        street: input.receiverAddress,
        province: input.receiverProvince,
        district: input.receiverDistrict,
        ward: input.receiverWard ?? undefined,
      });

      const dimensions = PackageDimensions.create(
        input.lengthCm,
        input.widthCm,
        input.heightCm,
        input.weightGram
      );

      // 4. Tính toán cước phí vận chuyển chuẩn logistics nếu chưa cung cấp
      let shippingFeeAmount = input.shippingFee;
      if (shippingFeeAmount === undefined || shippingFeeAmount === null) {
        const billableWeight = dimensions.getBillableWeightGram();
        const baseFee = 20000; // 20.000 VNĐ cho 1.000g đầu tiên
        if (billableWeight <= 1000) {
          shippingFeeAmount = baseFee;
        } else {
          const extraWeight = billableWeight - 1000;
          const extraSteps = Math.ceil(extraWeight / 500);
          shippingFeeAmount = baseFee + extraSteps * 5000; // 5.000 VNĐ cho mỗi 500g tiếp theo
        }
      }

      const codAmountVo = Money.fromNumber(input.codAmount);
      const shippingFeeVo = Money.fromNumber(shippingFeeAmount);

      // 5. Trạng thái khởi tạo: Nếu đã tại trạm thì là AT_HUB, ngược lại là CREATED
      const initialStatus = hubId ? ORDER_STATUS.AT_HUB : ORDER_STATUS.CREATED;

      // 6. Khởi tạo thực thể Order
      const newOrder = new Order({
        trackingCode,
        currentHubId: hubId,
        senderName: input.senderName,
        senderPhone,
        senderAddress: input.senderAddress,
        receiverName: input.receiverName,
        receiverPhone,
        receiverAddress,
        dimensions,
        codAmount: codAmountVo,
        shippingFee: shippingFeeVo,
        paymentBy: input.paymentBy,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        currentStatus: initialStatus,
        notes: input.notes ?? null,
      });

      // 7. Tạo bản ghi kiểm vết đầu tiên (Audit Log)
      const actorId = securityContext.userId;
      const logNote = hubName
        ? `Đơn hàng được tiếp nhận tại ${hubName}`
        : 'Đơn hàng được khởi tạo trên hệ thống';

      const initialLog = new OrderStatusLog({
        orderId: 0, // Sẽ được repository tự gán đúng orderId sau khi insert trong transaction
        hubId,
        actorId,
        previousStatus: null,
        newStatus: initialStatus,
        note: logNote,
      });

      // 8. Lưu đồng bộ cả Đơn hàng và Log trong 1 transaction ACID
      const savedOrder = await this.orderRepository.saveWithAuditLog(newOrder, initialLog);

      const output: OrderDetailDTO = {
        id: String(savedOrder.getId()),
        trackingCode: savedOrder.getTrackingCode().getValue(),
        currentHubId: savedOrder.getCurrentHubId() !== null ? String(savedOrder.getCurrentHubId()) : null,
        currentHubName: hubName,
        assignedShipperId:
          savedOrder.getAssignedShipperId() !== null ? String(savedOrder.getAssignedShipperId()) : null,
        assignedShipperName: null,
        senderName: savedOrder.getSenderName(),
        senderPhone: savedOrder.getSenderPhone().toStandardString(),
        senderAddress: savedOrder.getSenderAddress(),
        receiverName: savedOrder.getReceiverName(),
        receiverPhone: savedOrder.getReceiverPhone().toStandardString(),
        receiverAddress: savedOrder.getReceiverAddress().getStreet(),
        receiverProvince: savedOrder.getReceiverAddress().getProvince(),
        receiverDistrict: savedOrder.getReceiverAddress().getDistrict(),
        receiverWard: savedOrder.getReceiverAddress().getWard() ?? null,
        weightGram: savedOrder.getDimensions().getWeightGram(),
        lengthCm: savedOrder.getDimensions().getLengthCm(),
        widthCm: savedOrder.getDimensions().getWidthCm(),
        heightCm: savedOrder.getDimensions().getHeightCm(),
        billableWeightGram: savedOrder.getDimensions().getBillableWeightGram(),
        codAmount: savedOrder.getCodAmount().getAmountAsNumber(),
        shippingFee: savedOrder.getShippingFee().getAmountAsNumber(),
        paymentBy: savedOrder.getPaymentBy(),
        paymentStatus: savedOrder.getPaymentStatus(),
        currentStatus: savedOrder.getCurrentStatus(),
        deliveryAttempts: savedOrder.getDeliveryAttempts(),
        maxAttempts: savedOrder.getMaxAttempts(),
        notes: savedOrder.getNotes(),
        createdAt: savedOrder.getCreatedAt(),
        updatedAt: savedOrder.getUpdatedAt(),
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Tạo đơn hàng thất bại: ${errorMsg}`);
    }
  }
}
