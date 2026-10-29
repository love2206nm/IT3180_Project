/**
 * @file domain_layer.test.ts
 * @description Unit tests for Domain Layer using Node.js built-in test runner via tsx.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Import Domain Layer components
import {
  ORDER_STATUS,
  USER_ROLE,
  USER_STATUS,
  HUB_STATUS,
  PAYMENT_BY,
  PAYMENT_STATUS,
  COD_SETTLEMENT_STATUS,
  DELIVERY_CONSTRAINTS,
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
  CODSettlement,
  InvalidStatusTransitionException,
  ExceededMaxDeliveryAttemptsException,
  InvalidMoneyAmountException,
  InvalidPhoneNumberException,
  InvalidTrackingCodeException,
  CODSettlementAlreadyProcessedException,
} from '../../src/domain';

describe('Domain Layer: Value Objects Test Suite', () => {
  test('TrackingCode: validates format and generates correctly', () => {
    const code = new TrackingCode('TRK-20261029-ABCD');
    assert.equal(code.getValue(), 'TRK-20261029-ABCD');
    assert.equal(code.equals(new TrackingCode('trk-20261029-abcd')), true);

    assert.throws(() => new TrackingCode('SHORT'), InvalidTrackingCodeException);

    const autoCode = TrackingCode.generate();
    assert.equal(TrackingCode.isValid(autoCode.getValue()), true);
  });

  test('PhoneNumber: validates VN phone numbers and masks correctly for UC23', () => {
    const phone = new PhoneNumber('+84 912 345 678');
    assert.equal(phone.getValue(), '0912345678');
    assert.equal(phone.toMaskedString(), '0912***678');

    assert.throws(() => new PhoneNumber('123456'), InvalidPhoneNumberException);
    assert.throws(() => new PhoneNumber('0123456789'), InvalidPhoneNumberException);
  });

  test('Money: arithmetic, non-negative validation, and formatting', () => {
    const m1 = new Money(50000);
    const m2 = new Money(20000);

    assert.equal(m1.add(m2).getAmount(), 70000);
    assert.equal(m1.subtract(m2).getAmount(), 30000);
    assert.equal(m1.formatVND().includes('50.000'), true);

    assert.throws(() => m2.subtract(m1), InvalidMoneyAmountException);
    assert.throws(() => new Money(-500), InvalidMoneyAmountException);
  });

  test('Address: builds full address correctly', () => {
    const addr = new Address({
      street: 'Số 1 Đại Cồ Việt',
      ward: 'Bách Khoa',
      district: 'Hai Bà Trưng',
      province: 'Hà Nội',
    });
    assert.equal(addr.getFullAddress(), 'Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội');
  });

  test('PackageDimensions: volumetric weight calculation', () => {
    const dim = new PackageDimensions({
      lengthCm: 20,
      widthCm: 15,
      heightCm: 10,
      weightGram: 500,
    });
    // Volumetric weight: (20 * 15 * 10) / 5 = 600g
    assert.equal(dim.calculateVolumetricWeightGram(), 600);
    // Billable weight = max(500, 600) = 600g
    assert.equal(dim.getBillableWeightGram(), 600);
  });

  test('Coordinates: distance calculation via Haversine', () => {
    // Hanoi: 21.0285, 105.8542
    const hanoi = new Coordinates(21.0285, 105.8542);
    // Haiphong: 20.8449, 106.6881
    const haiphong = new Coordinates(20.8449, 106.6881);
    const distanceKm = hanoi.distanceTo(haiphong);
    assert.equal(distanceKm > 80 && distanceKm < 110, true);
  });
});

describe('Domain Layer: Order State Machine & Business Invariants', () => {
  function createTestOrder(overrides = {}) {
    return new Order({
      trackingCode: new TrackingCode('TRK-20261029-TEST01'),
      senderName: 'Nguyễn Văn Gửi',
      senderPhone: new PhoneNumber('0987654321'),
      senderAddress: '123 Cầu Giấy, Hà Nội',
      receiverName: 'Trần Thị Nhận',
      receiverPhone: new PhoneNumber('0912345678'),
      receiverAddress: new Address({
        street: '456 Giải Phóng',
        district: 'Hai Bà Trưng',
        province: 'Hà Nội',
      }),
      dimensions: new PackageDimensions({ weightGram: 1000 }),
      codAmount: new Money(150000),
      shippingFee: new Money(30000),
      paymentBy: PAYMENT_BY.RECEIVER,
      ...overrides,
    });
  }

  test('Order lifecycle: CREATED -> AT_HUB -> OUT_FOR_DELIVERY -> DELIVERED', () => {
    const order = createTestOrder();
    assert.equal(order.getCurrentStatus(), ORDER_STATUS.CREATED);
    assert.equal(order.requiresCOD(), true);

    // 1. Inbound scan at Hub (UC15)
    order.markArrivedAtHub(101);
    assert.equal(order.getCurrentStatus(), ORDER_STATUS.AT_HUB);
    assert.equal(order.getCurrentHubId(), 101);

    // 2. Dispatch to Shipper (UC16)
    order.assignToShipper(202);
    assert.equal(order.getCurrentStatus(), ORDER_STATUS.OUT_FOR_DELIVERY);
    assert.equal(order.getAssignedShipperId(), 202);

    // 3. Delivered with COD check (UC18)
    order.markDelivered(new Money(150000));
    assert.equal(order.getCurrentStatus(), ORDER_STATUS.DELIVERED);
    assert.equal(order.getPaymentStatus(), PAYMENT_STATUS.PAID);
    assert.equal(order.isFinalState(), true);
  });

  test('Order: blocks invalid status transition', () => {
    const order = createTestOrder();
    // Cannot jump directly from CREATED to DELIVERED
    assert.throws(
      () => order.markDelivered(new Money(150000)),
      InvalidStatusTransitionException
    );
  });

  test('Order: 3 failed delivery attempts triggers RETURN_PENDING', () => {
    const order = createTestOrder();
    order.markArrivedAtHub(101);

    // Attempt 1 (UC19)
    order.assignToShipper(202);
    order.recordFailedAttempt('Khách không nghe máy');
    assert.equal(order.getCurrentStatus(), ORDER_STATUS.FAILED_ATTEMPT);
    assert.equal(order.getDeliveryAttempts(), 1);

    // Attempt 2 (UC19)
    order.markArrivedAtHub(101);
    order.assignToShipper(202);
    order.recordFailedAttempt('Khách hẹn ngày mai');
    assert.equal(order.getCurrentStatus(), ORDER_STATUS.FAILED_ATTEMPT);
    assert.equal(order.getDeliveryAttempts(), 2);

    // Attempt 3 (UC19 -> auto RETURN_PENDING)
    order.markArrivedAtHub(101);
    order.assignToShipper(202);
    order.recordFailedAttempt('Khách không nhận');
    assert.equal(order.getCurrentStatus(), ORDER_STATUS.RETURN_PENDING);
    assert.equal(order.getDeliveryAttempts(), 3);

    // Attempt 4 should be rejected
    assert.throws(
      () => order.assignToShipper(202),
      ExceededMaxDeliveryAttemptsException
    );
  });
});

describe('Domain Layer: User, Hub & COD Settlement Entities', () => {
  test('User: role checking, login recording, and deactivation', () => {
    const user = new User({
      hubId: 101,
      username: 'shipper01',
      passwordHash: 'hashed_password',
      fullName: 'Phạm Văn Shipper',
      email: 'shipper01@delivery.vn',
      phone: new PhoneNumber('0911223344'),
      role: USER_ROLE.SHIPPER,
    });

    assert.equal(user.isShipper(), true);
    assert.equal(user.isActive(), true);

    user.recordLogin();
    assert.notEqual(user.getLastLoginAt(), null);

    user.deactivate();
    assert.equal(user.isActive(), false);
  });

  test('CODSettlement: confirm and reject flow', () => {
    const settlement = new CODSettlement({
      settlementCode: 'COD-20261029-01',
      hubId: 101,
      shipperId: 202,
      totalCodAmount: new Money(500000),
      totalOrdersCount: 3,
    });

    assert.equal(settlement.isPending(), true);

    settlement.confirm(303);
    assert.equal(settlement.isConfirmed(), true);
    assert.notEqual(settlement.getSettledAt(), null);

    // Once confirmed, cannot reject
    assert.throws(
      () => settlement.reject(303, 'Sai lệch'),
      CODSettlementAlreadyProcessedException
    );
  });
});
