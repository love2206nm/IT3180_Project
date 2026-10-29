/**
 * @file prisma-delivery-zone.repository.ts
 * @description Hiện thực hóa hợp đồng IDeliveryZoneRepository quản lý Tuyến và Phân công Shipper (UC08).
 * @module infrastructure/database/repositories
 */

import { PrismaClient, type DeliveryZone as PrismaDeliveryZone } from '@prisma/client';
import { type IDeliveryZoneRepository, DeliveryZone } from '../../../domain';
import { prisma as defaultPrisma } from '../prisma/client';
import { DeliveryZoneMapper, toBigInt } from '../mappers';

/**
 * Repository quản lý Tuyến giao hàng và Phân công tuyến cho Shipper.
 */
export class PrismaDeliveryZoneRepository implements IDeliveryZoneRepository {
  private readonly prisma: PrismaClient;

  /**
   * Khởi tạo Repository với PrismaClient instance.
   * @param {PrismaClient} prismaClient Tùy chọn truyền instance khác
   */
  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Tìm tuyến giao hàng theo ID.
   * @param {string | number} id ID tuyến
   * @returns {Promise<DeliveryZone | null>}
   */
  public async findById(id: string | number): Promise<DeliveryZone | null> {
    const bigId = toBigInt(id);
    if (!bigId) return null;

    const raw = await this.prisma.deliveryZone.findUnique({
      where: { id: bigId },
    });

    return raw ? DeliveryZoneMapper.toDomain(raw) : null;
  }

  /**
   * Tìm tuyến theo mã duy nhất.
   * @param {string} code Mã tuyến (ví dụ: 'ZONE-CG-01')
   * @returns {Promise<DeliveryZone | null>}
   */
  public async findByCode(code: string): Promise<DeliveryZone | null> {
    const raw = await this.prisma.deliveryZone.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    return raw ? DeliveryZoneMapper.toDomain(raw) : null;
  }

  /**
   * Lấy danh sách toàn bộ các tuyến thuộc một trạm giao nhận (UC08).
   * @param {string | number} hubId ID của trạm
   * @returns {Promise<DeliveryZone[]>}
   */
  public async findByHubId(hubId: string | number): Promise<DeliveryZone[]> {
    const bigHubId = toBigInt(hubId);
    if (!bigHubId) return [];

    const rawZones = await this.prisma.deliveryZone.findMany({
      where: { hubId: bigHubId },
      orderBy: { code: 'asc' },
    });

    return rawZones.map(DeliveryZoneMapper.toDomain);
  }

  /**
   * Lưu hoặc cập nhật thông tin tuyến giao hàng.
   * @param {DeliveryZone} zone Thực thể DeliveryZone
   * @returns {Promise<DeliveryZone>}
   */
  public async save(zone: DeliveryZone): Promise<DeliveryZone> {
    const zoneId = zone.getId();
    let savedRaw: PrismaDeliveryZone;

    if (zoneId) {
      savedRaw = await this.prisma.deliveryZone.update({
        where: { id: BigInt(zoneId) },
        data: DeliveryZoneMapper.toPersistenceUpdate(zone),
      });
    } else {
      savedRaw = await this.prisma.deliveryZone.create({
        data: DeliveryZoneMapper.toPersistenceCreate(zone),
      });
    }

    return DeliveryZoneMapper.toDomain(savedRaw);
  }

  /**
   * Phân công tuyến giao hàng cho một Shipper phụ trách (UC08).
   * Tối ưu hóa bằng chỉ mục @@index([shipperId, status]).
   *
   * @param {string | number} shipperId ID của Shipper
   * @param {string | number} zoneId ID của tuyến
   * @returns {Promise<void>}
   */
  public async assignShipperToZone(
    shipperId: string | number,
    zoneId: string | number
  ): Promise<void> {
    const bigShipperId = toBigInt(shipperId);
    const bigZoneId = toBigInt(zoneId);

    if (!bigShipperId || !bigZoneId) {
      throw new Error('ShipperId và ZoneId bắt buộc phải hợp lệ khi phân tuyến.');
    }

    // Kiểm tra xem đã gán chưa, nếu chưa thì thêm mới
    const existing = await this.prisma.shipperZone.findFirst({
      where: {
        shipperId: bigShipperId,
        zoneId: bigZoneId,
      },
    });

    if (existing) {
      await this.prisma.shipperZone.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });
    } else {
      await this.prisma.shipperZone.create({
        data: {
          shipperId: bigShipperId,
          zoneId: bigZoneId,
          status: 'ACTIVE',
        },
      });
    }
  }

  /**
   * Hủy phân công tuyến của Shipper.
   * @param {string | number} shipperId ID của Shipper
   * @param {string | number} zoneId ID của tuyến
   * @returns {Promise<void>}
   */
  public async removeShipperFromZone(
    shipperId: string | number,
    zoneId: string | number
  ): Promise<void> {
    const bigShipperId = toBigInt(shipperId);
    const bigZoneId = toBigInt(zoneId);

    if (!bigShipperId || !bigZoneId) return;

    await this.prisma.shipperZone.deleteMany({
      where: {
        shipperId: bigShipperId,
        zoneId: bigZoneId,
      },
    });
  }

  /**
   * Lấy danh sách các tuyến đang được phân công cho một Shipper.
   * @param {string | number} shipperId ID của Shipper
   * @returns {Promise<DeliveryZone[]>}
   */
  public async findAssignedZonesByShipper(
    shipperId: string | number
  ): Promise<DeliveryZone[]> {
    const bigShipperId = toBigInt(shipperId);
    if (!bigShipperId) return [];

    const shipperZones = await this.prisma.shipperZone.findMany({
      where: {
        shipperId: bigShipperId,
        status: 'ACTIVE',
      },
      include: {
        zone: true,
      },
    });

    return shipperZones.map((sz) => DeliveryZoneMapper.toDomain(sz.zone));
  }
}
