/**
 * @file order-status-log.mapper.ts
 * @description Data Mapper chuyển đổi giữa Prisma OrderStatusLog model và OrderStatusLog Domain Entity.
 * @module infrastructure/database/mappers
 */

import type { OrderStatusLog as PrismaOrderStatusLog, Prisma } from '@prisma/client';
import {
  OrderStatusLog,
  Coordinates,
  type OrderStatus,
} from '../../../domain';
import { fromBigInt, fromDecimal, toBigInt } from './mapper-helpers';

/**
 * Lớp chịu trách nhiệm chuyển đổi hai chiều cho Lịch sử kiểm vết bưu kiện (OrderStatusLog).
 */
export class OrderStatusLogMapper {
  /**
   * Chuyển đổi từ Prisma OrderStatusLog record sang Domain Entity OrderStatusLog.
   *
   * @param {PrismaOrderStatusLog} raw Bản ghi từ Prisma
   * @returns {OrderStatusLog} Thực thể OrderStatusLog thuộc tầng Domain
   */
  public static toDomain(raw: PrismaOrderStatusLog): OrderStatusLog {
    let coordinates: Coordinates | null = null;
    if (raw.locationLat !== null && raw.locationLng !== null) {
      coordinates = new Coordinates(
        fromDecimal(raw.locationLat),
        fromDecimal(raw.locationLng)
      );
    }

    return new OrderStatusLog({
      id: fromBigInt(raw.id),
      orderId: fromBigInt(raw.orderId) ?? '',
      hubId: fromBigInt(raw.hubId),
      actorId: fromBigInt(raw.actorId) ?? '',
      previousStatus: (raw.previousStatus as OrderStatus) ?? null,
      newStatus: raw.newStatus as OrderStatus,
      failureReason: raw.failureReason,
      proofImageUrl: raw.proofImageUrl,
      location: coordinates,
      note: raw.note,
      createdAt: raw.createdAt,
    });
  }

  /**
   * Chuyển đổi từ Domain Entity OrderStatusLog sang Prisma Create Input.
   *
   * @param {OrderStatusLog} domain Thực thể OrderStatusLog
   * @param {bigint} overrideOrderId Tùy chọn gán thẳng OrderId (khi tạo mới Order và Log trong cùng transaction)
   * @returns {Prisma.OrderStatusLogUncheckedCreateInput} Dữ liệu phục vụ prisma.orderStatusLog.create()
   */
  public static toPersistenceCreate(
    domain: OrderStatusLog,
    overrideOrderId?: bigint
  ): Prisma.OrderStatusLogUncheckedCreateInput {
    const orderId = overrideOrderId ?? toBigInt(domain.getOrderId());
    const actorId = toBigInt(domain.getActorId());

    if (orderId === null || orderId === undefined || actorId === null || actorId === undefined) {
      throw new Error('OrderId và ActorId bắt buộc phải có khi ghi log kiểm vết.');
    }

    const location = domain.getLocation();

    const data: Prisma.OrderStatusLogUncheckedCreateInput = {
      orderId,
      hubId: toBigInt(domain.getHubId()),
      actorId,
      previousStatus: domain.getPreviousStatus(),
      newStatus: domain.getNewStatus(),
      failureReason: domain.getFailureReason(),
      proofImageUrl: domain.getProofImageUrl(),
      locationLat: location ? location.getLatitude() : null,
      locationLng: location ? location.getLongitude() : null,
      note: domain.getNote(),
      createdAt: domain.getCreatedAt(),
    };

    const domainId = domain.getId();
    if (domainId !== null && domainId !== undefined) {
      data.id = BigInt(domainId);
    }

    return data;
  }
}
