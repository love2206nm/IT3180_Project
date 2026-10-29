/**
 * @file cod-settlement.mapper.ts
 * @description Data Mapper chuyển đổi giữa Prisma CODSettlement model và CODSettlement Domain Entity.
 * @module infrastructure/database/mappers
 */

import type {
  CODSettlement as PrismaCODSettlement,
  CODSettlementDetail as PrismaCODSettlementDetail,
  Prisma,
} from '@prisma/client';
import {
  CODSettlement,
  CODSettlementDetail,
  Money,
  type CODSettlementStatus,
} from '../../../domain';
import { fromBigInt, fromDecimal, toBigInt } from './mapper-helpers';

export type PrismaCODSettlementWithDetails = PrismaCODSettlement & {
  details?: PrismaCODSettlementDetail[];
};

/**
 * Lớp chịu trách nhiệm chuyển đổi hai chiều cho Phiên đối soát nộp tiền COD (CODSettlement).
 */
export class CODSettlementMapper {
  /**
   * Chuyển đổi từ Prisma record sang Domain Entity CODSettlement.
   *
   * @param {PrismaCODSettlementWithDetails} raw Bản ghi từ Prisma kèm details
   * @returns {CODSettlement} Thực thể CODSettlement thuộc tầng Domain
   */
  public static toDomain(raw: PrismaCODSettlementWithDetails): CODSettlement {
    const domainDetails = (raw.details ?? []).map(
      (d) =>
        new CODSettlementDetail({
          id: fromBigInt(d.id),
          settlementId: fromBigInt(d.settlementId),
          orderId: fromBigInt(d.orderId) ?? '',
          codCollected: new Money(fromDecimal(d.codCollected)),
        })
    );

    return new CODSettlement({
      id: fromBigInt(raw.id),
      settlementCode: raw.settlementCode,
      hubId: fromBigInt(raw.hubId) ?? '',
      shipperId: fromBigInt(raw.shipperId) ?? '',
      managerId: fromBigInt(raw.managerId),
      totalCodAmount: new Money(fromDecimal(raw.totalCodAmount)),
      totalOrdersCount: raw.totalOrdersCount,
      status: raw.status as CODSettlementStatus,
      notes: raw.notes,
      settledAt: raw.settledAt,
      createdAt: raw.createdAt,
      details: domainDetails,
    });
  }

  /**
   * Chuyển đổi từ Domain Entity CODSettlement sang Prisma Create Input.
   *
   * @param {CODSettlement} domain Thực thể CODSettlement
   * @returns {Prisma.CODSettlementUncheckedCreateInput} Dữ liệu phục vụ prisma.cODSettlement.create()
   */
  public static toPersistenceCreate(
    domain: CODSettlement
  ): Prisma.CODSettlementUncheckedCreateInput {
    const hubId = toBigInt(domain.getHubId());
    const shipperId = toBigInt(domain.getShipperId());

    if (!hubId || !shipperId) {
      throw new Error('HubId và ShipperId bắt buộc phải có khi khởi tạo phiên nộp COD.');
    }

    const data: Prisma.CODSettlementUncheckedCreateInput = {
      settlementCode: domain.getSettlementCode(),
      hubId,
      shipperId,
      managerId: toBigInt(domain.getManagerId()),
      totalCodAmount: domain.getTotalCodAmount().getAmount(),
      totalOrdersCount: domain.getTotalOrdersCount(),
      status: domain.getStatus(),
      notes: domain.getNotes(),
      settledAt: domain.getSettledAt(),
      createdAt: domain.getCreatedAt(),
    };

    const domainId = domain.getId();
    if (domainId !== null && domainId !== undefined) {
      data.id = BigInt(domainId);
    }

    return data;
  }

  /**
   * Chuyển đổi từ Domain Entity CODSettlement sang Prisma Update Input.
   *
   * @param {CODSettlement} domain Thực thể CODSettlement
   * @returns {Prisma.CODSettlementUncheckedUpdateInput} Dữ liệu phục vụ prisma.cODSettlement.update()
   */
  public static toPersistenceUpdate(
    domain: CODSettlement
  ): Prisma.CODSettlementUncheckedUpdateInput {
    return {
      managerId: toBigInt(domain.getManagerId()),
      totalCodAmount: domain.getTotalCodAmount().getAmount(),
      totalOrdersCount: domain.getTotalOrdersCount(),
      status: domain.getStatus(),
      notes: domain.getNotes(),
      settledAt: domain.getSettledAt(),
    };
  }

  /**
   * Chuyển đổi danh sách chi tiết đơn hàng sang Prisma CreateMany Input.
   *
   * @param {string | number} settlementId ID của phiên đối soát
   * @param {readonly CODSettlementDetail[]} details Danh sách chi tiết
   * @returns {Prisma.CODSettlementDetailUncheckedCreateInput[]}
   */
  public static toPersistenceDetails(
    settlementId: string | number,
    details: readonly CODSettlementDetail[]
  ): Prisma.CODSettlementDetailUncheckedCreateInput[] {
    const sId = BigInt(settlementId);

    return details.map((d) => ({
      settlementId: sId,
      orderId: BigInt(d.getOrderId()),
      codCollected: d.getCodCollected().getAmount(),
    }));
  }
}
