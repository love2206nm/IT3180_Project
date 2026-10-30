/**
 * @file shipment_use_cases.test.ts
 * @description Unit Tests cho các Use Cases Điều phối & Vòng đời Vận chuyển (UC15 - UC20).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CheckInHubUseCase,
  AssignOrdersToShipperUseCase,
  MarkDeliveredUseCase,
  MarkFailedAttemptUseCase,
  ProcessReturnOrderUseCase,
} from '../../src/application/use-cases/shipments';
import { CreateOrderUseCase } from '../../src/application/use-cases/orders';
import type { SecurityContext } from '../../src/application/interfaces/security-context.interface';
import {
  InMemoryOrderRepository,
  InMemoryUserRepository,
  InMemoryHubRepository,
} from './mocks/in-memory-repositories';
import { User } from '../../src/domain/entities/user.entity';
import { Hub } from '../../src/domain/entities/hub.entity';
import { PhoneNumber } from '../../src/domain/value-objects/phone-number.vo';
import { USER_ROLE } from '../../src/domain/constants/roles.constant';
import { USER_STATUS } from '../../src/domain/constants/user-status.constant';
import { HUB_STATUS } from '../../src/domain/constants/hub-status.constant';
import { ORDER_STATUS } from '../../src/domain/constants/order-status.constant';
import { PAYMENT_BY } from '../../src/domain/constants/payment.constant';
import { DELIVERY_FAILURE_REASON } from '../../src/domain/constants/failure-reasons.constant';

describe('Application Layer: Shipment & Dispatching Use Cases (UC15 - UC20)', () => {
  let orderRepo: InMemoryOrderRepository;
  let userRepo: InMemoryUserRepository;
  let hubRepo: InMemoryHubRepository;

  const mockAdminContext: SecurityContext = {
    userId: 'admin-01',
    username: 'admin',
    role: USER_ROLE.ADMIN,
    hubId: null,
  };

  const mockStaffContext: SecurityContext = {
    userId: 'staff-01',
    username: 'staff01',
    role: USER_ROLE.HUB_STAFF,
    hubId: 'hub-01',
  };

  const mockShipperContext: SecurityContext = {
    userId: 'ship-01',
    username: 'shipper01',
    role: USER_ROLE.SHIPPER,
    hubId: 'hub-01',
  };

  const mockOtherShipperContext: SecurityContext = {
    userId: 'ship-02',
    username: 'shipper02',
    role: USER_ROLE.SHIPPER,
    hubId: 'hub-01',
  };

  beforeEach(async () => {
    orderRepo = new InMemoryOrderRepository();
    userRepo = new InMemoryUserRepository();
    hubRepo = new InMemoryHubRepository();

    // Tạo Hub
    await hubRepo.save(
      new Hub({
        id: 'hub-01',
        code: 'HUB-HAN-01',
        name: 'Trạm Cầu Giấy',
        address: '10 Cầu Giấy',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng',
        phone: PhoneNumber.create('02412345678'),
        status: HUB_STATUS.ACTIVE,
      })
    );

    // Tạo Shipper 01
    await userRepo.save(
      new User({
        id: 'ship-01',
        username: 'shipper01',
        passwordHash: 'pass',
        fullName: 'Nguyễn Văn Shipper',
        email: 'shipper01@delivery.vn',
        phone: PhoneNumber.create('0912345678'),
        role: USER_ROLE.SHIPPER,
        status: USER_STATUS.ACTIVE,
        hubId: 'hub-01',
      })
    );

    // Tạo Shipper 02
    await userRepo.save(
      new User({
        id: 'ship-02',
        username: 'shipper02',
        passwordHash: 'pass',
        fullName: 'Trần Văn Shipper 2',
        email: 'shipper02@delivery.vn',
        phone: PhoneNumber.create('0912345679'),
        role: USER_ROLE.SHIPPER,
        status: USER_STATUS.ACTIVE,
        hubId: 'hub-01',
      })
    );
  });

  describe('UC15: CheckInHubUseCase', () => {
    it('checks in order to hub and updates status to AT_HUB', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      // Tạo đơn chưa có hub (CREATED) bởi Admin
      const created = await createOrder.execute(
        {
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'HN',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          codAmount: 0,
          paymentBy: PAYMENT_BY.SENDER,
        },
        mockAdminContext
      );

      assert.equal(created.success, true);
      if (!created.success) return;

      const useCase = new CheckInHubUseCase(orderRepo, hubRepo);
      const res = await useCase.execute(
        {
          trackingCode: created.data.trackingCode,
          hubId: 'hub-01',
        },
        mockStaffContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.status, ORDER_STATUS.AT_HUB);
        assert.equal(res.data.hubName, 'Trạm Cầu Giấy');
      }
    });

    it('[SEC-P12] blocks Shipper from check-in (RBAC)', async () => {
      const useCase = new CheckInHubUseCase(orderRepo, hubRepo);
      const res = await useCase.execute(
        {
          trackingCode: 'TRK-20261029-999999',
          hubId: 'hub-01',
        },
        mockShipperContext
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Nhân viên giao hàng không có quyền quét mã nhập kho/);
      }
    });
  });

  describe('UC16: AssignOrdersToShipperUseCase', () => {
    it('assigns order to active shipper at the same hub', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'HN',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          codAmount: 0,
          paymentBy: PAYMENT_BY.SENDER,
        },
        mockStaffContext
      );

      assert.equal(created.success, true);
      if (!created.success) return;

      const useCase = new AssignOrdersToShipperUseCase(orderRepo, userRepo);
      const res = await useCase.execute(
        {
          orderIds: [created.data.id],
          shipperId: 'ship-01',
          hubId: 'hub-01',
        },
        mockStaffContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.assignedCount, 1);
        const order = await orderRepo.findById(created.data.id);
        assert.equal(order?.getCurrentStatus(), ORDER_STATUS.OUT_FOR_DELIVERY);
        assert.equal(order?.getAssignedShipperId(), 'ship-01');
      }
    });
  });

  describe('UC17 & UC18: MarkDeliveredUseCase', () => {
    it('marks order delivered with correct COD collected and POD image', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'HN',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          codAmount: 200000,
          paymentBy: PAYMENT_BY.RECEIVER,
        },
        mockStaffContext
      );

      assert.equal(created.success, true);
      if (!created.success) return;

      // Gán cho shipper
      const assign = new AssignOrdersToShipperUseCase(orderRepo, userRepo);
      await assign.execute(
        {
          orderIds: [created.data.id],
          shipperId: 'ship-01',
          hubId: 'hub-01',
        },
        mockStaffContext
      );

      // Xác nhận giao thành công
      const markDelivered = new MarkDeliveredUseCase(orderRepo);
      const res = await markDelivered.execute(
        {
          orderId: created.data.id,
          codCollected: 200000,
          proofImageUrl: 'https://r2.deliveryhub.vn/pod/delivered-01.jpg',
          locationLat: 21.0285,
          locationLng: 105.8542,
        },
        mockShipperContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.status, ORDER_STATUS.DELIVERED);
        assert.equal(res.data.codCollected, 200000);
      }
    });

    it('[SEC-P13] blocks another shipper from marking order delivered (Anti-BOLA)', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'HN',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          codAmount: 200000,
          paymentBy: PAYMENT_BY.RECEIVER,
        },
        mockStaffContext
      );

      assert.equal(created.success, true);
      if (!created.success) return;

      // Gán cho ship-01
      const assign = new AssignOrdersToShipperUseCase(orderRepo, userRepo);
      await assign.execute(
        {
          orderIds: [created.data.id],
          shipperId: 'ship-01',
          hubId: 'hub-01',
        },
        mockStaffContext
      );

      // ship-02 cố tình xác nhận giao đơn của ship-01
      const markDelivered = new MarkDeliveredUseCase(orderRepo);
      const res = await markDelivered.execute(
        {
          orderId: created.data.id,
          codCollected: 200000,
        },
        mockOtherShipperContext
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Đơn hàng này không được phân công cho bạn đi giao/);
      }
    });

    it('rejects if COD collected does not match order COD amount', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'HN',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          codAmount: 200000,
          paymentBy: PAYMENT_BY.RECEIVER,
        },
        mockStaffContext
      );

      assert.equal(created.success, true);
      if (!created.success) return;

      const assign = new AssignOrdersToShipperUseCase(orderRepo, userRepo);
      await assign.execute(
        {
          orderIds: [created.data.id],
          shipperId: 'ship-01',
          hubId: 'hub-01',
        },
        mockStaffContext
      );

      const markDelivered = new MarkDeliveredUseCase(orderRepo);
      const res = await markDelivered.execute(
        {
          orderId: created.data.id,
          codCollected: 150000, // Sai số tiền COD
        },
        mockShipperContext
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /không khớp với số tiền cần thu/);
      }
    });
  });

  describe('UC19: MarkFailedAttemptUseCase', () => {
    it('marks failed attempt and increments deliveryAttempts counter', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'HN',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          codAmount: 0,
          paymentBy: PAYMENT_BY.SENDER,
        },
        mockStaffContext
      );

      assert.equal(created.success, true);
      if (!created.success) return;

      const assign = new AssignOrdersToShipperUseCase(orderRepo, userRepo);
      await assign.execute(
        {
          orderIds: [created.data.id],
          shipperId: 'ship-01',
          hubId: 'hub-01',
        },
        mockStaffContext
      );

      const markFailed = new MarkFailedAttemptUseCase(orderRepo);
      const res = await markFailed.execute(
        {
          orderId: created.data.id,
          failureReason: DELIVERY_FAILURE_REASON.CUSTOMER_UNREACHABLE,
          note: 'Gọi 3 cuộc không bắt máy',
        },
        mockShipperContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.status, ORDER_STATUS.FAILED_ATTEMPT);
        assert.equal(res.data.deliveryAttempts, 1);
        assert.equal(res.data.isReturnPending, false);
      }
    });

    it('automatically transitions to RETURN_PENDING when customer rejects permanently', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'HN',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          codAmount: 0,
          paymentBy: PAYMENT_BY.SENDER,
        },
        mockStaffContext
      );

      assert.equal(created.success, true);
      if (!created.success) return;

      const assign = new AssignOrdersToShipperUseCase(orderRepo, userRepo);
      await assign.execute(
        {
          orderIds: [created.data.id],
          shipperId: 'ship-01',
          hubId: 'hub-01',
        },
        mockStaffContext
      );

      const markFailed = new MarkFailedAttemptUseCase(orderRepo);
      const res = await markFailed.execute(
        {
          orderId: created.data.id,
          failureReason: DELIVERY_FAILURE_REASON.CUSTOMER_REJECTED,
        },
        mockShipperContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.status, ORDER_STATUS.RETURN_PENDING);
        assert.equal(res.data.isReturnPending, true);
      }
    });
  });

  describe('UC20: ProcessReturnOrderUseCase', () => {
    it('transitions return lifecycle: RETURN_PENDING -> RETURNED', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'HN',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          codAmount: 0,
          paymentBy: PAYMENT_BY.SENDER,
        },
        mockStaffContext
      );

      assert.equal(created.success, true);
      if (!created.success) return;

      const assign = new AssignOrdersToShipperUseCase(orderRepo, userRepo);
      await assign.execute(
        {
          orderIds: [created.data.id],
          shipperId: 'ship-01',
          hubId: 'hub-01',
        },
        mockStaffContext
      );

      // Báo thất bại với CUSTOMER_REJECTED => chuyển sang RETURN_PENDING
      const markFailed = new MarkFailedAttemptUseCase(orderRepo);
      await markFailed.execute(
        {
          orderId: created.data.id,
          failureReason: DELIVERY_FAILURE_REASON.CUSTOMER_REJECTED,
        },
        mockShipperContext
      );

      const processReturn = new ProcessReturnOrderUseCase(orderRepo);

      // Hoàn tất chuyển về người gửi (RETURNED)
      const returnedRes = await processReturn.execute(
        {
          orderId: created.data.id,
          hubId: 'hub-01',
        },
        mockStaffContext
      );
      assert.equal(returnedRes.success, true);
      if (returnedRes.success) {
        assert.equal(returnedRes.data.status, ORDER_STATUS.RETURNED);
      }
    });

    it('[SEC-P14] blocks Shipper from processing returns (RBAC)', async () => {
      const processReturn = new ProcessReturnOrderUseCase(orderRepo);
      const res = await processReturn.execute(
        {
          orderId: 'ord-01',
          hubId: 'hub-01',
        },
        mockShipperContext
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Chỉ Quản lý trạm hoặc Nhân viên điều phối kho mới có quyền/);
      }
    });
  });
});
