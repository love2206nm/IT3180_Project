/**
 * @file prisma-cod-settlement.repository.ts
 * @description Hiện thực hóa hợp đồng ICODSettlementRepository quản lý Phiên đối soát COD (UC22).
 * @module infrastructure/database/repositories
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import {
  type ICODSettlementRepository,
  CODSettlement,
  type CODSettlementStatus,
} from '../../../domain';
import { prisma as defaultPrisma } from '../prisma/client';
import { CODSettlementMapper, toBigInt } from '../mappers';

/**
 * Repository quản lý Phiên nộp và Đối soát Tiền thu hộ COD giữa Shipper và Quản lý trạm.
 */
export class PrismaCODSettlementRepository implements ICODSettlementRepository {
  private readonly prisma: PrismaClient;

  /**
   * Khởi tạo Repository với PrismaClient instance.
   * @param {PrismaClient} prismaClient Tùy chọn truyền instance khác
   */
  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Tìm phiên đối soát theo ID.
   * @param {string | number} id ID phiên đối soát
   * @returns {Promise<CODSettlement | null>}
   */
  public async findById(id: string | number): Promise<CODSettlement | null> {
    const bigId = toBigInt(id);
    if (!bigId) return null;

    const raw = await this.prisma.cODSettlement.findUnique({
      where: { id: bigId },
      include: { details: true },
    });

    return raw ? CODSettlementMapper.toDomain(raw) : null;
  }

  /**
   * Tìm phiên đối soát theo Mã định danh duy nhất (ví dụ: 'COD-20261029-01').
   * @param {string} settlementCode Mã phiên
   * @returns {Promise<CODSettlement | null>}
   */
  public async findByCode(settlementCode: string): Promise<CODSettlement | null> {
    const raw = await this.prisma.cODSettlement.findUnique({
      where: { settlementCode: settlementCode.trim().toUpperCase() },
      include: { details: true },
    });

    return raw ? CODSettlementMapper.toDomain(raw) : null;
  }

  /**
   * Lấy danh sách các phiên nộp tiền của một Shipper cụ thể.
   * Tối ưu hóa bằng chỉ mục @@index([shipperId, status]).
   *
   * @param {string | number} shipperId ID của Shipper
   * @param {CODSettlementStatus} status Trạng thái lọc
   * @returns {Promise<CODSettlement[]>}
   */
  public async findByShipper(
    shipperId: string | number,
    status?: CODSettlementStatus
  ): Promise<CODSettlement[]> {
    const bigShipperId = toBigInt(shipperId);
    if (!bigShipperId) return [];

    const where: Prisma.CODSettlementWhereInput = {
      shipperId: bigShipperId,
    };
    if (status) where.status = status;

    const rawList = await this.prisma.cODSettlement.findMany({
      where,
      include: { details: true },
      orderBy: { createdAt: 'desc' },
    });

    return rawList.map(CODSettlementMapper.toDomain);
  }

  /**
   * Lấy danh sách các phiên nộp tiền tại một Trạm.
   * Tối ưu hóa bằng chỉ mục @@index([hubId, status]).
   *
   * @param {string | number} hubId ID của trạm
   * @param {CODSettlementStatus} status Trạng thái lọc
   * @returns {Promise<CODSettlement[]>}
   */
  public async findByHub(
    hubId: string | number,
    status?: CODSettlementStatus
  ): Promise<CODSettlement[]> {
    const bigHubId = toBigInt(hubId);
    if (!bigHubId) return [];

    const where: Prisma.CODSettlementWhereInput = {
      hubId: bigHubId,
    };
    if (status) where.status = status;

    const rawList = await this.prisma.cODSettlement.findMany({
      where,
      include: { details: true },
      orderBy: { createdAt: 'desc' },
    });

    return rawList.map(CODSettlementMapper.toDomain);
  }

  /**
   * Lưu hoặc cập nhật phiên đối soát COD trong 1 transaction ACID cùng với bảng chi tiết.
   *
   * @param {CODSettlement} settlement Thực thể CODSettlement
   * @returns {Promise<CODSettlement>}
   */
  public async save(settlement: CODSettlement): Promise<CODSettlement> {
    const settlementId = settlement.getId();

    return await this.prisma.$transaction(async (tx) => {
      let rawResult;

      if (settlementId) {
        rawResult = await tx.cODSettlement.update({
          where: { id: BigInt(settlementId) },
          data: CODSettlementMapper.toPersistenceUpdate(settlement),
          include: { details: true },
        });
      } else {
        const createData = CODSettlementMapper.toPersistenceCreate(settlement);
        const createdHeader = await tx.cODSettlement.create({
          data: createData,
        });

        // Nếu có danh sách chi tiết đơn nộp kèm theo
        const details = settlement.getDetails();
        if (details.length > 0) {
          const detailRows = CODSettlementMapper.toPersistenceDetails(
            createdHeader.id,
            details
          );
          await tx.cODSettlementDetail.createMany({
            data: detailRows,
          });
        }

        rawResult = await tx.cODSettlement.findUniqueOrThrow({
          where: { id: createdHeader.id },
          include: { details: true },
        });
      }

      return CODSettlementMapper.toDomain(rawResult);
    });
  }
}
