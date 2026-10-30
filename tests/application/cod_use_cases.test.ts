/**
 * @file cod_use_cases.test.ts
 * @description Unit Tests cho các Use Cases Thống kê Hiệu suất & Đối soát COD (UC21, UC22).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GetHubStatisticsUseCase,
  CreateCODSettlementUseCase,
  ReviewCODSettlementUseCase,
} from '../../src/application/use-cases/cod';
import { CreateOrderUseCase } from '../../src/application/use-cases/orders';
import { AssignOrdersToShipperUseCase, MarkDeliveredUseCase } from '../../src/application/use-cases/shipments';
import {
  InMemoryCODSettlementRepository,
  InMemoryOrderRepository,
  InMemoryHubRepository,
  InMemoryUserRepository,
} from './mocks/in-memory-repositories';
import { User } from '../../src/domain/entities/user.entity';
import { Hub } from '../../src/domain/entities/hub.entity';
import { PhoneNumber } from '../../src/domain/value-objects/phone-number.vo';
import { USER_ROLE } from '../../src/domain/constants/roles.constant';
import { USER_STATUS } from '../../src/domain/constants/user-status.constant';
import { HUB_STATUS } from '../../src/domain/constants/hub-status.constant';
import { PAYMENT_BY } from '../../src/domain/constants/payment.constant';
import { COD_SETTLEMENT_STATUS } from '../../src/domain/constants/cod-status.constant';
import type { SecurityContext } from '../../src/application/interfaces/security-context.interface';

describe('Application Layer: COD & KPI Use Cases (UC21, UC22)', () => {
  let codRepo: InMemoryCODSettlementRepository;
  let orderRepo: InMemoryOrderRepository;
  let hubRepo: InMemoryHubRepository;
  let userRepo: InMemoryUserRepository;

  const mockManagerContext: SecurityContext = {
    userId: 'mgr-01',
    username: 'manager_cg',
    role: USER_ROLE.HUB_MANAGER,
    hubId: 'hub-01',
  };

  const mockShipperContext: SecurityContext = {
    userId: 'ship-01',
    username: 'shipper01',
    role: USER_ROLE.SHIPPER,
    hubId: 'hub-01',
  };

  beforeEach(async () => {
    codRepo = new InMemoryCODSettlementRepository();
    orderRepo = new InMemoryOrderRepository();
    hubRepo = new InMemoryHubRepository();
    userRepo = new InMemoryUserRepository();

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

    // Tạo Hub Manager
    await userRepo.save(
      new User({
        id: 'mgr-01',
        username: 'manager_cg',
        passwordHash: 'pass',
        fullName: 'Trần Quản Lý',
        email: 'manager@delivery.vn',
        phone: PhoneNumber.create('0900000001'),
        role: USER_ROLE.HUB_MANAGER,
        status: USER_STATUS.ACTIVE,
        hubId: 'hub-01',
      })
    );

    // Tạo Shipper
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
  });

  describe('UC21: GetHubStatisticsUseCase', () => {
    it('returns status breakdown and shipper KPI performance', async () => {
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
          codAmount: 100000,
          paymentBy: PAYMENT_BY.RECEIVER,
        },
        mockManagerContext
      );

      const useCase = new GetHubStatisticsUseCase(orderRepo, userRepo);
      const res = await useCase.execute(
        { hubId: 'hub-01' },
        { userId: 'mgr-01', username: 'manager_cg', role: USER_ROLE.HUB_MANAGER, hubId: 'hub-01' }
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.totalOrders, 1);
        assert.ok(res.data.shipperPerformance.length > 0);
      }
    });
  });

  describe('UC22: CreateCODSettlementUseCase & ReviewCODSettlementUseCase', () => {
    it('creates settlement, confirms it and rejects when needed', async () => {
      // 1. Tạo 2 đơn hàng có COD
      const createOrder = new CreateOrderUseCase(orderRepo, hubRepo);
      const ord1 = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
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
          codAmount: 300000,
          paymentBy: PAYMENT_BY.RECEIVER,
        },
        mockManagerContext
      );

      const ord2 = await createOrder.execute(
        {
          currentHubId: 'hub-01',
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'HN',
          receiverName: 'Khách 2',
          receiverPhone: '0987654322',
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
        mockManagerContext
      );

      assert.equal(ord1.success && ord2.success, true);
      if (!ord1.success || !ord2.success) return;

      // 2. Gán đơn cho shipper
      const assign = new AssignOrdersToShipperUseCase(orderRepo, userRepo);
      await assign.execute(
        {
          orderIds: [ord1.data.id, ord2.data.id],
          shipperId: 'ship-01',
          hubId: 'hub-01',
        },
        mockManagerContext
      );

      // 3. Giao thành công cả 2 đơn
      const markDelivered = new MarkDeliveredUseCase(orderRepo);
      await markDelivered.execute(
        {
          orderId: ord1.data.id,
          codCollected: 300000,
          proofImageUrl: 'https://r2.deliveryhub.vn/pod/pod-1.jpg',
        },
        mockShipperContext
      );
      await markDelivered.execute(
        {
          orderId: ord2.data.id,
          codCollected: 200000,
          proofImageUrl: 'https://r2.deliveryhub.vn/pod/pod-2.jpg',
        },
        mockShipperContext
      );

      // 4. Shipper nộp tiền COD cuối ca
      const createSettlement = new CreateCODSettlementUseCase(codRepo, orderRepo, hubRepo, userRepo);
      const settlementRes = await createSettlement.execute(
        {
          hubId: 'hub-01',
          shipperId: 'ship-01',
          orderIds: [ord1.data.id, ord2.data.id],
          notes: 'Nộp tiền ca chiều',
        },
        { userId: 'ship-01', username: 'shipper01', role: USER_ROLE.SHIPPER, hubId: 'hub-01' }
      );

      assert.equal(settlementRes.success, true);
      if (!settlementRes.success) return;

      assert.equal(settlementRes.data.totalCodAmount, 500000);
      assert.equal(settlementRes.data.totalOrdersCount, 2);
      assert.equal(settlementRes.data.status, COD_SETTLEMENT_STATUS.PENDING);

      // 5. [SEC-P15] Chống COD Double-Spending: Không cho phép nộp lại đơn đã nằm trong phiên đối soát
      const doubleSpendRes = await createSettlement.execute(
        {
          hubId: 'hub-01',
          orderIds: [ord1.data.id],
          notes: 'Thử nộp trùng lặp',
        },
        mockShipperContext
      );
      assert.equal(doubleSpendRes.success, false);
      if (!doubleSpendRes.success) {
        assert.match(doubleSpendRes.error, /đã nằm trong một phiên nộp COD đang xử lý hoặc đã hoàn tất đối soát/);
      }

      // 6. Quản lý trạm duyệt nhận tiền (CONFIRM)
      const reviewSettlement = new ReviewCODSettlementUseCase(codRepo, hubRepo, userRepo);
      const confirmRes = await reviewSettlement.execute(
        {
          settlementId: settlementRes.data.id,
          action: 'CONFIRM',
        },
        mockManagerContext
      );

      assert.equal(confirmRes.success, true);
      if (confirmRes.success) {
        assert.equal(confirmRes.data.status, COD_SETTLEMENT_STATUS.CONFIRMED);
        assert.equal(confirmRes.data.managerId, 'mgr-01');
      }
    });
  });
});
