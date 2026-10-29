/**
 * @file prisma-order-status-log.repository.ts
 * @description Hiện thực hóa hợp đồng IOrderStatusLogRepository lưu vết lịch sử bưu kiện (UC11, UC23).
 * @module infrastructure/database/repositories
 */

import { PrismaClient, type OrderStatusLog as PrismaOrderStatusLog } from '@prisma/client';
import { type IOrderStatusLogRepository, OrderStatusLog } from '../../../domain';
import { prisma as defaultPrisma } from '../prisma/client';
import { OrderStatusLogMapper, toBigInt } from '../mappers';

/**
 * Repository quản lý Bản ghi Kiểm vết Bất biến (Audit Log) cho bưu kiện.
 */
export class PrismaOrderStatusLogRepository implements IOrderStatusLogRepository {
  private readonly prisma: PrismaClient;

  /**
   * Khởi tạo Repository với PrismaClient instance.
   * @param {PrismaClient} prismaClient Tùy chọn truyền instance khác
   */
  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Lấy toàn bộ lịch sử trạng thái của một đơn hàng, sắp xếp theo thời gian mới nhất (UC11, UC23).
   * Tối ưu hóa bằng chỉ mục @@index([orderId, createdAt(sort: Desc)]).
   *
   * @param {string | number} orderId ID đơn hàng
   * @returns {Promise<OrderStatusLog[]>} Danh sách bản ghi log theo thứ tự dòng thời gian
   */
  public async findByOrderId(orderId: string | number): Promise<OrderStatusLog[]> {
    const bigOrderId = toBigInt(orderId);
    if (!bigOrderId) return [];

    const rawLogs = await this.prisma.orderStatusLog.findMany({
      where: { orderId: bigOrderId },
      orderBy: { createdAt: 'desc' },
    });

    return rawLogs.map(OrderStatusLogMapper.toDomain);
  }

  /**
   * Lưu một bản ghi lịch sử kiểm vết mới.
   * @param {OrderStatusLog} log Thực thể OrderStatusLog
   * @returns {Promise<OrderStatusLog>}
   */
  public async save(log: OrderStatusLog): Promise<OrderStatusLog> {
    const savedRaw: PrismaOrderStatusLog = await this.prisma.orderStatusLog.create({
      data: OrderStatusLogMapper.toPersistenceCreate(log),
    });

    return OrderStatusLogMapper.toDomain(savedRaw);
  }

  /**
   * Lưu hàng loạt bản ghi log (khi xử lý đơn hàng loạt).
   * @param {OrderStatusLog[]} logs Danh sách bản ghi log
   * @returns {Promise<void>}
   */
  public async saveBatch(logs: OrderStatusLog[]): Promise<void> {
    if (logs.length === 0) return;

    const data = logs.map(OrderStatusLogMapper.toPersistenceCreate);
    await this.prisma.orderStatusLog.createMany({
      data,
    });
  }
}
