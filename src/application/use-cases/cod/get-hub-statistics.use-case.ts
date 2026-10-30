/**
 * @file get-hub-statistics.use-case.ts
 * @description Use Case Xem thống kê hiệu suất trạm & KPI giao hàng (UC21).
 * Báo cáo số lượng đơn theo trạng thái, tỷ lệ thành công và tổng tiền thu hộ COD.
 * @module application/use-cases/cod
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import {
  type GetHubStatisticsQueryDTO,
  type HubStatisticsOutputDTO,
  type ShipperPerformanceDTO,
} from '../../dtos/cod.dto';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class GetHubStatisticsUseCase
  implements IUseCase<GetHubStatisticsQueryDTO, Result<HubStatisticsOutputDTO, string>>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Thực thi lấy báo cáo thống kê hiệu suất trạm và KPI Shipper.
   * Áp dụng nguyên tắc Fail-Closed, RBAC và Hub Isolation.
   *
   * @param query Tiêu chí lọc
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<HubStatisticsOutputDTO, string>>}
   */
  public async execute(
    query: GetHubStatisticsQueryDTO,
    securityContext?: SecurityContext
  ): Promise<Result<HubStatisticsOutputDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phân quyền RBAC & Cô lập phạm vi dữ liệu trạm
      if (securityContext.role === USER_ROLE.SHIPPER) {
        return failure('Nhân viên giao hàng không có quyền truy cập báo cáo tài chính và hiệu suất trạm');
      }

      let targetHubId = query.hubId;
      if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        if (!securityContext.hubId) {
          return failure('Tài khoản nhân sự chưa được gán trạm làm việc trực thuộc');
        }
        targetHubId = securityContext.hubId;
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền xem thống kê hiệu suất trạm');
      }

      // 1. Lấy thống kê số lượng đơn theo từng trạng thái
      const statusBreakdown = await this.orderRepository.countByStatus(targetHubId);

      const totalOrders = Object.values(statusBreakdown).reduce((acc, count) => acc + count, 0);

      // 2. Thống kê theo từng Shipper nếu có targetHubId
      const shipperPerformance: ShipperPerformanceDTO[] = [];
      let totalCodExpected = 0;
      let totalCodCollected = 0;

      if (targetHubId) {
        const shippers = await this.userRepository.findActiveShippersByHub(targetHubId);

        for (const shipper of shippers) {
          const sid = shipper.getId()!;
          const deliveredOrders = await this.orderRepository.findByShipperAndStatus(
            sid,
            ORDER_STATUS.DELIVERED
          );
          const outOrders = await this.orderRepository.findByShipperAndStatus(
            sid,
            ORDER_STATUS.OUT_FOR_DELIVERY
          );
          const failedOrders = await this.orderRepository.findByShipperAndStatus(
            sid,
            ORDER_STATUS.FAILED_ATTEMPT
          );

          const totalDelivered = deliveredOrders.length;
          const totalFailed = failedOrders.length;
          const totalAssigned = totalDelivered + totalFailed + outOrders.length;

          const successRate =
            totalAssigned > 0 ? Math.round((totalDelivered / totalAssigned) * 100) : 0;

          const shipperCod = deliveredOrders.reduce(
            (acc, o) => acc + o.getCodAmount().getAmountAsNumber(),
            0
          );

          totalCodCollected += shipperCod;

          shipperPerformance.push({
            shipperId: String(sid),
            shipperName: shipper.getFullName(),
            totalAssigned,
            totalDelivered,
            totalFailed,
            successRate,
            totalCodCollected: shipperCod,
          });
        }
      }

      const output: HubStatisticsOutputDTO = {
        totalOrders,
        statusBreakdown,
        totalCodExpected,
        totalCodCollected,
        shipperPerformance,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Thống kê hiệu suất trạm thất bại: ${errorMsg}`);
    }
  }
}
