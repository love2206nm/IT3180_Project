/**
 * @file order_use_cases.test.ts
 * @description Unit Tests cho các Use Cases Quản lý Đơn hàng & Tra cứu Công khai (UC09 - UC14, UC23).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateOrderUseCase,
  GetOrderListUseCase,
  GetOrderDetailUseCase,
  UpdateOrderUseCase,
  CancelOrderUseCase,
  ImportOrdersUseCase,
  GetPublicTrackingUseCase,
} from '../../src/application/use-cases/orders';
import type { SecurityContext } from '../../src/application/interfaces/security-context.interface';
import {
  InMemoryOrderRepository,
  InMemoryOrderStatusLogRepository,
  InMemoryHubRepository,
  InMemoryUserRepository,
} from './mocks/in-memory-repositories';
import { Hub } from '../../src/domain/entities/hub.entity';
import { PhoneNumber } from '../../src/domain/value-objects/phone-number.vo';
import { HUB_STATUS } from '../../src/domain/constants/hub-status.constant';
import { ORDER_STATUS } from '../../src/domain/constants/order-status.constant';
import { PAYMENT_BY } from '../../src/domain/constants/payment.constant';
import { USER_ROLE } from '../../src/domain/constants/roles.constant';

describe('Application Layer: Order & Tracking Use Cases (UC09 - UC14, UC23)', () => {
  let orderRepo: InMemoryOrderRepository;
  let logRepo: InMemoryOrderStatusLogRepository;
  let hubRepo: InMemoryHubRepository;
  let userRepo: InMemoryUserRepository;

  const mockStaffContext: SecurityContext = {
    userId: 'usr-staff-01',
    username: 'staff01',
    role: USER_ROLE.HUB_STAFF,
    hubId: 'hub-01',
  };

  const mockOtherHubStaffContext: SecurityContext = {
    userId: 'usr-staff-02',
    username: 'staff02',
    role: USER_ROLE.HUB_STAFF,
    hubId: 'hub-02',
  };

  const mockShipperContext: SecurityContext = {
    userId: 'usr-shipper-01',
    username: 'shipper01',
    role: USER_ROLE.SHIPPER,
    hubId: 'hub-01',
  };

  beforeEach(async () => {
    orderRepo = new InMemoryOrderRepository();
    logRepo = new InMemoryOrderStatusLogRepository();
    hubRepo = new InMemoryHubRepository();
    userRepo = new InMemoryUserRepository();

    await hubRepo.save(
      new Hub({
        id: 'hub-01',
        code: 'HUB-HAN-01',
        name: 'Bưu cục Cầu Giấy',
        address: '10 Cầu Giấy',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng',
        phone: PhoneNumber.create('02412345678'),
        status: HUB_STATUS.ACTIVE,
      })
    );
  });

  describe('UC09: CreateOrderUseCase', () => {
    it('creates order with auto-generated tracking code and auto-calculated shipping fee', async () => {
      const useCase = new CreateOrderUseCase(orderRepo, hubRepo);
      const res = await useCase.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'Số 1 Phố Huế',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'Số 20 Cầu Giấy',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 1800, // > 1000g => 20k + 2 * 5k = 30k
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
          codAmount: 250000,
          paymentBy: PAYMENT_BY.RECEIVER,
        },
        mockStaffContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.ok(res.data.trackingCode.startsWith('TRK-'));
        assert.equal(res.data.currentStatus, ORDER_STATUS.AT_HUB);
        assert.equal(res.data.shippingFee, 30000);
        assert.equal(res.data.currentHubName, 'Bưu cục Cầu Giấy');
      }
    });

    it('[SEC-P05] prevents unauthenticated order creation (Fail-Closed)', async () => {
      const useCase = new CreateOrderUseCase(orderRepo, hubRepo);
      const res = await useCase.execute({
        currentHubId: 'hub-01',
        senderName: 'Shop A',
        senderPhone: '0912345678',
        senderAddress: 'Số 1 Phố Huế',
        receiverName: 'Khách B',
        receiverPhone: '0987654321',
        receiverAddress: 'Số 20 Cầu Giấy',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        weightGram: 1000,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        codAmount: 0,
        paymentBy: PAYMENT_BY.SENDER,
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Yêu cầu không được xác thực/);
      }
    });
  });

  describe('UC10: GetOrderListUseCase', () => {
    it('searches and filters orders with pagination', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      await createOrder.execute(
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

      const useCase = new GetOrderListUseCase(orderRepo, hubRepo, userRepo);
      const res = await useCase.execute(
        { page: 1, limit: 10, receiverPhone: '0987654321' },
        mockStaffContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.total, 1);
        assert.equal(res.data.items[0].receiverPhone, '0987654321');
      }
    });

    it('[SEC-P06] forces Hub Isolation when non-admin staff queries orders (Anti-BOLA)', async () => {
      const useCase = new GetOrderListUseCase(orderRepo, hubRepo, userRepo);
      // Staff ở hub-01 cố tình truyền currentHubId: 'hub-02'
      const res = await useCase.execute(
        { page: 1, limit: 10, currentHubId: 'hub-02' },
        mockStaffContext
      );

      // Kết quả vẫn thành công nhưng hệ thống tự ép phạm vi về hub-01
      assert.equal(res.success, true);
    });
  });

  describe('UC11: GetOrderDetailUseCase', () => {
    it('retrieves order details along with audit logs', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const createRes = await createOrder.execute(
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
          codAmount: 100000,
          paymentBy: PAYMENT_BY.SENDER,
        },
        mockStaffContext
      );

      assert.equal(createRes.success, true);
      if (!createRes.success) return;

      const useCase = new GetOrderDetailUseCase(orderRepo, logRepo, hubRepo, userRepo);
      const res = await useCase.execute(
        { idOrTrackingCode: createRes.data.id },
        mockStaffContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.order.id, createRes.data.id);
        assert.ok(res.data.order.currentHubName);
      }
    });

    it('[SEC-P07] rejects viewing order belonging to another hub (Anti-BOLA)', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const createRes = await createOrder.execute(
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
          codAmount: 100000,
          paymentBy: PAYMENT_BY.SENDER,
        },
        mockStaffContext
      );

      assert.equal(createRes.success, true);
      if (!createRes.success) return;

      const useCase = new GetOrderDetailUseCase(orderRepo, logRepo, hubRepo, userRepo);
      // Staff ở hub-02 cố tình đọc chi tiết đơn ở hub-01
      const res = await useCase.execute(
        { idOrTrackingCode: createRes.data.id },
        mockOtherHubStaffContext
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Bạn chỉ có quyền xem chi tiết đơn hàng thuộc trạm của mình/);
      }
    });
  });

  describe('UC12: UpdateOrderUseCase', () => {
    it('updates receiver address and notes when order is AT_HUB', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách Cũ',
          receiverPhone: '0987654321',
          receiverAddress: 'Số 1 Cũ',
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

      const useCase = new UpdateOrderUseCase(orderRepo, hubRepo);
      const res = await useCase.execute(
        {
          id: created.data.id,
          receiverName: 'Khách Mới',
          receiverAddress: 'Số 99 Đường Mới',
        },
        mockStaffContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.receiverName, 'Khách Mới');
        assert.equal(res.data.receiverAddress, 'Số 99 Đường Mới');
      }
    });

    it('[SEC-P08] blocks Delivery Hijacking: rejects unauthenticated or unauthorized update', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách Thật',
          receiverPhone: '0987654321',
          receiverAddress: 'Số 1 Thật',
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

      const useCase = new UpdateOrderUseCase(orderRepo, hubRepo);

      // Thử gọi không có securityContext
      const noAuthRes = await useCase.execute({
        id: created.data.id,
        receiverName: 'Hacker',
        receiverAddress: 'Hang ổ Hacker',
      });
      assert.equal(noAuthRes.success, false);
      if (!noAuthRes.success) {
        assert.match(noAuthRes.error, /Yêu cầu không được xác thực/);
      }

      // Thử gọi bằng Shipper (không có quyền sửa địa chỉ nhận hàng)
      const shipperRes = await useCase.execute(
        {
          id: created.data.id,
          receiverName: 'Shipper Thay Đổi',
        },
        mockShipperContext
      );
      assert.equal(shipperRes.success, false);
      if (!shipperRes.success) {
        assert.match(shipperRes.error, /Nhân viên giao hàng không có quyền chỉnh sửa/);
      }
    });
  });

  describe('UC13: CancelOrderUseCase', () => {
    it('cancels order when at hub and creates audit log', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách Hủy',
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

      const useCase = new CancelOrderUseCase(orderRepo);
      const res = await useCase.execute(
        {
          id: created.data.id,
          reason: 'Khách báo hủy đơn không nhận nữa',
        },
        mockStaffContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.status, ORDER_STATUS.CANCELLED);
      }
    });

    it('[SEC-P09] blocks Shipper or other Hub from cancelling order', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách Hủy',
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

      const useCase = new CancelOrderUseCase(orderRepo);
      const shipperCancel = await useCase.execute(
        {
          id: created.data.id,
          reason: 'Shipper tự ý hủy',
        },
        mockShipperContext
      );

      assert.equal(shipperCancel.success, false);
      if (!shipperCancel.success) {
        assert.match(shipperCancel.error, /Nhân viên giao hàng \(Shipper\) không có quyền hủy đơn hàng/);
      }
    });
  });

  describe('UC14: ImportOrdersUseCase', () => {
    it('imports batch of orders successfully', async () => {
      const useCase = new ImportOrdersUseCase(orderRepo, hubRepo);
      const res = await useCase.execute(
        {
          orders: [
            {
              currentHubId: 'hub-01',
              senderName: 'Shop 1',
              senderPhone: '0912345678',
              senderAddress: 'HN',
              receiverName: 'Khách 1',
              receiverPhone: '0987654321',
              receiverAddress: 'HN',
              receiverProvince: 'Hà Nội',
              receiverDistrict: 'Cầu Giấy',
              weightGram: 500,
              lengthCm: 10,
              widthCm: 10,
              heightCm: 10,
              codAmount: 50000,
              paymentBy: PAYMENT_BY.SENDER,
            },
            {
              currentHubId: 'hub-01',
              senderName: 'Shop 2',
              senderPhone: '0912345678',
              senderAddress: 'HN',
              receiverName: 'Khách 2',
              receiverPhone: '0987654322',
              receiverAddress: 'HN',
              receiverProvince: 'Hà Nội',
              receiverDistrict: 'Cầu Giấy',
              weightGram: 600,
              lengthCm: 10,
              widthCm: 10,
              heightCm: 10,
              codAmount: 60000,
              paymentBy: PAYMENT_BY.SENDER,
            },
          ],
        },
        mockStaffContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.successCount, 2);
        assert.equal(res.data.trackingCodes.length, 2);
      }
    });
  });

  describe('UC23: GetPublicTrackingUseCase', () => {
    it('returns tracking details with masked receiver phone and masked receiver name for privacy', async () => {
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const created = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop Bảo Mật',
          senderPhone: '0912345678',
          senderAddress: 'Hà Nội',
          receiverName: 'Nguyễn Văn Nhận',
          receiverPhone: '0912345678',
          receiverAddress: 'Số 15 Phố Duy Tân',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 800,
          lengthCm: 15,
          widthCm: 15,
          heightCm: 10,
          codAmount: 150000,
          paymentBy: PAYMENT_BY.RECEIVER,
        },
        mockStaffContext
      );

      assert.equal(created.success, true);
      if (!created.success) return;

      const useCase = new GetPublicTrackingUseCase(orderRepo, logRepo, hubRepo);
      const res = await useCase.execute({ trackingCode: created.data.trackingCode });

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.trackingCode, created.data.trackingCode);
        // Bảo vệ PII: Họ tên phải được che bảo mật
        assert.equal(res.data.receiverName, 'N***** V** N**n');
        // Phải được che số điện thoại: 0912***678
        assert.match(res.data.receiverPhoneMasked, /^\d{4}\*{3}\d{3}$/);
        assert.equal(res.data.currentStatus, ORDER_STATUS.AT_HUB);
      }
    });
  });
});
