/**
 * @file create-cod-settlement.use-case.ts
 * @description Use Case Shipper nộp tiền thu hộ COD cuối ca (UC22).
 * Gom danh sách đơn hàng đã thu tiền COD, tính tổng và tạo phiên bàn giao ở trạng thái PENDING trong 1 transaction ACID.
 * @module application/use-cases/cod
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { ICODSettlementRepository } from '../../../domain/interface/repositories/cod-settlement.repository.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import {
  CODSettlement,
  CODSettlementDetail,
} from '../../../domain/entities/cod-settlement.entity';
import { Money } from '../../../domain/value-objects/money.vo';
import {
  type CreateCODSettlementInputDTO,
  type CODSettlementDTO,
  type CODSettlementDetailDTO,
} from '../../dtos/cod.dto';
import { ORDER_STATUS } from '../../../domain/constants/order-status.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';
import { COD_SETTLEMENT_STATUS } from '../../../domain/constants/cod-status.constant';

export class CreateCODSettlementUseCase
  implements IUseCase<CreateCODSettlementInputDTO, Result<CODSettlementDTO, string>>
{
  constructor(
    private readonly codSettlementRepository: ICODSettlementRepository,
    private readonly orderRepository: IOrderRepository,
    private readonly hubRepository: IHubRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Thực thi tạo phiên nộp tiền COD cuối ca.
   * Áp dụng nguyên tắc Fail-Closed, Identity Binding và chống Double-Spending.
   *
   * @param input DTO nộp tiền COD
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<CODSettlementDTO, string>>}
   */
  public async execute(
    input: CreateCODSettlementInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<CODSettlementDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phân quyền & Xác định Shipper
      const effectiveShipperId =
        securityContext.role === USER_ROLE.SHIPPER
          ? securityContext.userId
          : (input.shipperId ?? securityContext.userId);

      if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        if (String(input.hubId) !== String(securityContext.hubId)) {
          return failure('Bạn chỉ có quyền tạo phiên nộp COD tại trạm của mình');
        }
      } else if (
        securityContext.role !== USER_ROLE.ADMIN &&
        securityContext.role !== USER_ROLE.SHIPPER
      ) {
        return failure('Bạn không có quyền tạo phiên nộp tiền COD');
      }

      const shipper = await this.userRepository.findById(effectiveShipperId);
      if (!shipper) {
        return failure('Shipper không tồn tại trên hệ thống');
      }

      const hub = await this.hubRepository.findById(input.hubId);
      if (!hub) {
        return failure('Trạm giao nhận không tồn tại trên hệ thống');
      }

      // 3. Chống COD Double-Spending: Kiểm tra xem các đơn hàng đã nằm trong phiên đối soát nào chưa
      const existingSettlements = await this.codSettlementRepository.findByHub(input.hubId);
      const activeSettledOrderIds = new Set<string>();

      for (const s of existingSettlements) {
        if (s.getStatus() !== COD_SETTLEMENT_STATUS.REJECTED) {
          for (const d of s.getDetails()) {
            activeSettledOrderIds.add(String(d.getOrderId()));
          }
        }
      }

      for (const orderId of input.orderIds) {
        if (activeSettledOrderIds.has(String(orderId))) {
          return failure(
            `Đơn hàng ID "${orderId}" đã nằm trong một phiên nộp COD đang xử lý hoặc đã hoàn tất đối soát`
          );
        }
      }

      // 4. Kiểm tra danh sách đơn hàng đã thu tiền
      let totalAmountNumber = 0;
      const details: CODSettlementDetail[] = [];
      const detailDTOs: CODSettlementDetailDTO[] = [];

      for (const orderId of input.orderIds) {
        const order = await this.orderRepository.findById(orderId);
        if (!order) {
          return failure(`Đơn hàng ID "${orderId}" không tồn tại trên hệ thống`);
        }

        if (String(order.getAssignedShipperId()) !== String(effectiveShipperId)) {
          return failure(`Đơn hàng "${order.getTrackingCode().getValue()}" không được giao bởi Shipper này`);
        }

        if (order.getCurrentStatus() !== ORDER_STATUS.DELIVERED) {
          return failure(
            `Đơn hàng "${order.getTrackingCode().getValue()}" chưa hoàn tất giao hàng (trạng thái: ${order.getCurrentStatus()})`
          );
        }

        if (!order.requiresCOD()) {
          return failure(
            `Đơn hàng "${order.getTrackingCode().getValue()}" không có tiền thu hộ COD để kết chuyển`
          );
        }

        const codVal = order.getCodAmount().getAmountAsNumber();
        totalAmountNumber += codVal;

        details.push(
          new CODSettlementDetail({
            orderId: order.getId()!,
            codCollected: order.getCodAmount(),
          })
        );

        detailDTOs.push({
          id: '',
          orderId: String(order.getId()),
          trackingCode: order.getTrackingCode().getValue(),
          codCollected: codVal,
        });
      }

      // 3. Sinh mã phiên nộp COD chuẩn duy nhất (COD-YYYYMMDD-XXXX)
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const settlementCode = `COD-${dateStr}-${randomSuffix}`;

      // 4. Khởi tạo thực thể CODSettlement
      const settlement = new CODSettlement({
        settlementCode,
        hubId: input.hubId,
        shipperId: effectiveShipperId,
        totalCodAmount: Money.fromNumber(totalAmountNumber),
        totalOrdersCount: input.orderIds.length,
        notes: input.notes ?? null,
        details,
      });

      const saved = await this.codSettlementRepository.save(settlement);

      const output: CODSettlementDTO = {
        id: String(saved.getId()),
        settlementCode: saved.getSettlementCode(),
        hubId: String(saved.getHubId()),
        hubName: hub.getName(),
        shipperId: String(saved.getShipperId()),
        shipperName: shipper.getFullName(),
        managerId: null,
        managerName: null,
        totalCodAmount: saved.getTotalCodAmount().getAmountAsNumber(),
        totalOrdersCount: saved.getTotalOrdersCount(),
        status: saved.getStatus(),
        notes: saved.getNotes(),
        settledAt: saved.getSettledAt(),
        createdAt: saved.getCreatedAt(),
        details: detailDTOs,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Tạo phiên nộp tiền COD thất bại: ${errorMsg}`);
    }
  }
}
