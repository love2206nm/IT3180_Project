/**
 * @file hub.mapper.ts
 * @description Data Mapper chuyển đổi giữa Prisma Hub model và Hub Domain Entity.
 * @module infrastructure/database/mappers
 */

import type { Hub as PrismaHub, Prisma } from '@prisma/client';
import { Hub, PhoneNumber, type HubStatus } from '../../../domain';
import { fromBigInt, toBigInt } from './mapper-helpers';

/**
 * Lớp chịu trách nhiệm chuyển đổi hai chiều cho Trạm giao nhận (Hub).
 */
export class HubMapper {
  /**
   * Chuyển đổi từ Prisma Hub record sang Domain Entity Hub.
   *
   * @param {PrismaHub} raw Bản ghi Hub từ Prisma
   * @returns {Hub} Thực thể Hub thuộc tầng Domain
   */
  public static toDomain(raw: PrismaHub): Hub {
    return new Hub({
      id: fromBigInt(raw.id),
      code: raw.code,
      name: raw.name,
      address: raw.address,
      province: raw.province,
      district: raw.district,
      ward: raw.ward,
      phone: raw.phone ? new PhoneNumber(raw.phone) : null,
      status: raw.status as HubStatus,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Chuyển đổi từ Domain Entity Hub sang Prisma Create Input.
   *
   * @param {Hub} domain Thực thể Hub
   * @returns {Prisma.HubUncheckedCreateInput} Dữ liệu phục vụ prisma.hub.create()
   */
  public static toPersistenceCreate(domain: Hub): Prisma.HubUncheckedCreateInput {
    const data: Prisma.HubUncheckedCreateInput = {
      code: domain.getCode(),
      name: domain.getName(),
      address: domain.getAddress(),
      province: domain.getProvince(),
      district: domain.getDistrict(),
      ward: domain.getWard(),
      phone: domain.getPhone() ? domain.getPhone()!.getValue() : null,
      status: domain.getStatus(),
    };

    const domainId = domain.getId();
    if (domainId !== null && domainId !== undefined) {
      data.id = BigInt(domainId);
    }

    return data;
  }

  /**
   * Chuyển đổi từ Domain Entity Hub sang Prisma Update Input.
   *
   * @param {Hub} domain Thực thể Hub
   * @returns {Prisma.HubUncheckedUpdateInput} Dữ liệu phục vụ prisma.hub.update()
   */
  public static toPersistenceUpdate(domain: Hub): Prisma.HubUncheckedUpdateInput {
    return {
      code: domain.getCode(),
      name: domain.getName(),
      address: domain.getAddress(),
      province: domain.getProvince(),
      district: domain.getDistrict(),
      ward: domain.getWard(),
      phone: domain.getPhone() ? domain.getPhone()!.getValue() : null,
      status: domain.getStatus(),
      updatedAt: domain.getUpdatedAt(),
    };
  }
}
