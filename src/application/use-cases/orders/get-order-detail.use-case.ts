/**
 * @file get-order-detail.use-case.ts
 * @description Use Case Xem chi tiết đơn hàng & Lịch sử kiểm vết (UC11).
 * @module application/use-cases/orders
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IOrderStatusLogRepository } from '../../../domain/interface/repositories/order-status-log.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import {
  type OrderDetailWithLogsDTO,
  type OrderDetailDTO,
  type OrderStatusLogDTO,
} from '../../dtos/order.dto';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class GetOrderDetailUseCase
  implements IUseCase<{ idOrTrackingCode: string }, Result<OrderDetailWithLogsDTO, string>>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly orderStatusLogRepository: IOrderStatusLogRepository,
    private readonly hubRepository: IHubRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Thực thi lấy chi tiết đơn hàng cùng toàn bộ lịch sử kiểm vết (Audit Trail).
   * Áp dụng nguyên tắc Fail-Closed và Data Ownership (chống BOLA đa trạm).
   *
   * @param input ID hoặc Mã vận đơn cần tra cứu
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<OrderDetailWithLogsDTO, string>>}
   */
  public async execute(
    input: { idOrTrackingCode: string },
    securityContext?: SecurityContext
  ): Promise<Result<OrderDetailWithLogsDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      const isTracking = input.idOrTrackingCode.toUpperCase().startsWith('TRK-');
      const order = isTracking
        ? await this.orderRepository.findByTrackingCode(input.idOrTrackingCode.trim())
        : (await this.orderRepository.findById(input.idOrTrackingCode.trim())) ||
          (await this.orderRepository.findByTrackingCode(input.idOrTrackingCode.trim()));

      if (!order) {
        return failure('Đơn hàng không tồn tại trên hệ thống');
      }

      // 2. Phân quyền RBAC & Sở hữu dữ liệu trạm
      if (securityContext.role === USER_ROLE.SHIPPER) {
        if (String(order.getAssignedShipperId()) !== securityContext.userId) {
          return failure('Bạn chỉ có quyền xem chi tiết đơn hàng được phân công cho mình');
        }
      } else if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        const orderHubId = order.getCurrentHubId();
        if (orderHubId && String(orderHubId) !== String(securityContext.hubId)) {
          return failure('Bạn chỉ có quyền xem chi tiết đơn hàng thuộc trạm của mình');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền xem thông tin chi tiết đơn hàng');
      }

      // Lấy tên Hub hiện tại
      let currentHubName: string | null = null;
      if (order.getCurrentHubId()) {
        const hub = await this.hubRepository.findById(order.getCurrentHubId()!);
        currentHubName = hub ? hub.getName() : null;
      }

      // Lấy tên Shipper hiện tại
      let assignedShipperName: string | null = null;
      if (order.getAssignedShipperId()) {
        const shipper = await this.userRepository.findById(order.getAssignedShipperId()!);
        assignedShipperName = shipper ? shipper.getFullName() : null;
      }

      // Lấy toàn bộ logs kiểm vết
      const logs = await this.orderStatusLogRepository.findByOrderId(order.getId()!);

      // Cache actor names và hub names trong logs
      const actorMap = new Map<string, { name: string; role: string }>();
      const hubMap = new Map<string, string>();

      for (const log of logs) {
        const aid = String(log.getActorId());
        if (!actorMap.has(aid) && aid !== 'SYSTEM') {
          const u = await this.userRepository.findById(aid);
          if (u) actorMap.set(aid, { name: u.getFullName(), role: u.getRole() });
        }

        const hid = log.getHubId() !== null ? String(log.getHubId()) : null;
        if (hid && !hubMap.has(hid)) {
          const h = await this.hubRepository.findById(hid);
          if (h) hubMap.set(hid, h.getName());
        }
      }

      const formattedLogs: OrderStatusLogDTO[] = logs.map((log) => {
        const aid = String(log.getActorId());
        const hid = log.getHubId() !== null ? String(log.getHubId()) : null;
        const loc = log.getLocation();
        const actorInfo = actorMap.get(aid);

        return {
          id: String(log.getId()),
          orderId: String(log.getOrderId()),
          hubId: hid,
          hubName: hid ? hubMap.get(hid) ?? null : null,
          actorId: aid,
          actorName: aid === 'SYSTEM' ? 'Hệ thống tự động' : actorInfo?.name ?? aid,
          actorRole: aid === 'SYSTEM' ? 'SYSTEM' : actorInfo?.role ?? 'STAFF',
          previousStatus: log.getPreviousStatus(),
          newStatus: log.getNewStatus(),
          failureReason: log.getFailureReason(),
          proofImageUrl: log.getProofImageUrl(),
          locationLat: loc?.getLatitude() ?? null,
          locationLng: loc?.getLongitude() ?? null,
          note: log.getNote(),
          createdAt: log.getCreatedAt(),
        };
      });

      const orderDetail: OrderDetailDTO = {
        id: String(order.getId()),
        trackingCode: order.getTrackingCode().getValue(),
        currentHubId: order.getCurrentHubId() !== null ? String(order.getCurrentHubId()) : null,
        currentHubName,
        assignedShipperId:
          order.getAssignedShipperId() !== null ? String(order.getAssignedShipperId()) : null,
        assignedShipperName,
        senderName: order.getSenderName(),
        senderPhone: order.getSenderPhone().toStandardString(),
        senderAddress: order.getSenderAddress(),
        receiverName: order.getReceiverName(),
        receiverPhone: order.getReceiverPhone().toStandardString(),
        receiverAddress: order.getReceiverAddress().getStreet(),
        receiverProvince: order.getReceiverAddress().getProvince(),
        receiverDistrict: order.getReceiverAddress().getDistrict(),
        receiverWard: order.getReceiverAddress().getWard() ?? null,
        weightGram: order.getDimensions().getWeightGram(),
        lengthCm: order.getDimensions().getLengthCm(),
        widthCm: order.getDimensions().getWidthCm(),
        heightCm: order.getDimensions().getHeightCm(),
        billableWeightGram: order.getDimensions().getBillableWeightGram(),
        codAmount: order.getCodAmount().getAmountAsNumber(),
        shippingFee: order.getShippingFee().getAmountAsNumber(),
        paymentBy: order.getPaymentBy(),
        paymentStatus: order.getPaymentStatus(),
        currentStatus: order.getCurrentStatus(),
        deliveryAttempts: order.getDeliveryAttempts(),
        maxAttempts: order.getMaxAttempts(),
        notes: order.getNotes(),
        createdAt: order.getCreatedAt(),
        updatedAt: order.getUpdatedAt(),
      };

      return success({
        order: orderDetail,
        logs: formattedLogs,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Xem chi tiết đơn hàng thất bại: ${errorMsg}`);
    }
  }
}
