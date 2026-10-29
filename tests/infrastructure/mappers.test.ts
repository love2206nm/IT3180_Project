/**
 * @file mappers.test.ts
 * @description Unit tests kiểm tra tính toàn vẹn 2 chiều của toàn bộ Data Mappers tầng Infrastructure.
 */

import { test, describe } from 'node:test';
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
  Coordinates,
  Order,
  User,
  Hub,
  DeliveryZone,
  OrderStatusLog,
  CODSettlement,
  CODSettlementDetail,
} from '../../src/domain';
import {
  toBigInt,
  fromBigInt,
  fromDecimal,
  OrderMapper,
  UserMapper,
  HubMapper,
  DeliveryZoneMapper,
  OrderStatusLogMapper,
  CODSettlementMapper,
} from '../../src/infrastructure/database/mappers';

describe('Infrastructure Layer: Data Mappers & Type Helpers Test Suite', () => {
  describe('Mapper Helpers: toBigInt, fromBigInt, fromDecimal', () => {
    test('toBigInt: converts numbers and strings to bigint safely', () => {
      assert.equal(toBigInt(123), 123n);
      assert.equal(toBigInt('987654321098765432'), 987654321098765432n);
      assert.equal(toBigInt(null), null);
      assert.equal(toBigInt(undefined), null);
      assert.equal(toBigInt(''), null);
    });

    test('fromBigInt: converts bigint to string safely without overflow', () => {
      assert.equal(fromBigInt(123n), '123');
      assert.equal(fromBigInt(987654321098765432n), '987654321098765432');
      assert.equal(fromBigInt(null), null);
      assert.equal(fromBigInt(undefined), null);
    });

    test('fromDecimal: handles numbers, string decimals, and decimal-like objects', () => {
      assert.equal(fromDecimal(150000), 150000);
      assert.equal(fromDecimal('25.5'), 25.5);
      assert.equal(fromDecimal(null), 0);
      assert.equal(fromDecimal(undefined), 0);

      // Decimal-like object (tương tự Prisma.Decimal)
      const mockPrismaDecimal = { toNumber: () => 350000.75 };
      assert.equal(fromDecimal(mockPrismaDecimal), 350000.75);
    });
  });

  describe('OrderMapper', () => {
    test('toDomain: correctly reconstructs rich Order entity with Value Objects', () => {
      const rawOrder = {
        id: 101n,
        trackingCode: 'TRK-20261029-0001',
        currentHubId: 1n,
        assignedShipperId: 5n,
        senderName: 'Shop Quần Áo',
        senderPhone: '0988111222',
        senderAddress: '10 Tràng Tiền, Hoàn Kiếm, Hà Nội',
        receiverName: 'Nguyễn Văn A',
        receiverPhone: '0912345678',
        receiverAddress: 'Số 15 Phố Duy Tân',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        receiverWard: 'Dịch Vọng Hậu',
        weightGram: { toNumber: () => 500 } as any,
        lengthCm: { toNumber: () => 20 } as any,
        widthCm: { toNumber: () => 15 } as any,
        heightCm: { toNumber: () => 10 } as any,
        codAmount: { toNumber: () => 200000 } as any,
        shippingFee: { toNumber: () => 30000 } as any,
        paymentBy: PAYMENT_BY.RECEIVER,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        currentStatus: ORDER_STATUS.AT_HUB,
        deliveryAttempts: 1,
        maxAttempts: 3,
        notes: 'Cho kiểm tra hàng',
        createdAt: new Date('2026-10-29T08:00:00Z'),
        updatedAt: new Date('2026-10-29T09:00:00Z'),
      };

      const domainOrder = OrderMapper.toDomain(rawOrder as any);

      assert.equal(domainOrder.getId(), '101');
      assert.equal(domainOrder.getTrackingCode().getValue(), 'TRK-20261029-0001');
      assert.equal(domainOrder.getCurrentHubId(), '1');
      assert.equal(domainOrder.getAssignedShipperId(), '5');
      assert.equal(domainOrder.getSenderPhone().getValue(), '0988111222');
      assert.equal(domainOrder.getReceiverPhone().getValue(), '0912345678');
      assert.equal(domainOrder.getReceiverAddress().getDistrict(), 'Cầu Giấy');
      assert.equal(domainOrder.getDimensions().getWeightGram(), 500);
      assert.equal(domainOrder.getCodAmount().getAmount(), 200000);
      assert.equal(domainOrder.getShippingFee().getAmount(), 30000);
      assert.equal(domainOrder.getCurrentStatus(), ORDER_STATUS.AT_HUB);
      assert.equal(domainOrder.getDeliveryAttempts(), 1);
    });

    test('toPersistenceCreate: converts Domain Order to Prisma Create Input', () => {
      const order = new Order({
        id: '202',
        trackingCode: new TrackingCode('TRK-20261029-9999'),
        senderName: 'Cửa hàng A',
        senderPhone: new PhoneNumber('0987654321'),
        senderAddress: 'Hà Nội',
        receiverName: 'Người nhận B',
        receiverPhone: new PhoneNumber('0912345678'),
        receiverAddress: new Address({
          street: 'Số 1 Đại Cồ Việt',
          district: 'Hai Bà Trưng',
          province: 'Hà Nội',
        }),
        dimensions: new PackageDimensions({ weightGram: 450 }),
        codAmount: new Money(100000),
        shippingFee: new Money(25000),
        paymentBy: PAYMENT_BY.RECEIVER,
      });

      const persistence = OrderMapper.toPersistenceCreate(order);

      assert.equal(persistence.id, 202n);
      assert.equal(persistence.trackingCode, 'TRK-20261029-9999');
      assert.equal(persistence.senderPhone, '0987654321');
      assert.equal(persistence.receiverPhone, '0912345678');
      assert.equal(persistence.receiverDistrict, 'Hai Bà Trưng');
      assert.equal(persistence.weightGram, 450);
      assert.equal(persistence.codAmount, 100000);
      assert.equal(persistence.shippingFee, 25000);
    });
  });

  describe('UserMapper', () => {
    test('toDomain & toPersistenceCreate: converts User entity two-way', () => {
      const rawUser = {
        id: 7n,
        hubId: 1n,
        username: 'shipper_nam',
        passwordHash: '$2a$10$hashed_password_here',
        fullName: 'Nguyễn Hải Nam',
        email: 'nam.shipper@delivery.vn',
        phone: '0901234567',
        role: USER_ROLE.SHIPPER,
        status: USER_STATUS.ACTIVE,
        lastLoginAt: new Date('2026-10-29T10:00:00Z'),
        createdAt: new Date('2026-10-20T00:00:00Z'),
        updatedAt: new Date('2026-10-29T10:00:00Z'),
      };

      const domainUser = UserMapper.toDomain(rawUser as any);
      assert.equal(domainUser.getId(), '7');
      assert.equal(domainUser.getUsername(), 'shipper_nam');
      assert.equal(domainUser.getPhone().getValue(), '0901234567');
      assert.equal(domainUser.isShipper(), true);

      const persistence = UserMapper.toPersistenceCreate(domainUser);
      assert.equal(persistence.id, 7n);
      assert.equal(persistence.username, 'shipper_nam');
      assert.equal(persistence.phone, '0901234567');
      assert.equal(persistence.role, USER_ROLE.SHIPPER);
    });
  });

  describe('HubMapper', () => {
    test('toDomain & toPersistenceCreate: converts Hub entity two-way', () => {
      const rawHub = {
        id: 1n,
        code: 'HUB-HAN-01',
        name: 'Trạm Cầu Giấy',
        address: '144 Xuân Thủy',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng Hậu',
        phone: '02437689999',
        status: HUB_STATUS.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const domainHub = HubMapper.toDomain(rawHub as any);
      assert.equal(domainHub.getId(), '1');
      assert.equal(domainHub.getCode(), 'HUB-HAN-01');
      assert.equal(domainHub.isActive(), true);

      const persistence = HubMapper.toPersistenceCreate(domainHub);
      assert.equal(persistence.id, 1n);
      assert.equal(persistence.code, 'HUB-HAN-01');
    });
  });

  describe('DeliveryZoneMapper', () => {
    test('toDomain & toPersistenceCreate: converts DeliveryZone entity two-way', () => {
      const rawZone = {
        id: 10n,
        hubId: 1n,
        code: 'ZONE-CG-01',
        name: 'Tuyến Dịch Vọng Hậu',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng Hậu',
        description: 'Tuyến phụ trách các trục đường Duy Tân, Trần Thái Tông',
      };

      const domainZone = DeliveryZoneMapper.toDomain(rawZone as any);
      assert.equal(domainZone.getId(), '10');
      assert.equal(domainZone.getHubId(), '1');
      assert.equal(domainZone.matchesAddress('Cầu Giấy', 'Dịch Vọng Hậu'), true);
      assert.equal(domainZone.matchesAddress('Cầu Giấy', 'Mai Dịch'), false);

      const persistence = DeliveryZoneMapper.toPersistenceCreate(domainZone);
      assert.equal(persistence.id, 10n);
      assert.equal(persistence.code, 'ZONE-CG-01');
    });
  });

  describe('OrderStatusLogMapper', () => {
    test('toDomain & toPersistenceCreate: converts OrderStatusLog entity with Coordinates', () => {
      const rawLog = {
        id: 501n,
        orderId: 101n,
        hubId: 1n,
        actorId: 5n,
        previousStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
        newStatus: ORDER_STATUS.DELIVERED,
        failureReason: null,
        proofImageUrl: 'https://storage.delivery.vn/pod/img_001.jpg',
        locationLat: { toNumber: () => 21.0368 } as any,
        locationLng: { toNumber: () => 105.7828 } as any,
        note: 'Đã nhận đủ tiền COD',
        createdAt: new Date(),
      };

      const domainLog = OrderStatusLogMapper.toDomain(rawLog as any);
      assert.equal(domainLog.getId(), '501');
      assert.equal(domainLog.getOrderId(), '101');
      assert.equal(domainLog.getNewStatus(), ORDER_STATUS.DELIVERED);
      assert.notEqual(domainLog.getLocation(), null);
      assert.equal(domainLog.getLocation()!.getLatitude(), 21.0368);

      const persistence = OrderStatusLogMapper.toPersistenceCreate(domainLog);
      assert.equal(persistence.id, 501n);
      assert.equal(persistence.orderId, 101n);
      assert.equal(persistence.locationLat, 21.0368);
      assert.equal(persistence.proofImageUrl, 'https://storage.delivery.vn/pod/img_001.jpg');
    });
  });

  describe('CODSettlementMapper', () => {
    test('toDomain & toPersistenceCreate: converts CODSettlement with details', () => {
      const rawSettlement = {
        id: 99n,
        settlementCode: 'COD-20261029-01',
        hubId: 1n,
        shipperId: 5n,
        managerId: 2n,
        totalCodAmount: { toNumber: () => 500000 } as any,
        totalOrdersCount: 2,
        status: COD_SETTLEMENT_STATUS.PENDING,
        notes: 'Nộp tiền ca chiều',
        settledAt: null,
        createdAt: new Date(),
        details: [
          {
            id: 1n,
            settlementId: 99n,
            orderId: 101n,
            codCollected: { toNumber: () => 200000 } as any,
          },
          {
            id: 2n,
            settlementId: 99n,
            orderId: 102n,
            codCollected: { toNumber: () => 300000 } as any,
          },
        ],
      };

      const domainSettlement = CODSettlementMapper.toDomain(rawSettlement as any);
      assert.equal(domainSettlement.getId(), '99');
      assert.equal(domainSettlement.getSettlementCode(), 'COD-20261029-01');
      assert.equal(domainSettlement.getTotalCodAmount().getAmount(), 500000);
      assert.equal(domainSettlement.getDetails().length, 2);

      const persistence = CODSettlementMapper.toPersistenceCreate(domainSettlement);
      assert.equal(persistence.id, 99n);
      assert.equal(persistence.totalCodAmount, 500000);

      const detailsPersistence = CODSettlementMapper.toPersistenceDetails(
        domainSettlement.getId()!,
        domainSettlement.getDetails()
      );
      assert.equal(detailsPersistence.length, 2);
      assert.equal(detailsPersistence[0].settlementId, 99n);
      assert.equal(detailsPersistence[0].orderId, 101n);
      assert.equal(detailsPersistence[0].codCollected, 200000);
    });
  });
});
