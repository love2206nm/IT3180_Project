/**
 * @file delivery-zone.mapper.ts
 * @description Data Mapper chuyển đổi giữa Prisma DeliveryZone model và DeliveryZone Domain Entity.
 * @module infrastructure/database/mappers
 */

import type { DeliveryZone as PrismaDeliveryZone, Prisma } from '@prisma/client';
import { DeliveryZone } from '../../../domain';
import { fromBigInt, toBigInt } from './mapper-helpers';

/**
 * Lớp chịu trách nhiệm chuyển đổi hai chiều cho Tuyến giao hàng (DeliveryZone).
 */
export class DeliveryZoneMapper {
  /**
   * Chuyển đổi từ Prisma DeliveryZone record sang Domain Entity DeliveryZone.
   *
   * @param {PrismaDeliveryZone} raw Bản ghi DeliveryZone từ Prisma
   * @returns {DeliveryZone} Thực thể DeliveryZone thuộc tầng Domain
   */
  public static toDomain(raw: PrismaDeliveryZone): DeliveryZone {
    return new DeliveryZone({
      id: fromBigInt(raw.id),
      hubId: fromBigInt(raw.hubId) ?? '',
      code: raw.code,
      name: raw.name,
      district: raw.district,
      ward: raw.ward,
      description: raw.description,
    });
  }

  /**
   * Chuyển đổi từ Domain Entity DeliveryZone sang Prisma Create Input.
   *
   * @param {DeliveryZone} domain Thực thể DeliveryZone
   * @returns {Prisma.DeliveryZoneUncheckedCreateInput} Dữ liệu phục vụ prisma.deliveryZone.create()
   */
  public static toPersistenceCreate(domain: DeliveryZone): Prisma.DeliveryZoneUncheckedCreateInput {
    const hubIdBigInt = toBigInt(domain.getHubId());
    if (!hubIdBigInt) {
      throw new Error('HubId không được để trống khi lưu DeliveryZone.');
    }

    const data: Prisma.DeliveryZoneUncheckedCreateInput = {
      hubId: hubIdBigInt,
      code: domain.getCode(),
      name: domain.getName(),
      district: domain.getDistrict(),
      ward: domain.getWard(),
      description: domain.getDescription(),
    };

    const domainId = domain.getId();
    if (domainId !== null && domainId !== undefined) {
      data.id = BigInt(domainId);
    }

    return data;
  }

  /**
   * Chuyển đổi từ Domain Entity DeliveryZone sang Prisma Update Input.
   *
   * @param {DeliveryZone} domain Thực thể DeliveryZone
   * @returns {Prisma.DeliveryZoneUncheckedUpdateInput} Dữ liệu phục vụ prisma.deliveryZone.update()
   */
  public static toPersistenceUpdate(domain: DeliveryZone): Prisma.DeliveryZoneUncheckedUpdateInput {
    return {
      code: domain.getCode(),
      name: domain.getName(),
      district: domain.getDistrict(),
      ward: domain.getWard(),
      description: domain.getDescription(),
    };
  }
}
