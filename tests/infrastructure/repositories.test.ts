/**
 * @file repositories.test.ts
 * @description Integration Tests kiểm tra hoạt động thực tế của 6 Prisma Repositories
 * kết nối trực tiếp với PostgreSQL đã được nạp dữ liệu mẫu (Seeded Database).
 * Tự động graceful skip nếu không có database thật ở môi trường local.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_STATUS,
  USER_ROLE,
  USER_STATUS,
  HUB_STATUS,
  PAYMENT_BY,
  PAYMENT_STATUS,
  COD_SETTLEMENT_STATUS,
  TrackingCode,
  PhoneNumber,
  Money,
  Address,
  PackageDimensions,
  Order,
  OrderStatusLog,
  CODSettlement,
} from '../../src/domain';
import {
  PrismaOrderRepository,
  PrismaUserRepository,
  PrismaHubRepository,
  PrismaDeliveryZoneRepository,
  PrismaOrderStatusLogRepository,
  PrismaCODSettlementRepository,
} from '../../src/infrastructure/database/repositories';
import { prisma, disconnectPrisma } from '../../src/infrastructure/database/prisma/client';

describe('Infrastructure Layer: Prisma Repositories Integration Test Suite', () => {
  const orderRepo = new PrismaOrderRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const hubRepo = new PrismaHubRepository(prisma);
  const zoneRepo = new PrismaDeliveryZoneRepository(prisma);
  const logRepo = new PrismaOrderStatusLogRepository(prisma);
  const codRepo = new PrismaCODSettlementRepository(prisma);

  let isDbAvailable = false;
  let hubHanoiId: string | number;
  let shipper01Id: string | number;
  let managerId: string | number;

  before(async () => {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
    } catch {
      console.warn('\n⚠️ [TEST RUNNER] PostgreSQL không khả dụng tại localhost:5432. Bỏ qua Live DB Integration Tests.\n');
      isDbAvailable = false;
      return;
    }

    // Lấy thông tin trạm và nhân sự mẫu đã seed
    const hub = await hubRepo.findByCode('HUB-HAN-01');
    assert.notEqual(hub, null, 'Hub Hanoi must exist in seeded DB');
    hubHanoiId = hub!.getId()!;

    const shipper = await userRepo.findByUsername('shipper01');
    assert.notEqual(shipper, null, 'Shipper01 must exist in seeded DB');
    shipper01Id = shipper!.getId()!;

    const manager = await userRepo.findByUsername('manager.cg');
    assert.notEqual(manager, null, 'Manager must exist in seeded DB');
    managerId = manager!.getId()!;
  });

  after(async () => {
    if (isDbAvailable) {
      await disconnectPrisma();
    }
  });

  describe('PrismaHubRepository', () => {
    test('findByCode & findById: returns rich Hub domain entity', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const hub = await hubRepo.findByCode('HUB-HAN-01');
      assert.notEqual(hub, null);
      assert.equal(hub!.getName(), 'Trạm Giao Nhận Cầu Giấy - Hà Nội');
      assert.equal(hub!.getProvince(), 'Hà Nội');
      assert.equal(hub!.isActive(), true);

      const hubById = await hubRepo.findById(hub!.getId()!);
      assert.notEqual(hubById, null);
      assert.equal(hubById!.getCode(), 'HUB-HAN-01');
    });

    test('findAll: filters by status correctly', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const activeHubs = await hubRepo.findAll(HUB_STATUS.ACTIVE);
      assert.equal(activeHubs.length >= 2, true);
    });
  });

  describe('PrismaUserRepository', () => {
    test('findByUsername & findByEmail: authenticates user properly', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const admin = await userRepo.findByUsername('admin');
      assert.notEqual(admin, null);
      assert.ok(admin!.getEmail().includes('@'));
      assert.equal(admin!.isAdmin(), true);

      const adminByEmail = await userRepo.findByEmail(admin!.getEmail());
      assert.notEqual(adminByEmail, null);
      assert.equal(adminByEmail!.getUsername(), 'admin');

      const userByEmail = await userRepo.findByEmail('manager.cg@delivery.vn');
      assert.notEqual(userByEmail, null);
      assert.equal(userByEmail!.isHubManager(), true);
    });

    test('findActiveShippersByHub: retrieves available shippers at hub (UC16)', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const shippers = await userRepo.findActiveShippersByHub(hubHanoiId);
      assert.equal(shippers.length >= 2, true);
      assert.equal(shippers.some((s) => s.getUsername() === 'shipper01'), true);
    });

    test('search: supports pagination and multi-field keyword filtering (UC04)', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const result = await userRepo.search({
        hubId: hubHanoiId,
        role: USER_ROLE.SHIPPER,
        page: 1,
        limit: 10,
      });

      assert.equal(result.total >= 2, true);
      assert.equal(result.users.every((u) => u.isShipper()), true);
    });
  });

  describe('PrismaDeliveryZoneRepository', () => {
    test('findByCode & findAssignedZonesByShipper: manages zones & shipper assignments (UC08)', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const zone = await zoneRepo.findByCode('ZONE-CG-01');
      assert.notEqual(zone, null);
      assert.equal(zone!.getDistrict(), 'Cầu Giấy');

      const assignedZones = await zoneRepo.findAssignedZonesByShipper(shipper01Id);
      assert.equal(assignedZones.length >= 1, true);
      assert.equal(assignedZones.some((z) => z.getCode() === 'ZONE-CG-01'), true);
    });
  });

  describe('PrismaOrderRepository', () => {
    test('findByTrackingCode: retrieves seed orders accurately (UC15, UC23)', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const orderCreated = await orderRepo.findByTrackingCode('TRK-20261029-0001');
      assert.notEqual(orderCreated, null);
      assert.equal(orderCreated!.getCurrentStatus(), ORDER_STATUS.CREATED);
      assert.equal(orderCreated!.getSenderName(), 'Cửa hàng Quần áo Zara HN');

      const orderAtHub = await orderRepo.findByTrackingCode('TRK-20261029-0002');
      assert.notEqual(orderAtHub, null);
      assert.equal(orderAtHub!.getCurrentStatus(), ORDER_STATUS.AT_HUB);
    });

    test('findByHubAndStatus: filters hub inventory (UC10, UC16)', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const hubOrders = await orderRepo.findByHubAndStatus(hubHanoiId, ORDER_STATUS.AT_HUB);
      assert.equal(hubOrders.length >= 1, true);
      assert.equal(hubOrders.every((o) => o.getCurrentStatus() === ORDER_STATUS.AT_HUB), true);
    });

    test('countByStatus: generates KPI dashboard metrics correctly (UC21)', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const statusCounts = await orderRepo.countByStatus(hubHanoiId);
      assert.equal(typeof statusCounts[ORDER_STATUS.AT_HUB], 'number');
      assert.equal(typeof statusCounts[ORDER_STATUS.DELIVERED], 'number');
      assert.equal(statusCounts[ORDER_STATUS.AT_HUB] >= 1, true);
    });

    test('search: paginates and filters by receiver phone and status (UC10)', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const result = await orderRepo.search({
        receiverPhone: '0912345678',
        page: 1,
        limit: 5,
      });

      assert.equal(result.total >= 1, true);
      assert.equal(result.orders[0].getReceiverPhone().getValue(), '0912345678');
    });

    test('saveWithAuditLog: ACID transaction creates order and audit log atomically', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const uniqueCode = `TRK-TEST-${Date.now().toString().slice(-6)}`;
      const newOrder = new Order({
        trackingCode: new TrackingCode(uniqueCode),
        currentHubId: hubHanoiId,
        senderName: 'Test Sender',
        senderPhone: new PhoneNumber('0988000111'),
        senderAddress: 'Số 10 Tràng Tiền',
        receiverName: 'Test Receiver',
        receiverPhone: new PhoneNumber('0911222333'),
        receiverAddress: new Address({
          street: 'Số 99 Cầu Giấy',
          district: 'Cầu Giấy',
          province: 'Hà Nội',
        }),
        dimensions: new PackageDimensions({ weightGram: 500 }),
        codAmount: new Money(150000),
        shippingFee: new Money(20000),
        paymentBy: PAYMENT_BY.RECEIVER,
        currentStatus: ORDER_STATUS.CREATED,
      });

      const firstLog = new OrderStatusLog({
        orderId: 0,
        hubId: hubHanoiId,
        actorId: managerId,
        newStatus: ORDER_STATUS.CREATED,
        note: 'Đơn hàng tạo mới trong unit test',
      });

      const saved = await orderRepo.saveWithAuditLog(newOrder, firstLog);
      assert.notEqual(saved.getId(), null);
      assert.equal(saved.getTrackingCode().getValue(), uniqueCode);

      const logs = await logRepo.findByOrderId(saved.getId()!);
      assert.equal(logs.length, 1);
      assert.equal(logs[0].getNewStatus(), ORDER_STATUS.CREATED);
      assert.equal(logs[0].getNote(), 'Đơn hàng tạo mới trong unit test');
    });

    test('assignOrdersBatch: assigns multiple orders to shipper atomically (UC16)', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const batchTrackingCode = `TRK-BATCH-${Date.now().toString().slice(-6)}`;
      const orderToBatch = new Order({
        trackingCode: new TrackingCode(batchTrackingCode),
        currentHubId: hubHanoiId,
        senderName: 'Batch Sender',
        senderPhone: new PhoneNumber('0988333444'),
        senderAddress: 'Số 1 Mai Dịch',
        receiverName: 'Batch Receiver',
        receiverPhone: new PhoneNumber('0977888999'),
        receiverAddress: new Address({
          street: 'Số 2 Mai Dịch',
          district: 'Cầu Giấy',
          province: 'Hà Nội',
        }),
        dimensions: new PackageDimensions({ weightGram: 400 }),
        codAmount: new Money(100000),
        shippingFee: new Money(15000),
        paymentBy: PAYMENT_BY.RECEIVER,
        currentStatus: ORDER_STATUS.AT_HUB,
      });

      const savedOrder = await orderRepo.save(orderToBatch);
      const orderIdToAssign = savedOrder.getId()!;

      const assignedCount = await orderRepo.assignOrdersBatch(
        [orderIdToAssign],
        shipper01Id,
        managerId,
        'Gán đơn trong test UC16'
      );

      assert.equal(assignedCount, 1);

      const assignedOrder = await orderRepo.findById(orderIdToAssign);
      assert.notEqual(assignedOrder, null);
      assert.equal(assignedOrder!.getCurrentStatus(), ORDER_STATUS.OUT_FOR_DELIVERY);
      assert.equal(assignedOrder!.getAssignedShipperId(), shipper01Id);

      const logs = await logRepo.findByOrderId(orderIdToAssign);
      assert.equal(logs.length >= 1, true);
      assert.equal(logs[0].getNewStatus(), ORDER_STATUS.OUT_FOR_DELIVERY);
    });
  });

  describe('PrismaCODSettlementRepository', () => {
    test('save & findByCode: creates and retrieves settlement with detail lines (UC22)', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const code = `COD-TEST-${Date.now().toString().slice(-6)}`;
      const settlement = new CODSettlement({
        settlementCode: code,
        hubId: hubHanoiId,
        shipperId: shipper01Id,
        totalCodAmount: new Money(250000),
        totalOrdersCount: 1,
        status: COD_SETTLEMENT_STATUS.PENDING,
        notes: 'Phiên nộp COD thử nghiệm',
      });

      const saved = await codRepo.save(settlement);
      assert.notEqual(saved.getId(), null);
      assert.equal(saved.getSettlementCode(), code);
      assert.equal(saved.isPending(), true);

      const retrieved = await codRepo.findByCode(code);
      assert.notEqual(retrieved, null);
      assert.equal(retrieved!.getTotalCodAmount().getAmount(), 250000);
    });

    test('hasOrdersInActiveSettlement: detects orders already in pending/confirmed settlements', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      // Tạo 1 order test và đưa vào 1 settlement
      const orderTest = new Order({
        trackingCode: new TrackingCode(`TRK-COD-${Date.now().toString().slice(-6)}`),
        currentHubId: hubHanoiId,
        senderName: 'COD Sender',
        senderPhone: new PhoneNumber('0988111222'),
        senderAddress: 'Số 1 Mai Dịch',
        receiverName: 'COD Receiver',
        receiverPhone: new PhoneNumber('0977222333'),
        receiverAddress: new Address({ street: 'Số 2 Mai Dịch', district: 'Cầu Giấy', province: 'Hà Nội' }),
        dimensions: new PackageDimensions({ weightGram: 500 }),
        codAmount: new Money(300000),
        shippingFee: new Money(20000),
        paymentBy: PAYMENT_BY.RECEIVER,
        currentStatus: ORDER_STATUS.DELIVERED,
      });

      const savedOrder = await orderRepo.save(orderTest);
      const testOrderId = savedOrder.getId()!;

      const code = `COD-CHK-${Date.now().toString().slice(-6)}`;
      const settlement = new CODSettlement({
        settlementCode: code,
        hubId: hubHanoiId,
        shipperId: shipper01Id,
        totalCodAmount: new Money(300000),
        totalOrdersCount: 1,
        status: COD_SETTLEMENT_STATUS.PENDING,
        details: [
          new (await import('../../src/domain')).CODSettlementDetail({
            orderId: testOrderId,
            codCollected: new Money(300000),
          }),
        ],
      });

      await codRepo.save(settlement);

      // Kiểm tra hasOrdersInActiveSettlement
      const lockedIds = await codRepo.hasOrdersInActiveSettlement([testOrderId, 999999]);
      assert.equal(lockedIds.includes(String(testOrderId)), true);
      assert.equal(lockedIds.includes('999999'), false);
    });
  });

  describe('Batch Loading & Aggregation Performance Repositories', () => {
    test('findByIds: batch loads hubs and users in a single query', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const hubs = await hubRepo.findByIds([hubHanoiId]);
      assert.equal(hubs.length >= 1, true);

      const users = await userRepo.findByIds([managerId, shipper01Id]);
      assert.equal(users.length >= 2, true);
    });

    test('getShipperPerformanceStats: aggregates shipper performance in 1 groupBy query', async (t) => {
      if (!isDbAvailable) { t.skip('PostgreSQL not available'); return; }

      const stats = await orderRepo.getShipperPerformanceStats(hubHanoiId);
      assert.equal(Array.isArray(stats), true);
    });
  });
});
