/**
 * @file prisma-hub.repository.ts
 * @description Hiện thực hóa hợp đồng IHubRepository sử dụng Prisma ORM và PostgreSQL.
 * @module infrastructure/database/repositories
 */

import { PrismaClient, type Prisma, type Hub as PrismaHub } from '@prisma/client';
import { type IHubRepository, Hub, type HubStatus } from '../../../domain';
import { prisma as defaultPrisma } from '../prisma/client';
import { HubMapper, toBigInt } from '../mappers';

/**
 * Repository quản lý Mạng lưới Trạm giao nhận (Hubs).
 */
export class PrismaHubRepository implements IHubRepository {
  private readonly prisma: PrismaClient;

  /**
   * Khởi tạo Repository với PrismaClient instance.
   * @param {PrismaClient} prismaClient Tùy chọn truyền instance khác
   */
  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Tìm trạm theo ID.
   * @param {string | number} id ID trạm
   * @returns {Promise<Hub | null>}
   */
  public async findById(id: string | number): Promise<Hub | null> {
    const bigId = toBigInt(id);
    if (!bigId) return null;

    const raw = await this.prisma.hub.findUnique({
      where: { id: bigId },
    });

    return raw ? HubMapper.toDomain(raw) : null;
  }

  /**
   * Tìm trạm theo Mã duy nhất (ví dụ: 'HUB-HAN-01').
   * @param {string} code Mã trạm
   * @returns {Promise<Hub | null>}
   */
  public async findByCode(code: string): Promise<Hub | null> {
    const raw = await this.prisma.hub.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    return raw ? HubMapper.toDomain(raw) : null;
  }

  /**
   * Lấy toàn bộ danh sách trạm (có thể lọc theo trạng thái hoạt động).
   * @param {HubStatus} status Trạng thái lọc
   * @returns {Promise<Hub[]>}
   */
  public async findAll(status?: HubStatus): Promise<Hub[]> {
    const where: Prisma.HubWhereInput = {};
    if (status) where.status = status;

    const rawHubs = await this.prisma.hub.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    return rawHubs.map(HubMapper.toDomain);
  }

  /**
   * Tìm các trạm thuộc một Tỉnh/Thành phố.
   * @param {string} province Tên Tỉnh/Thành phố
   * @returns {Promise<Hub[]>}
   */
  public async findByProvince(province: string): Promise<Hub[]> {
    const rawHubs = await this.prisma.hub.findMany({
      where: {
        province: { contains: province.trim(), mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
    });

    return rawHubs.map(HubMapper.toDomain);
  }

  /**
   * Lưu hoặc cập nhật trạm.
   * @param {Hub} hub Thực thể Hub
   * @returns {Promise<Hub>}
   */
  public async save(hub: Hub): Promise<Hub> {
    const hubId = hub.getId();
    let savedRaw: PrismaHub;

    if (hubId) {
      savedRaw = await this.prisma.hub.update({
        where: { id: BigInt(hubId) },
        data: HubMapper.toPersistenceUpdate(hub),
      });
    } else {
      savedRaw = await this.prisma.hub.create({
        data: HubMapper.toPersistenceCreate(hub),
      });
    }

    return HubMapper.toDomain(savedRaw);
  }
}
