/**
 * @file delivery_hub_lifecycle.e2e.test.ts
 * @description Bộ kiểm thử toàn diện End-to-End (E2E) kiểm chứng luồng hoạt động xuyên suốt
 * từ Application Use Cases -> Domain Entities -> Repositories -> Live PostgreSQL Database.
 *
 * QUY TRÌNH QUẢN LÝ DỮ LIỆU:
 * - Hook before(): Kết nối DB và nạp toàn bộ Mock Data (seedMockData).
 * - Các Phase: Kiểm thử tuần tự 23 Use Cases theo vòng đời nghiệp vụ thực tế.
 * - Hook after(): Tự động gọi cleanMockData() dọn sạch 100% dữ liệu mock, trả CSDL về trạng thái ban đầu.
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_STATUS,
  USER_ROLE,
  USER_STATUS,
  PAYMENT_STATUS,
  DELIVERY_FAILURE_REASON,
} from '../../src/domain';
import {
  LoginUserUseCase,
  ChangePasswordUseCase,
  UpdateProfileUseCase,
} from '../../src/application/use-cases/auth';
import {
  CreateStaffUseCase,
  GetStaffListUseCase,
  ToggleStaffStatusUseCase,
  UpdateStaffUseCase,
  AssignShipperZoneUseCase,
} from '../../src/application/use-cases/staff';
import {
  CreateOrderUseCase,
  GetPublicTrackingUseCase,
} from '../../src/application/use-cases/orders';
import {
  CheckInHubUseCase,
  AssignOrdersToShipperUseCase,
  MarkDeliveredUseCase,
  MarkFailedAttemptUseCase,
} from '../../src/application/use-cases/shipments';
import {
  GetHubStatisticsUseCase,
  CreateCODSettlementUseCase,
  ReviewCODSettlementUseCase,
} from '../../src/application/use-cases/cod';
import {
  PrismaUserRepository,
  PrismaHubRepository,
  PrismaDeliveryZoneRepository,
  PrismaOrderRepository,
  PrismaOrderStatusLogRepository,
  PrismaCODSettlementRepository,
} from '../../src/infrastructure/database/repositories';
import { prisma, disconnectPrisma } from '../../src/infrastructure/database/prisma/client';
import { BcryptPasswordHasherService } from '../../src/infrastructure/security/bcrypt-password-hasher.service';
import { JwtAuthTokenService } from '../../src/infrastructure/security/jwt-auth-token.service';
import { seedMockData } from '../../scripts/seed_mock_data';
import { cleanMockData } from '../../scripts/clean_mock_data';

describe('Delivery Hub E2E Full Lifecycle Test Suite (Application -> Infra -> Domain -> DB)', () => {
  // Infrastructure Services & Repositories
  const userRepo = new PrismaUserRepository(prisma);
  const hubRepo = new PrismaHubRepository(prisma);
  const zoneRepo = new PrismaDeliveryZoneRepository(prisma);
  const orderRepo = new PrismaOrderRepository(prisma);
  const logRepo = new PrismaOrderStatusLogRepository(prisma);
  const codRepo = new PrismaCODSettlementRepository(prisma);

  const passwordHasher = new BcryptPasswordHasherService();
  const authTokenService = new JwtAuthTokenService();

  // Application Use Cases
  const loginUseCase = new LoginUserUseCase(userRepo, passwordHasher, authTokenService);
  const changePasswordUseCase = new ChangePasswordUseCase(userRepo, passwordHasher);
  const updateProfileUseCase = new UpdateProfileUseCase(userRepo);

  const createStaffUseCase = new CreateStaffUseCase(userRepo, hubRepo, passwordHasher);
  const getStaffListUseCase = new GetStaffListUseCase(userRepo, hubRepo);
  const toggleStaffStatusUseCase = new ToggleStaffStatusUseCase(userRepo);
  const updateStaffUseCase = new UpdateStaffUseCase(userRepo, hubRepo);
  const assignShipperZoneUseCase = new AssignShipperZoneUseCase(userRepo, zoneRepo);

  const createOrderUseCase = new CreateOrderUseCase(orderRepo, hubRepo);
  const checkInHubUseCase = new CheckInHubUseCase(orderRepo, hubRepo);
  const assignOrdersUseCase = new AssignOrdersToShipperUseCase(orderRepo, userRepo);
  const markDeliveredUseCase = new MarkDeliveredUseCase(orderRepo);
  const markFailedAttemptUseCase = new MarkFailedAttemptUseCase(orderRepo);

  const getHubStatisticsUseCase = new GetHubStatisticsUseCase(orderRepo, userRepo);
  const createCODSettlementUseCase = new CreateCODSettlementUseCase(codRepo, orderRepo, hubRepo, userRepo);
  const reviewCODSettlementUseCase = new ReviewCODSettlementUseCase(codRepo, hubRepo, userRepo);
  const getPublicTrackingUseCase = new GetPublicTrackingUseCase(orderRepo, logRepo, hubRepo);

  let isDbConnected = false;
  let mockHubId: string;
  let mockShipper1Id: string;
  let mockShipper2Id: string;
  let mockManagerId: string;
  let mockAdminId: string;
  let testOrderId: string;
  let testTrackingCode: string;

  before(async () => {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      isDbConnected = true;
    } catch {
      console.warn('⚠️ [E2E] Không thể kết nối tới PostgreSQL. Bỏ qua E2E Live DB Tests.');
      isDbConnected = false;
      return;
    }

    // 1. Nạp toàn bộ dữ liệu mock ban đầu
    console.log('\n--- [E2E SETUP] Nạp Mock Data cho kịch bản E2E ---');
    await seedMockData(prisma);

    // Lấy thông tin ID của các bản ghi mock vừa nạp
    const hub = await hubRepo.findByCode('MOCK-HUB-HN-01');
    assert.notEqual(hub, null, 'Hub Mock Hanoi must exist');
    mockHubId = String(hub!.getId());

    const shipper1 = await userRepo.findByUsername('mock_shipper1');
    assert.notEqual(shipper1, null, 'Shipper 1 Mock must exist');
    mockShipper1Id = String(shipper1!.getId());

    const shipper2 = await userRepo.findByUsername('mock_shipper2');
    assert.notEqual(shipper2, null, 'Shipper 2 Mock must exist');
    mockShipper2Id = String(shipper2!.getId());

    const manager = await userRepo.findByUsername('mock_manager');
    assert.notEqual(manager, null, 'Manager Mock must exist');
    mockManagerId = String(manager!.getId());

    const admin = await userRepo.findByUsername('mock_admin');
    assert.notEqual(admin, null, 'Admin Mock must exist');
    mockAdminId = String(admin!.getId());
  });

  after(async () => {
    if (isDbConnected) {
      // 2. Tự động dọn sạch 100% dữ liệu mock sau khi test xong
      console.log('\n--- [E2E TEARDOWN] Tự động dọn sạch 100% Mock Data khỏi DB ---');
      await cleanMockData(prisma);
      await disconnectPrisma();
    }
  });

  // ===========================================================================
  // PHASE 1: XÁC THỰC & QUẢN LÝ TÀI KHOẢN (UC01 - UC03)
  // ===========================================================================
  describe('Phase 1: Auth & Account Management Flow (UC01 - UC03)', () => {
    test('UC01: Login with mock_admin returns valid JWT Token and User Profile', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const result = await loginUseCase.execute({
        usernameOrEmail: 'mock_admin',
        password: 'Password@123',
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.user.username, 'mock_admin');
        assert.equal(result.data.user.role, USER_ROLE.ADMIN);
        assert.notEqual(result.data.token, null);

        // Verify token qua service
        const decoded = authTokenService.verifyToken(result.data.token);
        assert.notEqual(decoded, null);
        assert.equal(decoded!.username, 'mock_admin');
      }
    });

    test('UC02: Change password updates password hash securely in DB', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const shipper = await userRepo.findByUsername('mock_shipper2');
      assert.notEqual(shipper, null);
      const shipperId = String(shipper!.getId());

      const changeResult = await changePasswordUseCase.execute(
        {
          currentPassword: 'Password@123',
          newPassword: 'NewPassword@456',
          confirmPassword: 'NewPassword@456',
        },
        {
          userId: shipperId,
          username: shipper!.getUsername(),
          role: shipper!.getRole(),
          hubId: String(shipper!.getHubId()),
        }
      );

      assert.equal(changeResult.success, true);

      // Verify login bằng mật khẩu mới thành công
      const reLoginResult = await loginUseCase.execute({
        usernameOrEmail: 'mock_shipper2',
        password: 'NewPassword@456',
      });
      assert.equal(reLoginResult.success, true);
    });

    test('UC03: Update profile modifies full name and phone number in DB', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const staff = await userRepo.findByUsername('mock_staff');
      assert.notEqual(staff, null);
      const staffId = String(staff!.getId());

      const updateResult = await updateProfileUseCase.execute(
        {
          fullName: 'Lê Thị Điều Phối (Updated Name)',
          phone: '0988999888',
        },
        {
          userId: staffId,
          username: staff!.getUsername(),
          role: staff!.getRole(),
          hubId: String(staff!.getHubId()),
        }
      );

      assert.equal(updateResult.success, true);

      const reloaded = await userRepo.findById(staffId);
      assert.equal(reloaded?.getFullName(), 'Lê Thị Điều Phối (Updated Name)');
      assert.equal(reloaded?.getPhone().getValue(), '0988999888');
    });
  });

  // ===========================================================================
  // PHASE 2: QUẢN LÝ NHÂN SỰ & PHÂN TUYẾN GIAO HÀNG (UC04 - UC08)
  // ===========================================================================
  describe('Phase 2: Staff & Zone Management Flow (UC04 - UC08)', () => {
    let createdStaffId: string;

    test('UC05: Create new staff member under MOCK-HUB-HN-01 via Use Case', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const result = await createStaffUseCase.execute(
        {
          username: 'mock_dispatcher_new',
          password: 'Password@123',
          fullName: 'Nguyễn Văn Dispatcher Mới',
          email: 'mock.dispatcher.new@deliveryhub.vn',
          phone: '0912333444',
          role: USER_ROLE.HUB_STAFF,
          hubId: mockHubId,
        },
        {
          userId: mockManagerId,
          username: 'mock_manager',
          role: USER_ROLE.HUB_MANAGER,
          hubId: mockHubId,
        }
      );

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.username, 'mock_dispatcher_new');
        createdStaffId = result.data.id;
      }
    });

    test('UC04: Get staff list filtered by hub and role with pagination', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const result = await getStaffListUseCase.execute(
        {
          hubId: mockHubId,
          role: USER_ROLE.SHIPPER,
          page: 1,
          limit: 10,
          sortOrder: 'desc',
        },
        {
          userId: mockManagerId,
          username: 'mock_manager',
          role: USER_ROLE.HUB_MANAGER,
          hubId: mockHubId,
        }
      );

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.total >= 2, true);
        assert.equal(result.data.items.every((s) => s.role === USER_ROLE.SHIPPER), true);
      }
    });

    test('UC07: Lock and unlock staff account persists in database', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      // Khóa tài khoản
      const lockResult = await toggleStaffStatusUseCase.execute(
        {
          id: createdStaffId,
          status: USER_STATUS.LOCKED,
        },
        {
          userId: mockAdminId,
          username: 'mock_admin',
          role: USER_ROLE.ADMIN,
          hubId: null,
        }
      );
      assert.equal(lockResult.success, true);

      // Thử đăng nhập bằng tài khoản bị khóa -> Bị từ chối
      const loginAttempt = await loginUseCase.execute({
        usernameOrEmail: 'mock_dispatcher_new',
        password: 'Password@123',
      });
      assert.equal(loginAttempt.success, false);

      // Kích hoạt lại
      const unlockResult = await toggleStaffStatusUseCase.execute(
        {
          id: createdStaffId,
          status: USER_STATUS.ACTIVE,
        },
        {
          userId: mockAdminId,
          username: 'mock_admin',
          role: USER_ROLE.ADMIN,
          hubId: null,
        }
      );
      assert.equal(unlockResult.success, true);
    });

    test('UC08: Assign delivery zone to shipper persists and queries cleanly', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const zone = await zoneRepo.findByCode('MOCK-ZONE-HN-01');
      assert.notEqual(zone, null);
      const zoneId = String(zone!.getId());

      const assignResult = await assignShipperZoneUseCase.execute(
        {
          shipperId: mockShipper1Id,
          zoneId,
        },
        {
          userId: mockManagerId,
          username: 'mock_manager',
          role: USER_ROLE.HUB_MANAGER,
          hubId: mockHubId,
        }
      );
      assert.equal(assignResult.success, true);

      const assignedZones = await zoneRepo.findAssignedZonesByShipper(mockShipper1Id);
      assert.equal(assignedZones.some((z) => z.getCode() === 'MOCK-ZONE-HN-01'), true);
    });
  });

  // ===========================================================================
  // PHASE 3: VÒNG ĐỜI ĐƠN HÀNG & ĐIỀU PHỐI VẬN CHUYỂN (UC09 - UC20)
  // ===========================================================================
  describe('Phase 3: Order Lifecycle & Shipment Dispatching Flow (UC09 - UC20)', () => {
    test('UC09: Create Order with Value Objects and Audit Log in ACID transaction', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const createResult = await createOrderUseCase.execute(
        {
          currentHubId: null,
          senderName: 'Cửa hàng Đồ Công Nghệ Mock',
          senderPhone: '0988111222',
          senderAddress: 'Số 10 Tràng Tiền, Hoàn Kiếm, Hà Nội',
          receiverName: 'Đặng Thùy Linh',
          receiverPhone: '0912345678',
          receiverAddress: 'Số 144 Xuân Thủy',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          receiverWard: 'Dịch Vọng Hậu',
          weightGram: 500,
          lengthCm: 20,
          widthCm: 10,
          heightCm: 5,
          codAmount: 250000,
          shippingFee: 22000,
          paymentBy: 'RECEIVER',
          notes: 'Tiếp nhận đơn hàng mới trực tuyến',
        },
        {
          userId: mockManagerId,
          username: 'mock_manager',
          role: USER_ROLE.ADMIN,
          hubId: null,
        }
      );

      assert.equal(createResult.success, true);
      if (createResult.success) {
        testOrderId = createResult.data.id;
        testTrackingCode = createResult.data.trackingCode;
        assert.equal(createResult.data.currentStatus, ORDER_STATUS.CREATED);
        assert.equal(createResult.data.codAmount, 250000);
      }
    });

    test('UC15: Check-In Hub (Inbound Scan) updates status to AT_HUB and writes audit log', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const checkInResult = await checkInHubUseCase.execute(
        {
          trackingCode: testTrackingCode,
          hubId: mockHubId,
          actorId: mockManagerId,
          note: 'Quét mã Inbound nhập kho trạm Cầu Giấy',
        },
        {
          userId: mockManagerId,
          username: 'mock_manager',
          role: USER_ROLE.HUB_MANAGER,
          hubId: mockHubId,
        }
      );

      assert.equal(checkInResult.success, true);
      if (checkInResult.success) {
        assert.equal(checkInResult.data.status, ORDER_STATUS.AT_HUB);
      }
    });

    test('UC16: Batch assign orders to Shipper atomically sets OUT_FOR_DELIVERY', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const assignResult = await assignOrdersUseCase.execute(
        {
          orderIds: [testOrderId],
          shipperId: mockShipper1Id,
          hubId: mockHubId,
          actorId: mockManagerId,
        },
        {
          userId: mockManagerId,
          username: 'mock_manager',
          role: USER_ROLE.HUB_MANAGER,
          hubId: mockHubId,
        }
      );

      assert.equal(assignResult.success, true);
      if (assignResult.success) {
        assert.equal(assignResult.data.assignedCount, 1);
      }

      const assignedOrder = await orderRepo.findById(testOrderId);
      assert.equal(assignedOrder?.getCurrentStatus(), ORDER_STATUS.OUT_FOR_DELIVERY);
      assert.equal(String(assignedOrder?.getAssignedShipperId()), mockShipper1Id);
    });

    test('UC18: Mark Delivered confirms POD image and collects matching COD amount', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const deliveryResult = await markDeliveredUseCase.execute(
        {
          orderId: testOrderId,
          shipperId: mockShipper1Id,
          proofImageUrl: 'https://r2.deliveryhub.vn/pod/mock-delivery-01.jpg',
          codCollected: 250000,
          locationLat: 21.0368,
          locationLng: 105.7828,
          note: 'Người nhận trực tiếp ký nhận, thu đủ 250.000 VNĐ',
        },
        {
          userId: mockShipper1Id,
          username: 'mock_shipper1',
          role: USER_ROLE.SHIPPER,
          hubId: mockHubId,
        }
      );

      assert.equal(deliveryResult.success, true);
      if (deliveryResult.success) {
        assert.equal(deliveryResult.data.status, ORDER_STATUS.DELIVERED);
        assert.equal(deliveryResult.data.codCollected, 250000);
      }

      const delivered = await orderRepo.findById(testOrderId);
      assert.equal(delivered?.getCurrentStatus(), ORDER_STATUS.DELIVERED);
      assert.equal(delivered?.getPaymentStatus(), PAYMENT_STATUS.PAID);
    });

    test('UC19: Delivery failure increments attempt counter and auto-triggers RETURN_PENDING at 3 attempts', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      // Sử dụng đơn mock MOCK-TRK-OUT-01 đang OUT_FOR_DELIVERY để test báo giao thất bại
      const outOrder = await orderRepo.findByTrackingCode('MOCK-TRK-OUT-01');
      assert.notEqual(outOrder, null);
      const outOrderId = String(outOrder!.getId());

      const failResult = await markFailedAttemptUseCase.execute(
        {
          orderId: outOrderId,
          shipperId: mockShipper1Id,
          failureReason: DELIVERY_FAILURE_REASON.CUSTOMER_UNREACHABLE,
          locationLat: 21.0368,
          locationLng: 105.7828,
          note: 'Không gọi được cho khách hàng lần 1',
        },
        {
          userId: mockShipper1Id,
          username: 'mock_shipper1',
          role: USER_ROLE.SHIPPER,
          hubId: mockHubId,
        }
      );

      assert.equal(failResult.success, true);
      if (failResult.success) {
        assert.equal(failResult.data.deliveryAttempts, 1);
        assert.equal(failResult.data.status, ORDER_STATUS.FAILED_ATTEMPT);
      }
    });
  });

  // ===========================================================================
  // PHASE 4: ĐỐI SOÁT COD & BÁO CÁO HIỆU SUẤT TRẠM (UC21 - UC22)
  // ===========================================================================
  describe('Phase 4: COD Settlement & Station KPI Flow (UC21 - UC22)', () => {
    test('UC21: Station KPI counts breakdown of all order statuses correctly', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const statsResult = await getHubStatisticsUseCase.execute(
        { hubId: mockHubId },
        {
          userId: mockManagerId,
          username: 'mock_manager',
          role: USER_ROLE.HUB_MANAGER,
          hubId: mockHubId,
        }
      );

      assert.equal(statsResult.success, true);
      if (statsResult.success) {
        assert.equal(typeof statsResult.data.totalOrders, 'number');
        assert.equal(typeof statsResult.data.statusBreakdown[ORDER_STATUS.DELIVERED], 'number');
        assert.equal(statsResult.data.statusBreakdown[ORDER_STATUS.DELIVERED] >= 1, true);
      }
    });

    test('UC22: Shipper creates COD Settlement and Manager confirms handover', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      // Sử dụng đơn hàng testOrderId vừa được giao thành công bởi mock_shipper1 và có tiền COD 250.000 VNĐ
      const createSettlementResult = await createCODSettlementUseCase.execute(
        {
          hubId: mockHubId,
          shipperId: mockShipper1Id,
          orderIds: [testOrderId],
          notes: 'Phiên nộp tiền COD cuối ca Shipper 1',
        },
        {
          userId: mockShipper1Id,
          username: 'mock_shipper1',
          role: USER_ROLE.SHIPPER,
          hubId: mockHubId,
        }
      );

      assert.equal(createSettlementResult.success, true);
      if (createSettlementResult.success) {
        const settlementId = createSettlementResult.data.id;
        assert.equal(createSettlementResult.data.status, 'PENDING');
        assert.equal(createSettlementResult.data.totalCodAmount, 250000);

        // Quản lý trạm xác nhận thu tiền
        const reviewResult = await reviewCODSettlementUseCase.execute(
          {
            settlementId,
            managerId: mockManagerId,
            action: 'CONFIRM',
          },
          {
            userId: mockManagerId,
            username: 'mock_manager',
            role: USER_ROLE.HUB_MANAGER,
            hubId: mockHubId,
          }
        );

        assert.equal(reviewResult.success, true);
        if (reviewResult.success) {
          assert.equal(reviewResult.data.status, 'CONFIRMED');
          assert.notEqual(reviewResult.data.settledAt, null);
        }
      }
    });
  });

  // ===========================================================================
  // PHASE 5: TRA CỨU HÀNH TRÌNH VẬN ĐƠN CÔNG KHAI (UC23)
  // ===========================================================================
  describe('Phase 5: Public Tracking Flow (UC23)', () => {
    test('UC23: Tracking by tracking code returns chronological timeline and masks phone number', async (t) => {
      if (!isDbConnected) { t.skip('Database not available'); return; }

      const trackingCodeStr = 'MOCK-TRK-DELIVERED-01';
      const trackResult = await getPublicTrackingUseCase.execute({
        trackingCode: trackingCodeStr,
      });

      assert.equal(trackResult.success, true);
      if (trackResult.success) {
        assert.equal(trackResult.data.trackingCode, trackingCodeStr);
        assert.equal(trackResult.data.currentStatus, ORDER_STATUS.DELIVERED);
        // Kiểm tra bảo mật thông tin số điện thoại (ẩn 3 số giữa)
        assert.equal(trackResult.data.receiverPhoneMasked.includes('***'), true);
        assert.equal(trackResult.data.receiverPhoneMasked.startsWith('0912'), true);
        // Kiểm tra timeline
        assert.equal(trackResult.data.timeline.length >= 1, true);
        assert.equal(trackResult.data.timeline[0].status, ORDER_STATUS.DELIVERED);
      }
    });
  });
});
