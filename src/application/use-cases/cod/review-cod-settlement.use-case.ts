/**
 * @file review-cod-settlement.use-case.ts
 * @description Use Case Quản lý trạm Duyệt hoặc Từ chối phiên nộp tiền COD (UC22).
 * Cập nhật trạng thái CONFIRMED (Đã thu đủ) hoặc REJECTED (Lệch tiền/Có sai sót) trong 1 transaction ACID.
 * @module application/use-cases/cod
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { ICODSettlementRepository } from '../../../domain/interface/repositories/cod-settlement.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import type { IUserRepository } from '../../../domain/interface/repositories/user.repository.interface';
import {
  type ReviewCODSettlementInputDTO,
  type CODSettlementDTO,
} from '../../dtos/cod.dto';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export class ReviewCODSettlementUseCase
  implements IUseCase<ReviewCODSettlementInputDTO, Result<CODSettlementDTO, string>>
{
  constructor(
    private readonly codSettlementRepository: ICODSettlementRepository,
    private readonly hubRepository: IHubRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Thực thi duyệt hoặc từ chối phiên đối soát COD.
   * Áp dụng nguyên tắc Fail-Closed, RBAC và Hub Isolation.
   *
   * @param input DTO duyệt phiên đối soát
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<CODSettlementDTO, string>>}
   */
  public async execute(
    input: ReviewCODSettlementInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<CODSettlementDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      const settlement = await this.codSettlementRepository.findById(input.settlementId);
      if (!settlement) {
        return failure('Phiên đối soát COD không tồn tại trên hệ thống');
      }

      // 2. Phân quyền RBAC & Identity Binding
      const managerId = securityContext.userId;
      if (securityContext.role === USER_ROLE.HUB_MANAGER) {
        if (String(settlement.getHubId()) !== String(securityContext.hubId)) {
          return failure('Quản lý trạm chỉ được duyệt phiên đối soát thuộc trạm của mình');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền duyệt hoặc từ chối phiên đối soát COD');
      }

      // 2. Kiểm tra trạng thái hiện tại phải là PENDING
      if (!settlement.isPending()) {
        return failure(
          `Phiên đối soát này đã được xử lý trước đó (trạng thái hiện tại: ${settlement.getStatus()})`
        );
      }

      // 3. Thực hiện hành động
      if (input.action === 'CONFIRM') {
        settlement.confirm(managerId);
      } else if (input.action === 'REJECT') {
        const reason = input.rejectionReason ?? 'Sai lệch số tiền hoặc chưa bàn giao thực tế';
        settlement.reject(managerId, reason);
      }

      const saved = await this.codSettlementRepository.save(settlement);

      // Lấy tên Manager và Hub
      let managerName: string | null = null;
      const manager = await this.userRepository.findById(managerId);
      if (manager) managerName = manager.getFullName();

      let hubName: string | undefined;
      const hub = await this.hubRepository.findById(saved.getHubId());
      if (hub) hubName = hub.getName();

      let shipperName: string | undefined;
      const shipper = await this.userRepository.findById(saved.getShipperId());
      if (shipper) shipperName = shipper.getFullName();

      const output: CODSettlementDTO = {
        id: String(saved.getId()),
        settlementCode: saved.getSettlementCode(),
        hubId: String(saved.getHubId()),
        hubName,
        shipperId: String(saved.getShipperId()),
        shipperName,
        managerId: saved.getManagerId() !== null ? String(saved.getManagerId()) : null,
        managerName,
        totalCodAmount: saved.getTotalCodAmount().getAmountAsNumber(),
        totalOrdersCount: saved.getTotalOrdersCount(),
        status: saved.getStatus(),
        notes: saved.getNotes(),
        settledAt: saved.getSettledAt(),
        createdAt: saved.getCreatedAt(),
        details: saved.getDetails().map((d) => ({
          id: String(d.getId() ?? ''),
          orderId: String(d.getOrderId()),
          trackingCode: '',
          codCollected: d.getCodCollected().getAmountAsNumber(),
        })),
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Xử lý đối soát COD thất bại: ${errorMsg}`);
    }
  }
}
