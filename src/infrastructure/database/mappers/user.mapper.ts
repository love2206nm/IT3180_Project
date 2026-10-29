/**
 * @file user.mapper.ts
 * @description Data Mapper chuyển đổi giữa Prisma User model và User Domain Entity.
 * @module infrastructure/database/mappers
 */

import type { User as PrismaUser, Prisma } from '@prisma/client';
import {
  User,
  PhoneNumber,
  type UserRole,
  type UserStatus,
} from '../../../domain';
import { fromBigInt, toBigInt } from './mapper-helpers';

/**
 * Lớp chịu trách nhiệm chuyển đổi hai chiều cho Nhân sự / Tài khoản người dùng (User).
 */
export class UserMapper {
  /**
   * Chuyển đổi từ Prisma User record sang Domain Entity User.
   *
   * @param {PrismaUser} raw Bản ghi User từ Prisma
   * @returns {User} Thực thể User thuộc tầng Domain
   */
  public static toDomain(raw: PrismaUser): User {
    return new User({
      id: fromBigInt(raw.id),
      hubId: fromBigInt(raw.hubId),
      username: raw.username,
      passwordHash: raw.passwordHash,
      fullName: raw.fullName,
      email: raw.email,
      phone: new PhoneNumber(raw.phone),
      role: raw.role as UserRole,
      status: raw.status as UserStatus,
      lastLoginAt: raw.lastLoginAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Chuyển đổi từ Domain Entity User sang Prisma Create Input.
   *
   * @param {User} domain Thực thể User
   * @returns {Prisma.UserUncheckedCreateInput} Dữ liệu phục vụ prisma.user.create()
   */
  public static toPersistenceCreate(domain: User): Prisma.UserUncheckedCreateInput {
    const data: Prisma.UserUncheckedCreateInput = {
      hubId: toBigInt(domain.getHubId()),
      username: domain.getUsername(),
      passwordHash: domain.getPasswordHash(),
      fullName: domain.getFullName(),
      email: domain.getEmail(),
      phone: domain.getPhone().getValue(),
      role: domain.getRole(),
      status: domain.getStatus(),
      lastLoginAt: domain.getLastLoginAt(),
    };

    const domainId = domain.getId();
    if (domainId !== null && domainId !== undefined) {
      data.id = BigInt(domainId);
    }

    return data;
  }

  /**
   * Chuyển đổi từ Domain Entity User sang Prisma Update Input.
   *
   * @param {User} domain Thực thể User
   * @returns {Prisma.UserUncheckedUpdateInput} Dữ liệu phục vụ prisma.user.update()
   */
  public static toPersistenceUpdate(domain: User): Prisma.UserUncheckedUpdateInput {
    return {
      hubId: toBigInt(domain.getHubId()),
      passwordHash: domain.getPasswordHash(),
      fullName: domain.getFullName(),
      email: domain.getEmail(),
      phone: domain.getPhone().getValue(),
      role: domain.getRole(),
      status: domain.getStatus(),
      lastLoginAt: domain.getLastLoginAt(),
      updatedAt: domain.getUpdatedAt(),
    };
  }
}
