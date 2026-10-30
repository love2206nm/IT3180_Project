/**
 * @file in-memory-repositories.ts
 * @description Các kho lưu trữ giả lập trong bộ nhớ (In-Memory Repositories) phục vụ Unit Tests cho Tầng Application.
 * Đảm bảo tốc độ chạy cực nhanh (<200ms) độc lập 100% với PostgreSQL.
 */

import { User } from '../../../src/domain/entities/user.entity';
import { Hub } from '../../../src/domain/entities/hub.entity';
import { Order } from '../../../src/domain/entities/order.entity';
import { OrderStatusLog } from '../../../src/domain/entities/order-status-log.entity';
import { DeliveryZone } from '../../../src/domain/entities/delivery-zone.entity';
import { CODSettlement } from '../../../src/domain/entities/cod-settlement.entity';
import type { IUserRepository, UserSearchCriteria } from '../../../src/domain/interface/repositories/user.repository.interface';
import type { IHubRepository } from '../../../src/domain/interface/repositories/hub.repository.interface';
import type { IOrderRepository, OrderSearchCriteria, ShipperPerformanceStat } from '../../../src/domain/interface/repositories/order.repository.interface';
import type { IOrderStatusLogRepository } from '../../../src/domain/interface/repositories/order-status-log.repository.interface';
import type { IDeliveryZoneRepository } from '../../../src/domain/interface/repositories/delivery-zone.repository.interface';
import type { ICODSettlementRepository } from '../../../src/domain/interface/repositories/cod-settlement.repository.interface';
import type { IPasswordHasherService } from '../../../src/application/interfaces/password-hasher.service.interface';
import type { IAuthTokenService, AuthTokenPayload, LoginLockoutStatus } from '../../../src/application/interfaces/auth-token.service.interface';
import { ORDER_STATUS, type OrderStatus } from '../../../src/domain/constants/order-status.constant';
import { USER_ROLE, type UserRole } from '../../../src/domain/constants/roles.constant';
import { type UserStatus } from '../../../src/domain/constants/user-status.constant';
import { type HubStatus } from '../../../src/domain/constants/hub-status.constant';
import { type CODSettlementStatus } from '../../../src/domain/constants/cod-status.constant';

export class InMemoryUserRepository implements IUserRepository {
  public users: Map<string, User> = new Map();
  private autoId = 1;

  async findById(id: string | number): Promise<User | null> {
    return this.users.get(String(id)) ?? null;
  }

  async findByIds(ids: (string | number)[]): Promise<User[]> {
    const stringIds = new Set(ids.map(String));
    return Array.from(this.users.values()).filter((u) => stringIds.has(String(u.getId())));
  }

  async findByUsername(username: string): Promise<User | null> {
    const lower = username.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.getUsername() === lower) return u;
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const lower = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.getEmail() === lower) return u;
    }
    return null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.getPhone().toStandardString() === phone) return u;
    }
    return null;
  }

  async findByHub(hubId: string | number, role?: UserRole, status?: UserStatus): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => {
      if (String(u.getHubId()) !== String(hubId)) return false;
      if (role && u.getRole() !== role) return false;
      if (status && u.getStatus() !== status) return false;
      return true;
    });
  }

  async findActiveShippersByHub(hubId: string | number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (u) => String(u.getHubId()) === String(hubId) && u.isShipper() && u.isActive()
    );
  }

  async save(user: User): Promise<User> {
    let id = user.getId();
    if (!id) {
      id = String(this.autoId++);
      // Tạo User entity mới có ID
      const userWithId = new User({
        id,
        hubId: user.getHubId(),
        username: user.getUsername(),
        passwordHash: user.getPasswordHash(),
        fullName: user.getFullName(),
        email: user.getEmail(),
        phone: user.getPhone(),
        role: user.getRole(),
        status: user.getStatus(),
        lastLoginAt: user.getLastLoginAt(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt(),
      });
      this.users.set(String(id), userWithId);
      return userWithId;
    }
    this.users.set(String(id), user);
    return user;
  }

  async search(criteria: UserSearchCriteria): Promise<{ users: User[]; total: number }> {
    let list = Array.from(this.users.values());

    if (criteria.hubId) {
      list = list.filter((u) => String(u.getHubId()) === String(criteria.hubId));
    }
    if (criteria.role) {
      list = list.filter((u) => u.getRole() === criteria.role);
    }
    if (criteria.status) {
      list = list.filter((u) => u.getStatus() === criteria.status);
    }

    const total = list.length;
    const page = criteria.page ?? 1;
    const limit = criteria.limit ?? 10;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return { users: paginated, total };
  }
}

export class InMemoryHubRepository implements IHubRepository {
  public hubs: Map<string, Hub> = new Map();
  private autoId = 1;

  async findById(id: string | number): Promise<Hub | null> {
    return this.hubs.get(String(id)) ?? null;
  }

  async findByIds(ids: (string | number)[]): Promise<Hub[]> {
    const stringIds = new Set(ids.map(String));
    return Array.from(this.hubs.values()).filter((h) => stringIds.has(String(h.getId())));
  }

  async findByCode(code: string): Promise<Hub | null> {
    const upper = code.trim().toUpperCase();
    for (const h of this.hubs.values()) {
      if (h.getCode() === upper) return h;
    }
    return null;
  }

  async findAll(status?: HubStatus): Promise<Hub[]> {
    const list = Array.from(this.hubs.values());
    return status ? list.filter((h) => h.getStatus() === status) : list;
  }

  async findByProvince(province: string): Promise<Hub[]> {
    return Array.from(this.hubs.values()).filter((h) => h.getProvince().includes(province));
  }

  async save(hub: Hub): Promise<Hub> {
    let id = hub.getId();
    if (!id) {
      id = String(this.autoId++);
      const hubWithId = new Hub({
        id,
        code: hub.getCode(),
        name: hub.getName(),
        address: hub.getAddress(),
        province: hub.getProvince(),
        district: hub.getDistrict(),
        ward: hub.getWard(),
        phone: hub.getPhone(),
        status: hub.getStatus(),
        createdAt: hub.getCreatedAt(),
        updatedAt: hub.getUpdatedAt(),
      });
      this.hubs.set(String(id), hubWithId);
      return hubWithId;
    }
    this.hubs.set(String(id), hub);
    return hub;
  }
}

export class InMemoryOrderRepository implements IOrderRepository {
  public orders: Map<string, Order> = new Map();
  public statusLogs: OrderStatusLog[] = [];
  private autoId = 1;

  constructor(private readonly logRepo?: InMemoryOrderStatusLogRepository) {}

  async findById(id: string | number): Promise<Order | null> {
    return this.orders.get(String(id)) ?? null;
  }

  async findByTrackingCode(trackingCode: string): Promise<Order | null> {
    const upper = trackingCode.trim().toUpperCase();
    for (const o of this.orders.values()) {
      if (o.getTrackingCode().getValue() === upper) return o;
    }
    return null;
  }

  async findByHubAndStatus(hubId: string | number, status?: OrderStatus | OrderStatus[]): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => {
      if (String(o.getCurrentHubId()) !== String(hubId)) return false;
      if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        if (!statuses.includes(o.getCurrentStatus())) return false;
      }
      return true;
    });
  }

  async findByShipperAndStatus(shipperId: string | number, status?: OrderStatus | OrderStatus[]): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => {
      if (String(o.getAssignedShipperId()) !== String(shipperId)) return false;
      if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        if (!statuses.includes(o.getCurrentStatus())) return false;
      }
      return true;
    });
  }

  async save(order: Order): Promise<Order> {
    let id = order.getId();
    if (!id) {
      id = String(this.autoId++);
      const orderWithId = new Order({
        id,
        trackingCode: order.getTrackingCode(),
        currentHubId: order.getCurrentHubId(),
        assignedShipperId: order.getAssignedShipperId(),
        senderName: order.getSenderName(),
        senderPhone: order.getSenderPhone(),
        senderAddress: order.getSenderAddress(),
        receiverName: order.getReceiverName(),
        receiverPhone: order.getReceiverPhone(),
        receiverAddress: order.getReceiverAddress(),
        dimensions: order.getDimensions(),
        codAmount: order.getCodAmount(),
        shippingFee: order.getShippingFee(),
        paymentBy: order.getPaymentBy(),
        paymentStatus: order.getPaymentStatus(),
        currentStatus: order.getCurrentStatus(),
        deliveryAttempts: order.getDeliveryAttempts(),
        maxAttempts: order.getMaxAttempts(),
        notes: order.getNotes(),
        createdAt: order.getCreatedAt(),
        updatedAt: order.getUpdatedAt(),
      });
      this.orders.set(String(id), orderWithId);
      return orderWithId;
    }
    this.orders.set(String(id), order);
    return order;
  }

  async saveWithAuditLog(order: Order, log: OrderStatusLog): Promise<Order> {
    const savedOrder = await this.save(order);
    const logWithCorrectOrderId = new OrderStatusLog({
      id: log.getId(),
      orderId: savedOrder.getId()!,
      hubId: log.getHubId(),
      actorId: log.getActorId(),
      previousStatus: log.getPreviousStatus(),
      newStatus: log.getNewStatus(),
      failureReason: log.getFailureReason(),
      proofImageUrl: log.getProofImageUrl(),
      location: log.getLocation(),
      note: log.getNote(),
      createdAt: log.getCreatedAt(),
    });
    this.statusLogs.push(logWithCorrectOrderId);
    if (this.logRepo) {
      await this.logRepo.save(logWithCorrectOrderId);
    }
    return savedOrder;
  }

  async createBatch(orders: Order[]): Promise<Order[]> {
    const result: Order[] = [];
    for (const o of orders) {
      result.push(await this.save(o));
    }
    return result;
  }

  async assignOrdersBatch(
    orderIds: (string | number)[],
    shipperId: string | number,
    actorId: string | number,
    note?: string
  ): Promise<number> {
    let count = 0;
    for (const id of orderIds) {
      const order = await this.findById(id);
      if (order) {
        order.assignToShipper(shipperId);
        const log = new OrderStatusLog({
          orderId: order.getId()!,
          hubId: order.getCurrentHubId(),
          actorId,
          previousStatus: ORDER_STATUS.AT_HUB,
          newStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
          note: note ?? 'Đã bàn giao cho Shipper',
        });
        await this.saveWithAuditLog(order, log);
        count++;
      }
    }
    return count;
  }

  async findUnsettledCodOrdersByShipper(shipperId: string | number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (o) =>
        String(o.getAssignedShipperId()) === String(shipperId) &&
        o.getCurrentStatus() === ORDER_STATUS.DELIVERED &&
        o.requiresCOD()
    );
  }

  async search(criteria: OrderSearchCriteria): Promise<{ orders: Order[]; total: number }> {
    let list = Array.from(this.orders.values());

    if (criteria.trackingCode) {
      list = list.filter((o) => o.getTrackingCode().getValue().includes(criteria.trackingCode!));
    }
    if (criteria.senderPhone) {
      list = list.filter((o) => o.getSenderPhone().toStandardString().includes(criteria.senderPhone!));
    }
    if (criteria.receiverPhone) {
      list = list.filter((o) => o.getReceiverPhone().toStandardString().includes(criteria.receiverPhone!));
    }
    if (criteria.currentHubId) {
      list = list.filter((o) => String(o.getCurrentHubId()) === String(criteria.currentHubId));
    }
    if (criteria.assignedShipperId) {
      list = list.filter((o) => String(o.getAssignedShipperId()) === String(criteria.assignedShipperId));
    }
    if (criteria.status) {
      const statuses = Array.isArray(criteria.status) ? criteria.status : [criteria.status];
      list = list.filter((o) => statuses.includes(o.getCurrentStatus()));
    }

    const total = list.length;
    const page = criteria.page ?? 1;
    const limit = criteria.limit ?? 10;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return { orders: paginated, total };
  }

  async countByStatus(hubId?: string | number): Promise<Record<OrderStatus, number>> {
    const record: Record<OrderStatus, number> = {
      [ORDER_STATUS.CREATED]: 0,
      [ORDER_STATUS.AT_HUB]: 0,
      [ORDER_STATUS.OUT_FOR_DELIVERY]: 0,
      [ORDER_STATUS.DELIVERED]: 0,
      [ORDER_STATUS.FAILED_ATTEMPT]: 0,
      [ORDER_STATUS.RETURN_PENDING]: 0,
      [ORDER_STATUS.RETURNED]: 0,
      [ORDER_STATUS.CANCELLED]: 0,
    };

    for (const o of this.orders.values()) {
      if (hubId && String(o.getCurrentHubId()) !== String(hubId)) continue;
      record[o.getCurrentStatus()] = (record[o.getCurrentStatus()] || 0) + 1;
    }

    return record;
  }

  async getShipperPerformanceStats(hubId: string | number): Promise<ShipperPerformanceStat[]> {
    const statsMap = new Map<string, ShipperPerformanceStat>();

    for (const o of this.orders.values()) {
      if (String(o.getCurrentHubId()) !== String(hubId)) continue;
      const sid = o.getAssignedShipperId();
      if (!sid) continue;
      const sidStr = String(sid);

      if (!statsMap.has(sidStr)) {
        statsMap.set(sidStr, {
          shipperId: sidStr,
          totalAssigned: 0,
          totalDelivered: 0,
          totalFailed: 0,
          totalCodCollected: 0,
        });
      }

      const stat = statsMap.get(sidStr)!;
      const status = o.getCurrentStatus();

      if (
        status === ORDER_STATUS.DELIVERED ||
        status === ORDER_STATUS.OUT_FOR_DELIVERY ||
        status === ORDER_STATUS.FAILED_ATTEMPT
      ) {
        stat.totalAssigned += 1;
      }

      if (status === ORDER_STATUS.DELIVERED) {
        stat.totalDelivered += 1;
        stat.totalCodCollected += o.getCodAmount().getAmountAsNumber();
      } else if (status === ORDER_STATUS.FAILED_ATTEMPT) {
        stat.totalFailed += 1;
      }
    }

    return Array.from(statsMap.values());
  }
}

export class InMemoryOrderStatusLogRepository implements IOrderStatusLogRepository {
  public logs: OrderStatusLog[] = [];
  private autoId = 1;

  async findByOrderId(orderId: string | number): Promise<OrderStatusLog[]> {
    return this.logs
      .filter((l) => String(l.getOrderId()) === String(orderId))
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());
  }

  async save(log: OrderStatusLog): Promise<OrderStatusLog> {
    let id = log.getId();
    if (!id) {
      id = String(this.autoId++);
      const logWithId = new OrderStatusLog({
        id,
        orderId: log.getOrderId(),
        hubId: log.getHubId(),
        actorId: log.getActorId(),
        previousStatus: log.getPreviousStatus(),
        newStatus: log.getNewStatus(),
        failureReason: log.getFailureReason(),
        proofImageUrl: log.getProofImageUrl(),
        location: log.getLocation(),
        note: log.getNote(),
        createdAt: log.getCreatedAt(),
      });
      this.logs.push(logWithId);
      return logWithId;
    }
    this.logs.push(log);
    return log;
  }

  async saveBatch(logs: OrderStatusLog[]): Promise<void> {
    for (const l of logs) {
      await this.save(l);
    }
  }
}

export class InMemoryDeliveryZoneRepository implements IDeliveryZoneRepository {
  public zones: Map<string, DeliveryZone> = new Map();
  public shipperAssignments: Map<string, Set<string>> = new Map(); // shipperId -> Set<zoneId>
  private autoId = 1;

  async findById(id: string | number): Promise<DeliveryZone | null> {
    return this.zones.get(String(id)) ?? null;
  }

  async findByCode(code: string): Promise<DeliveryZone | null> {
    for (const z of this.zones.values()) {
      if (z.getCode() === code.trim().toUpperCase()) return z;
    }
    return null;
  }

  async findByHubId(hubId: string | number): Promise<DeliveryZone[]> {
    return Array.from(this.zones.values()).filter((z) => String(z.getHubId()) === String(hubId));
  }

  async save(zone: DeliveryZone): Promise<DeliveryZone> {
    let id = zone.getId();
    if (!id) {
      id = String(this.autoId++);
      const zoneWithId = new DeliveryZone({
        id,
        hubId: zone.getHubId(),
        code: zone.getCode(),
        name: zone.getName(),
        province: zone.getProvince(),
        district: zone.getDistrict(),
        ward: zone.getWard(),
        createdAt: zone.getCreatedAt(),
        updatedAt: zone.getUpdatedAt(),
      });
      this.zones.set(String(id), zoneWithId);
      return zoneWithId;
    }
    this.zones.set(String(id), zone);
    return zone;
  }

  async assignShipperToZone(shipperId: string | number, zoneId: string | number): Promise<void> {
    const sid = String(shipperId);
    const zid = String(zoneId);
    if (!this.shipperAssignments.has(sid)) {
      this.shipperAssignments.set(sid, new Set());
    }
    this.shipperAssignments.get(sid)!.add(zid);
  }

  async removeShipperFromZone(shipperId: string | number, zoneId: string | number): Promise<void> {
    const sid = String(shipperId);
    const zid = String(zoneId);
    this.shipperAssignments.get(sid)?.delete(zid);
  }

  async findByShipperId(shipperId: string | number): Promise<DeliveryZone[]> {
    const sid = String(shipperId);
    const zoneIds = this.shipperAssignments.get(sid) ?? new Set();
    const result: DeliveryZone[] = [];
    for (const zid of zoneIds) {
      const z = this.zones.get(zid);
      if (z) result.push(z);
    }
    return result;
  }
}

export class InMemoryCODSettlementRepository implements ICODSettlementRepository {
  public settlements: Map<string, CODSettlement> = new Map();
  private autoId = 1;

  async findById(id: string | number): Promise<CODSettlement | null> {
    return this.settlements.get(String(id)) ?? null;
  }

  async findByCode(settlementCode: string): Promise<CODSettlement | null> {
    for (const s of this.settlements.values()) {
      if (s.getSettlementCode() === settlementCode.trim().toUpperCase()) return s;
    }
    return null;
  }

  async findByShipper(shipperId: string | number, status?: CODSettlementStatus): Promise<CODSettlement[]> {
    return Array.from(this.settlements.values()).filter((s) => {
      if (String(s.getShipperId()) !== String(shipperId)) return false;
      if (status && s.getStatus() !== status) return false;
      return true;
    });
  }

  async findByHub(hubId: string | number, status?: CODSettlementStatus): Promise<CODSettlement[]> {
    return Array.from(this.settlements.values()).filter((s) => {
      if (String(s.getHubId()) !== String(hubId)) return false;
      if (status && s.getStatus() !== status) return false;
      return true;
    });
  }

  async save(settlement: CODSettlement): Promise<CODSettlement> {
    let id = settlement.getId();
    if (!id) {
      id = String(this.autoId++);
      const sWithId = new CODSettlement({
        id,
        settlementCode: settlement.getSettlementCode(),
        hubId: settlement.getHubId(),
        shipperId: settlement.getShipperId(),
        managerId: settlement.getManagerId(),
        totalCodAmount: settlement.getTotalCodAmount(),
        totalOrdersCount: settlement.getTotalOrdersCount(),
        status: settlement.getStatus(),
        notes: settlement.getNotes(),
        settledAt: settlement.getSettledAt(),
        createdAt: settlement.getCreatedAt(),
        details: Array.from(settlement.getDetails()),
      });
      this.settlements.set(String(id), sWithId);
      return sWithId;
    }
    this.settlements.set(String(id), settlement);
    return settlement;
  }

  async hasOrdersInActiveSettlement(orderIds: (string | number)[]): Promise<string[]> {
    const stringOrderIds = new Set(orderIds.map(String));
    const matched: string[] = [];

    for (const s of this.settlements.values()) {
      if (s.getStatus() === 'REJECTED') continue;
      for (const d of s.getDetails()) {
        const oid = String(d.getOrderId());
        if (stringOrderIds.has(oid)) {
          matched.push(oid);
        }
      }
    }

    return matched;
  }
}

export class MockPasswordHasherService implements IPasswordHasherService {
  async hash(plainPassword: string): Promise<string> {
    return `hashed_${plainPassword}`;
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed_${plainPassword}` || passwordHash === plainPassword;
  }
}

export class MockAuthTokenService implements IAuthTokenService {
  private revoked = new Set<string>();
  public failedAttempts = new Map<string, { count: number; lockedUntil: Date | null }>();

  generateToken(payload: AuthTokenPayload, _expiresIn?: string): string {
    return `mock_token_for_${payload.userId}_${payload.role}`;
  }

  verifyToken(token: string): AuthTokenPayload | null {
    if (this.revoked.has(token)) return null;
    return {
      userId: 'user-01',
      username: 'mock_user',
      role: USER_ROLE.ADMIN,
      hubId: null,
      jti: 'mock-jti-01',
    };
  }

  async revokeToken(token: string): Promise<void> {
    this.revoked.add(token);
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    return this.revoked.has(token);
  }

  async recordFailedLogin(identifier: string): Promise<LoginLockoutStatus> {
    const key = identifier.trim().toLowerCase();
    const existing = this.failedAttempts.get(key);
    const count = (existing?.count ?? 0) + 1;
    if (count >= 5) {
      this.failedAttempts.set(key, { count, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) });
      return { isLocked: true, remainingMinutes: 15 };
    }
    this.failedAttempts.set(key, { count, lockedUntil: null });
    return { isLocked: false };
  }

  async resetLoginAttempts(identifier: string): Promise<void> {
    this.failedAttempts.delete(identifier.trim().toLowerCase());
  }

  async checkLoginLockout(identifier: string): Promise<LoginLockoutStatus> {
    const key = identifier.trim().toLowerCase();
    const existing = this.failedAttempts.get(key);
    if (existing?.lockedUntil && existing.lockedUntil > new Date()) {
      return { isLocked: true, remainingMinutes: 15 };
    }
    return { isLocked: false };
  }
}
