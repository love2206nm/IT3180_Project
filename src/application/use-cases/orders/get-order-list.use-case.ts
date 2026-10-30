/**
 * @file get-order-list.use-case.ts
 * @description Use Case Tra cứu & Lọc danh sách đơn hàng (UC10).
 * Hỗ trợ đa tiêu chí: mã vận đơn, SĐT gửi/nhận, khoảng ngày, trạm hiện tại, Shipper, trạng thái.
 * @module application/use-cases/orders
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import {
  type GetOrderListQueryDTO,
  type OrderListOutputDTO,
  type OrderListItemDTO,
} from '../../dtos/order.dto';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class GetOrderListUseCase
  implements IUseCase<GetOrderListQueryDTO, Result<OrderListOutputDTO, string>>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly hubRepository: IHubRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Thực thi tìm kiếm danh sách đơn hàng có phân trang.
   * Áp dụng nguyên tắc Fail-Closed và Hub Isolation (cách ly đa trạm, chống BOLA).
   *
   * @param query Tiêu chí lọc và phân trang
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<OrderListOutputDTO, string>>}
   */
  public async execute(
    query: GetOrderListQueryDTO,
    securityContext?: SecurityContext
  ): Promise<Result<OrderListOutputDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      let currentHubId = query.currentHubId;
      let assignedShipperId = query.assignedShipperId;

      // 2. Phân quyền RBAC & Cô lập phạm vi dữ liệu theo trạm
      if (securityContext.role === USER_ROLE.SHIPPER) {
        // Shipper chỉ xem đơn của chính mình, cấm xem đơn của người khác
        assignedShipperId = securityContext.userId;
        currentHubId = securityContext.hubId ?? undefined;
      } else if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        // Nhân sự trạm: Khóa cứng vào trạm trực thuộc (Hub Isolation), bỏ qua truy vấn trạm khác
        if (!securityContext.hubId) {
          return failure('Tài khoản nhân sự chưa được gán trạm làm việc trực thuộc');
        }
        currentHubId = securityContext.hubId;
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền truy cập danh sách đơn hàng');
      }

      const page = query.page ?? 1;
      const limit = query.limit ?? 10;

      const { orders, total } = await this.orderRepository.search({
        trackingCode: query.trackingCode,
        senderPhone: query.senderPhone,
        receiverPhone: query.receiverPhone,
        currentHubId,
        assignedShipperId,
        status: query.status,
        startDate: query.startDate,
        endDate: query.endDate,
        page,
        limit,
      });

      // Lấy Hub Name cache
      const hubMap = new Map<string, string>();
      const hubIds = Array.from(
        new Set(orders.map((o) => o.getCurrentHubId()).filter((id): id is string | number => id !== null))
      );
      for (const hid of hubIds) {
        const hub = await this.hubRepository.findById(hid);
        if (hub) hubMap.set(String(hid), hub.getName());
      }

      // Lấy Shipper Name cache
      const shipperMap = new Map<string, string>();
      const shipperIds = Array.from(
        new Set(
          orders.map((o) => o.getAssignedShipperId()).filter((id): id is string | number => id !== null)
        )
      );
      for (const sid of shipperIds) {
        const shipper = await this.userRepository.findById(sid);
        if (shipper) shipperMap.set(String(sid), shipper.getFullName());
      }

      const items: OrderListItemDTO[] = orders.map((o) => {
        const hid = o.getCurrentHubId() !== null ? String(o.getCurrentHubId()) : null;
        const sid = o.getAssignedShipperId() !== null ? String(o.getAssignedShipperId()) : null;

        return {
          id: String(o.getId()),
          trackingCode: o.getTrackingCode().getValue(),
          currentHubName: hid ? hubMap.get(hid) ?? null : null,
          assignedShipperName: sid ? shipperMap.get(sid) ?? null : null,
          senderName: o.getSenderName(),
          receiverName: o.getReceiverName(),
          receiverPhone: o.getReceiverPhone().toStandardString(),
          receiverProvince: o.getReceiverAddress().getProvince(),
          receiverDistrict: o.getReceiverAddress().getDistrict(),
          weightGram: o.getDimensions().getWeightGram(),
          codAmount: o.getCodAmount().getAmountAsNumber(),
          shippingFee: o.getShippingFee().getAmountAsNumber(),
          paymentBy: o.getPaymentBy(),
          paymentStatus: o.getPaymentStatus(),
          currentStatus: o.getCurrentStatus(),
          deliveryAttempts: o.getDeliveryAttempts(),
          createdAt: o.getCreatedAt(),
        };
      });

      const totalPages = Math.ceil(total / limit) || 1;

      const output: OrderListOutputDTO = {
        items,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Không thể tra cứu danh sách đơn hàng: ${errorMsg}`);
    }
  }
}
