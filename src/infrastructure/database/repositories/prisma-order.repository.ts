/**
 * @file prisma-order.repository.ts
 * @description Hiện thực hóa hợp đồng IOrderRepository sử dụng Prisma ORM và PostgreSQL.
 * @module infrastructure/database/repositories
 */

import { PrismaClient, type Prisma, type Order as PrismaOrder } from '@prisma/client';
import {
  type IOrderRepository,
  type OrderSearchCriteria,
  type ShipperPerformanceStat,
  Order,
  OrderStatusLog,
  ORDER_STATUS,
  PAYMENT_STATUS,
  type OrderStatus,
} from '../../../domain';
import { prisma as defaultPrisma } from '../prisma/client';
import { OrderMapper, OrderStatusLogMapper, toBigInt } from '../mappers';

/**
 * Repository quản lý dữ liệu Đơn hàng trong PostgreSQL.
 */
export class PrismaOrderRepository implements IOrderRepository {
  private readonly prisma: PrismaClient;

  /**
   * Khởi tạo Repository với PrismaClient instance.
   * @param {PrismaClient} prismaClient Tùy chọn truyền instance khác (phục vụ unit test / mock)
   */
  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Tìm đơn hàng theo ID nội bộ.
   * @param {string | number} id ID đơn hàng
   * @returns {Promise<Order | null>}
   */
  public async findById(id: string | number): Promise<Order | null> {
    const bigId = toBigInt(id);
    if (!bigId) return null;

    const raw = await this.prisma.order.findUnique({
      where: { id: bigId },
    });

    return raw ? OrderMapper.toDomain(raw) : null;
  }

  /**
   * Tìm đơn hàng theo Mã vận đơn duy nhất (UC15, UC23).
   * @param {string} trackingCode Chuỗi mã vận đơn
   * @returns {Promise<Order | null>}
   */
  public async findByTrackingCode(trackingCode: string): Promise<Order | null> {
    const raw = await this.prisma.order.findUnique({
      where: { trackingCode: trackingCode.trim().toUpperCase() },
    });

    return raw ? OrderMapper.toDomain(raw) : null;
  }

  /**
   * Lấy danh sách đơn hàng đang ở một trạm cụ thể theo trạng thái (UC10, UC16).
   * Tối ưu hóa bằng chỉ mục @@index([currentHubId, currentStatus]).
   *
   * @param {string | number} hubId ID của trạm
   * @param {OrderStatus | OrderStatus[]} status Trạng thái lọc
   * @returns {Promise<Order[]>}
   */
  public async findByHubAndStatus(
    hubId: string | number,
    status?: OrderStatus | OrderStatus[]
  ): Promise<Order[]> {
    const bigHubId = toBigInt(hubId);
    if (!bigHubId) return [];

    const where: Prisma.OrderWhereInput = {
      currentHubId: bigHubId,
    };

    if (status) {
      where.currentStatus = Array.isArray(status) ? { in: status } : status;
    }

    const rawOrders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rawOrders.map(OrderMapper.toDomain);
  }

  /**
   * Lấy danh sách đơn hàng đang được phân công cho một Shipper (UC17).
   * Tối ưu hóa bằng chỉ mục @@index([assignedShipperId, currentStatus]).
   *
   * @param {string | number} shipperId ID của nhân viên giao hàng
   * @param {OrderStatus | OrderStatus[]} status Trạng thái lọc
   * @returns {Promise<Order[]>}
   */
  public async findByShipperAndStatus(
    shipperId: string | number,
    status?: OrderStatus | OrderStatus[]
  ): Promise<Order[]> {
    const bigShipperId = toBigInt(shipperId);
    if (!bigShipperId) return [];

    const where: Prisma.OrderWhereInput = {
      assignedShipperId: bigShipperId,
    };

    if (status) {
      where.currentStatus = Array.isArray(status) ? { in: status } : status;
    }

    const rawOrders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rawOrders.map(OrderMapper.toDomain);
  }

  /**
   * Lưu hoặc cập nhật thông tin đơn hàng đơn lẻ.
   * @param {Order} order Thực thể đơn hàng
   * @returns {Promise<Order>}
   */
  public async save(order: Order): Promise<Order> {
    const orderId = order.getId();
    let savedRaw: PrismaOrder;

    if (orderId) {
      savedRaw = await this.prisma.order.update({
        where: { id: BigInt(orderId) },
        data: OrderMapper.toPersistenceUpdate(order),
      });
    } else {
      savedRaw = await this.prisma.order.create({
        data: OrderMapper.toPersistenceCreate(order),
      });
    }

    return OrderMapper.toDomain(savedRaw);
  }

  /**
   * Lưu cập nhật đơn hàng kèm ghi nhận bản ghi kiểm vết bất biến trong 1 transaction (ACID).
   * Bắt buộc tuân thủ theo nguyên tắc bất biến của hệ thống.
   *
   * @param {Order} order Thực thể đơn hàng cần cập nhật
   * @param {OrderStatusLog} log Bản ghi lịch sử trạng thái
   * @returns {Promise<Order>}
   */
  public async saveWithAuditLog(order: Order, log: OrderStatusLog): Promise<Order> {
    return await this.prisma.$transaction(async (tx) => {
      let savedRaw: PrismaOrder;
      const orderId = order.getId();

      if (orderId) {
        savedRaw = await tx.order.update({
          where: { id: BigInt(orderId) },
          data: OrderMapper.toPersistenceUpdate(order),
        });
      } else {
        savedRaw = await tx.order.create({
          data: OrderMapper.toPersistenceCreate(order),
        });
      }

      const logData = OrderStatusLogMapper.toPersistenceCreate(log, savedRaw.id);

      await tx.orderStatusLog.create({
        data: logData,
      });

      return OrderMapper.toDomain(savedRaw);
    });
  }

  /**
   * Lưu hàng loạt đơn hàng mới (UC14 - Import Excel).
   * @param {Order[]} orders Danh sách các đơn hàng cần tạo
   * @returns {Promise<Order[]>}
   */
  public async createBatch(orders: Order[]): Promise<Order[]> {
    if (orders.length === 0) return [];

    return await this.prisma.$transaction(async (tx) => {
      const results: Order[] = [];
      for (const order of orders) {
        const savedRaw = await tx.order.create({
          data: OrderMapper.toPersistenceCreate(order),
        });

        // Tạo bản ghi log đầu tiên CREATED
        await tx.orderStatusLog.create({
          data: {
            orderId: savedRaw.id,
            actorId: savedRaw.assignedShipperId ?? BigInt(1),
            newStatus: ORDER_STATUS.CREATED,
            note: 'Tạo đơn mới từ Import Excel',
          },
        });

        results.push(OrderMapper.toDomain(savedRaw));
      }
      return results;
    });
  }

  /**
   * Gán hàng loạt đơn hàng cho một Shipper trong 1 transaction và tự động ghi log (UC16).
   *
   * @param {(string | number)[]} orderIds Danh sách ID các đơn
   * @param {string | number} shipperId ID của Shipper
   * @param {string | number} actorId ID của người điều phối
   * @param {string} note Ghi chú điều phối
   * @returns {Promise<number>} Số lượng đơn hàng đã gán
   */
  public async assignOrdersBatch(
    orderIds: (string | number)[],
    shipperId: string | number,
    actorId: string | number,
    note?: string
  ): Promise<number> {
    const bigShipperId = toBigInt(shipperId);
    const bigActorId = toBigInt(actorId);
    const bigOrderIds = orderIds.map(toBigInt).filter((id): id is bigint => id !== null);

    if (!bigShipperId || !bigActorId || bigOrderIds.length === 0) {
      return 0;
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái và shipper cho danh sách đơn
      const updateResult = await tx.order.updateMany({
        where: {
          id: { in: bigOrderIds },
          currentStatus: { in: [ORDER_STATUS.AT_HUB, ORDER_STATUS.FAILED_ATTEMPT] },
        },
        data: {
          assignedShipperId: bigShipperId,
          currentStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
        },
      });

      // 2. Tạo bản ghi log cho từng đơn
      const logsToCreate = bigOrderIds.map((orderId) => ({
        orderId,
        actorId: bigActorId,
        previousStatus: ORDER_STATUS.AT_HUB,
        newStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
        note: note ?? `Điều phối bàn giao cho Shipper #${shipperId}`,
      }));

      await tx.orderStatusLog.createMany({
        data: logsToCreate,
      });

      return updateResult.count;
    });
  }

  /**
   * Lấy danh sách đơn hàng đã giao thành công (DELIVERED, PAID) có thu COD nhưng chưa đối soát (UC22).
   * Tối ưu hóa bằng chỉ mục @@index([assignedShipperId, currentStatus, paymentStatus]).
   *
   * @param {string | number} shipperId ID của Shipper
   * @returns {Promise<Order[]>}
   */
  public async findUnsettledCodOrdersByShipper(
    shipperId: string | number
  ): Promise<Order[]> {
    const bigShipperId = toBigInt(shipperId);
    if (!bigShipperId) return [];

    const rawOrders = await this.prisma.order.findMany({
      where: {
        assignedShipperId: bigShipperId,
        currentStatus: ORDER_STATUS.DELIVERED,
        paymentStatus: PAYMENT_STATUS.PAID,
        codAmount: { gt: 0 },
        codSettlementDetails: {
          none: {},
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rawOrders.map(OrderMapper.toDomain);
  }

  /**
   * Tìm kiếm đơn hàng phân trang theo nhiều tiêu chí lọc (UC10).
   * Tận dụng tối đa 12 chỉ mục đã thiết kế.
   *
   * @param {OrderSearchCriteria} criteria Bộ tiêu chí lọc
   * @returns {Promise<{ orders: Order[]; total: number }>}
   */
  public async search(
    criteria: OrderSearchCriteria
  ): Promise<{ orders: Order[]; total: number }> {
    const where: Prisma.OrderWhereInput = {};

    if (criteria.trackingCode) {
      where.trackingCode = {
        contains: criteria.trackingCode.trim().toUpperCase(),
      };
    }

    if (criteria.senderPhone) {
      where.senderPhone = { contains: criteria.senderPhone.trim() };
    }

    if (criteria.receiverPhone) {
      where.receiverPhone = { contains: criteria.receiverPhone.trim() };
    }

    if (criteria.currentHubId !== undefined) {
      const bigHubId = toBigInt(criteria.currentHubId);
      if (bigHubId) where.currentHubId = bigHubId;
    }

    if (criteria.assignedShipperId !== undefined) {
      const bigShipperId = toBigInt(criteria.assignedShipperId);
      if (bigShipperId) where.assignedShipperId = bigShipperId;
    }

    if (criteria.status) {
      where.currentStatus = Array.isArray(criteria.status)
        ? { in: criteria.status }
        : criteria.status;
    }

    if (criteria.startDate || criteria.endDate) {
      where.createdAt = {};
      if (criteria.startDate) where.createdAt.gte = criteria.startDate;
      if (criteria.endDate) where.createdAt.lte = criteria.endDate;
    }

    const page = Math.max(1, criteria.page ?? 1);
    const limit = Math.max(1, Math.min(100, criteria.limit ?? 20));
    const skip = (page - 1) * limit;

    const [total, rawOrders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      orders: rawOrders.map(OrderMapper.toDomain),
      total,
    };
  }

  /**
   * Thống kê số lượng đơn hàng theo từng trạng thái (UC21).
   * @param {string | number} hubId Tùy chọn lọc theo trạm
   * @returns {Promise<Record<OrderStatus, number>>}
   */
  public async countByStatus(
    hubId?: string | number
  ): Promise<Record<OrderStatus, number>> {
    const where: Prisma.OrderWhereInput = {};
    const bigHubId = toBigInt(hubId);
    if (bigHubId) {
      where.currentHubId = bigHubId;
    }

    const groups = await this.prisma.order.groupBy({
      by: ['currentStatus'],
      where,
      _count: {
        id: true,
      },
    });

    // Khởi tạo bảng đếm mặc định cho toàn bộ các trạng thái = 0
    const counts: Record<OrderStatus, number> = {
      [ORDER_STATUS.CREATED]: 0,
      [ORDER_STATUS.AT_HUB]: 0,
      [ORDER_STATUS.OUT_FOR_DELIVERY]: 0,
      [ORDER_STATUS.DELIVERED]: 0,
      [ORDER_STATUS.FAILED_ATTEMPT]: 0,
      [ORDER_STATUS.RETURN_PENDING]: 0,
      [ORDER_STATUS.RETURNED]: 0,
      [ORDER_STATUS.CANCELLED]: 0,
    };

    for (const group of groups) {
      counts[group.currentStatus as OrderStatus] = group._count.id;
    }

    return counts;
  }

  /**
   * Thống kê tổng hợp hiệu suất toàn bộ Shipper tại trạm trong 1 câu truy vấn aggregate (UC21).
   * Thay thế hoàn toàn vòng lặp 3xN queries.
   *
   * @param {string | number} hubId ID của trạm
   * @returns {Promise<ShipperPerformanceStat[]>}
   */
  public async getShipperPerformanceStats(
    hubId: string | number
  ): Promise<ShipperPerformanceStat[]> {
    const bigHubId = toBigInt(hubId);
    if (!bigHubId) return [];

    const groups = await this.prisma.order.groupBy({
      by: ['assignedShipperId', 'currentStatus'],
      where: {
        currentHubId: bigHubId,
        assignedShipperId: { not: null },
      },
      _count: {
        id: true,
      },
      _sum: {
        codAmount: true,
      },
    });

    const statsMap = new Map<string, ShipperPerformanceStat>();

    for (const g of groups) {
      if (!g.assignedShipperId) continue;
      const sid = String(g.assignedShipperId);

      if (!statsMap.has(sid)) {
        statsMap.set(sid, {
          shipperId: sid,
          totalAssigned: 0,
          totalDelivered: 0,
          totalFailed: 0,
          totalCodCollected: 0,
        });
      }

      const stat = statsMap.get(sid)!;
      const count = g._count.id;
      const status = g.currentStatus;

      if (
        status === ORDER_STATUS.DELIVERED ||
        status === ORDER_STATUS.OUT_FOR_DELIVERY ||
        status === ORDER_STATUS.FAILED_ATTEMPT
      ) {
        stat.totalAssigned += count;
      }

      if (status === ORDER_STATUS.DELIVERED) {
        stat.totalDelivered += count;
        stat.totalCodCollected += Number(g._sum.codAmount ?? 0);
      } else if (status === ORDER_STATUS.FAILED_ATTEMPT) {
        stat.totalFailed += count;
      }
    }

    return Array.from(statsMap.values());
  }
}
