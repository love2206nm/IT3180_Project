/**
 * @file actions.test.ts
 * @description Unit & Integration Tests cho toàn bộ Server Actions của Tầng Presentation (UC01 - UC23).
 * Kiểm thử tính xác thực Zod, phân quyền RBAC qua Cookie, Composition Root DI Container và Result Pattern.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  appContainer,
} from '../../src/infrastructure/di';
import {
  loginAction,
  logoutAction,
  changePasswordAction,
  updateProfileAction,
  getCurrentUserAction,
  getStaffListAction,
  createStaffAction,
  updateStaffAction,
  toggleStaffStatusAction,
  assignShipperZoneAction,
  createOrderAction,
  getOrderListAction,
  getOrderDetailAction,
  updateOrderAction,
  cancelOrderAction,
  importOrdersAction,
  checkInHubAction,
  assignOrdersToShipperAction,
  markDeliveredAction,
  markFailedAttemptAction,
  processReturnOrderAction,
  getHubStatisticsAction,
  createCODSettlementAction,
  reviewCODSettlementAction,
  trackOrderPublicAction,
  __setMockCookie,
  __resetMockCookies,
  AUTH_COOKIE_NAME,
  parseActionInput,
  requireAuth,
} from '../../src/presentation/actions';
import {
  InMemoryUserRepository,
  InMemoryHubRepository,
  InMemoryOrderRepository,
  InMemoryOrderStatusLogRepository,
  InMemoryDeliveryZoneRepository,
  InMemoryCODSettlementRepository,
} from '../application/mocks/in-memory-repositories';
import { User } from '../../src/domain/entities/user.entity';
import { Hub } from '../../src/domain/entities/hub.entity';
import { DeliveryZone } from '../../src/domain/entities/delivery-zone.entity';
import { PhoneNumber } from '../../src/domain/value-objects/phone-number.vo';
import { USER_ROLE } from '../../src/domain/constants/roles.constant';
import { USER_STATUS } from '../../src/domain/constants/user-status.constant';
import { HUB_STATUS } from '../../src/domain/constants/hub-status.constant';
import { PAYMENT_BY } from '../../src/domain/constants/payment.constant';
import { DELIVERY_FAILURE_REASON } from '../../src/domain/constants/failure-reasons.constant';

describe('Presentation Layer: Server Actions Test Suite (UC01 - UC23)', () => {
  let userRepo: InMemoryUserRepository;
  let hubRepo: InMemoryHubRepository;
  let orderRepo: InMemoryOrderRepository;
  let logRepo: InMemoryOrderStatusLogRepository;
  let zoneRepo: InMemoryDeliveryZoneRepository;
  let codRepo: InMemoryCODSettlementRepository;

  const rawPassword = 'Password123@';

  beforeEach(async () => {
    __resetMockCookies();

    userRepo = new InMemoryUserRepository();
    hubRepo = new InMemoryHubRepository();
    logRepo = new InMemoryOrderStatusLogRepository();
    orderRepo = new InMemoryOrderRepository(logRepo);
    zoneRepo = new InMemoryDeliveryZoneRepository();
    codRepo = new InMemoryCODSettlementRepository();

    // Cài đặt lại DI Container với in-memory mock repositories
    appContainer.reset({
      userRepository: userRepo,
      hubRepository: hubRepo,
      orderRepository: orderRepo,
      orderStatusLogRepository: logRepo,
      deliveryZoneRepository: zoneRepo,
      codSettlementRepository: codRepo,
    });

    const hashedPassword = await appContainer.passwordHasherService.hash(rawPassword);

    // 1. Tạo Hub Cầu Giấy
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

    // 2. Tạo Tuyến giao hàng
    await zoneRepo.save(
      new DeliveryZone({
        id: 'zone-01',
        hubId: 'hub-01',
        code: 'ZONE-CG-01',
        name: 'Tuyến Dịch Vọng Hậu',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng Hậu',
      })
    );

    // 3. Tạo Admin User
    await userRepo.save(
      new User({
        id: 'admin-01',
        username: 'admin',
        passwordHash: hashedPassword,
        fullName: 'Hệ Thống Admin',
        email: 'admin@deliveryhub.vn',
        phone: PhoneNumber.create('0900000001'),
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
        hubId: null,
      })
    );

    // 4. Tạo Quản lý Trạm (Hub Manager)
    await userRepo.save(
      new User({
        id: 'mgr-01',
        username: 'manager_cg',
        passwordHash: hashedPassword,
        fullName: 'Trần Quản Lý',
        email: 'manager.cg@deliveryhub.vn',
        phone: PhoneNumber.create('0900000002'),
        role: USER_ROLE.HUB_MANAGER,
        status: USER_STATUS.ACTIVE,
        hubId: 'hub-01',
      })
    );

    // 5. Tạo Shipper
    await userRepo.save(
      new User({
        id: 'ship-01',
        username: 'shipper01',
        passwordHash: hashedPassword,
        fullName: 'Nguyễn Văn Shipper',
        email: 'shipper01@deliveryhub.vn',
        phone: PhoneNumber.create('0912345678'),
        role: USER_ROLE.SHIPPER,
        status: USER_STATUS.ACTIVE,
        hubId: 'hub-01',
      })
    );
  });

  // ===========================================================================
  // SUITE 1: HELPER TESTS (FORM PARSER & SESSION COOKIE)
  // ===========================================================================
  describe('Presentation Helpers: Form Parser & Session', () => {
    it('parseActionInput: passes plain objects and parses FormData', () => {
      const plain = { name: 'Test', count: 123 };
      assert.deepEqual(parseActionInput(plain), plain);

      // Giả lập FormData
      const mockFormData = new Map<string, unknown>([
        ['username', ' admin '],
        ['emptyField', '   '],
        ['tags', '["logistics", "express"]'],
      ]);
      const fakeFormData = {
        entries: () => mockFormData.entries(),
      } as unknown as FormData;

      const parsed = parseActionInput(fakeFormData);
      assert.equal(parsed.username, 'admin');
      assert.equal(parsed.emptyField, undefined);
      assert.deepEqual(parsed.tags, ['logistics', 'express']);
    });

    it('sessionHelper: manages cookies and validates requireAuth', async () => {
      // Khi chưa đăng nhập
      const unauth = await requireAuth();
      assert.equal(unauth.success, false);

      // Cấp token giả lập cho Shipper
      const token = appContainer.authTokenService.generateToken({
        userId: 'ship-01',
        username: 'shipper01',
        role: USER_ROLE.SHIPPER,
        hubId: 'hub-01',
      });
      __setMockCookie(AUTH_COOKIE_NAME, token);

      // Kiểm tra requireAuth cho role được phép
      const authSuccess = await requireAuth([USER_ROLE.SHIPPER]);
      assert.equal(authSuccess.success, true);
      if (authSuccess.success) {
        assert.equal(authSuccess.data.userId, 'ship-01');
      }

      // Kiểm tra requireAuth từ chối role không đủ quyền
      const forbidden = await requireAuth([USER_ROLE.ADMIN]);
      assert.equal(forbidden.success, false);
      if (!forbidden.success) {
        assert.match(forbidden.error, /không có quyền/);
      }
    });
  });

  // ===========================================================================
  // SUITE 2: AUTH ACTIONS (UC01 - UC03)
  // ===========================================================================
  describe('Auth Actions (UC01 - UC03)', () => {
    it('loginAction: validates Zod input and rejects invalid login', async () => {
      const invalid = await loginAction({ usernameOrEmail: 'a', password: '123' });
      assert.equal(invalid.success, false);
      if (!invalid.success) {
        assert.ok(invalid.fieldErrors);
      }

      const wrongPass = await loginAction({ usernameOrEmail: 'admin', password: 'WrongPassword' });
      assert.equal(wrongPass.success, false);
      if (!wrongPass.success) {
        assert.match(wrongPass.error, /mật khẩu không chính xác/i);
      }
    });

    it('loginAction & getCurrentUserAction & logoutAction: complete auth lifecycle', async () => {
      // 1. Đăng nhập thành công
      const loginRes = await loginAction({
        usernameOrEmail: 'admin',
        password: rawPassword,
      });
      assert.equal(loginRes.success, true);
      if (!loginRes.success) return;

      assert.equal(loginRes.data.user.username, 'admin');
      assert.ok(loginRes.data.token);

      // 2. Lấy thông tin user hiện tại từ Cookie
      const currentRes = await getCurrentUserAction();
      assert.equal(currentRes.success, true);
      if (currentRes.success) {
        assert.equal(currentRes.data.username, 'admin');
        assert.equal(currentRes.data.role, USER_ROLE.ADMIN);
      }

      // 3. Đổi mật khẩu
      const changeRes = await changePasswordAction({
        currentPassword: rawPassword,
        newPassword: 'NewPassword123@',
        confirmPassword: 'NewPassword123@',
      });
      assert.equal(changeRes.success, true);

      // 4. Cập nhật hồ sơ
      const updateProfileRes = await updateProfileAction({
        fullName: 'Admin Quản Trị Viên',
        phone: '0900000099',
      });
      assert.equal(updateProfileRes.success, true);
      if (updateProfileRes.success) {
        assert.equal(updateProfileRes.data.fullName, 'Admin Quản Trị Viên');
      }

      // 5. Đăng xuất
      const logoutRes = await logoutAction();
      assert.equal(logoutRes.success, true);

      // Thử lấy lại thông tin -> phải thất bại vì đã xóa cookie
      const afterLogout = await getCurrentUserAction();
      assert.equal(afterLogout.success, false);
    });
  });

  // ===========================================================================
  // SUITE 3: STAFF ACTIONS (UC04 - UC08)
  // ===========================================================================
  describe('Staff Actions (UC04 - UC08)', () => {
    beforeEach(async () => {
      // Đăng nhập quyền Admin
      const token = appContainer.authTokenService.generateToken({
        userId: 'admin-01',
        username: 'admin',
        role: USER_ROLE.ADMIN,
        hubId: null,
      });
      __setMockCookie(AUTH_COOKIE_NAME, token);
    });

    it('manages staff lifecycle: list, create, update, toggle and assign zone', async () => {
      // 1. Lấy danh sách nhân viên (UC04)
      const listRes = await getStaffListAction({ page: 1, pageSize: 10 });
      assert.equal(listRes.success, true);
      if (listRes.success) {
        assert.equal(listRes.data.total, 3);
      }

      // 2. Tạo nhân viên mới (UC05)
      const createRes = await createStaffAction({
        username: 'staff_new',
        password: 'Password123@',
        fullName: 'Nguyễn Văn Nhân Viên',
        email: 'staff.new@deliveryhub.vn',
        phone: '0933445566',
        role: USER_ROLE.HUB_STAFF,
        hubId: 'hub-01',
      });
      assert.equal(createRes.success, true);
      if (!createRes.success) return;
      const createdStaffId = createRes.data.id;

      // 3. Cập nhật thông tin nhân viên (UC06)
      const updateRes = await updateStaffAction({
        id: createdStaffId,
        fullName: 'Nguyễn Văn Nhân Viên Sửa',
      });
      assert.equal(updateRes.success, true);
      if (updateRes.success) {
        assert.equal(updateRes.data.fullName, 'Nguyễn Văn Nhân Viên Sửa');
      }

      // 4. Khóa tài khoản nhân viên (UC07)
      const toggleRes = await toggleStaffStatusAction({
        id: createdStaffId,
        status: USER_STATUS.LOCKED,
      });
      assert.equal(toggleRes.success, true);

      // 5. Phân tuyến cho Shipper (UC08)
      const assignZoneRes = await assignShipperZoneAction({
        shipperId: 'ship-01',
        zoneId: 'zone-01',
      });
      assert.equal(assignZoneRes.success, true);
      if (assignZoneRes.success) {
        assert.match(assignZoneRes.data.message, /thành công/);
      }
    });
  });

  // ===========================================================================
  // SUITE 4: ORDER ACTIONS (UC09 - UC14)
  // ===========================================================================
  describe('Order Actions (UC09 - UC14)', () => {
    beforeEach(async () => {
      // Đăng nhập quyền Quản lý trạm
      const token = appContainer.authTokenService.generateToken({
        userId: 'mgr-01',
        username: 'manager_cg',
        role: USER_ROLE.HUB_MANAGER,
        hubId: 'hub-01',
      });
      __setMockCookie(AUTH_COOKIE_NAME, token);
    });

    it('creates, lists, gets detail, updates and cancels orders', async () => {
      // 1. Tạo đơn hàng mới (UC09)
      const createRes = await createOrderAction({
        senderName: 'Shop Thời Trang',
        senderPhone: '0912345678',
        senderAddress: 'Số 1 Phố Huế',
        receiverName: 'Khách Mua Hàng',
        receiverPhone: '0987654321',
        receiverAddress: 'Số 99 Cầu Giấy',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        weightGram: 500,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        codAmount: 250000,
        paymentBy: PAYMENT_BY.RECEIVER,
      });

      assert.equal(createRes.success, true);
      if (!createRes.success) return;

      const orderId = createRes.data.id;
      const trackingCode = createRes.data.trackingCode;
      assert.ok(trackingCode.startsWith('TRK-'));
      assert.equal(createRes.data.codAmount, 250000);

      // 2. Lấy danh sách đơn hàng (UC10)
      const listRes = await getOrderListAction({ page: 1, pageSize: 10 });
      assert.equal(listRes.success, true);
      if (listRes.success) {
        assert.equal(listRes.data.total, 1);
      }

      // 3. Xem chi tiết đơn hàng kèm lịch sử kiểm vết (UC11)
      const detailRes = await getOrderDetailAction(trackingCode);
      assert.equal(detailRes.success, true);
      if (detailRes.success) {
        assert.equal(detailRes.data.order.trackingCode, trackingCode);
        assert.ok(detailRes.data.logs.length >= 1);
      }

      // 4. Sửa thông tin đơn hàng (UC12)
      const updateRes = await updateOrderAction({
        id: orderId,
        receiverName: 'Khách Mua Hàng Sửa Tên',
      });
      assert.equal(updateRes.success, true);
      if (updateRes.success) {
        assert.equal(updateRes.data.receiverName, 'Khách Mua Hàng Sửa Tên');
      }

      // 5. Import đơn hàng loạt (UC14)
      const importRes = await importOrdersAction({
        orders: [
          {
            senderName: 'Shop B',
            senderPhone: '0912345678',
            senderAddress: 'Hà Nội',
            receiverName: 'Khách C',
            receiverPhone: '0987654322',
            receiverAddress: 'Hà Nội',
            receiverProvince: 'Hà Nội',
            receiverDistrict: 'Cầu Giấy',
            weightGram: 300,
            lengthCm: 10,
            widthCm: 10,
            heightCm: 10,
            codAmount: 100000,
            paymentBy: PAYMENT_BY.SENDER,
          },
        ],
      });
      assert.equal(importRes.success, true);
      if (importRes.success) {
        assert.equal(importRes.data.successCount, 1);
      }

      // 6. Hủy đơn hàng (UC13)
      const cancelRes = await cancelOrderAction({
        id: orderId,
        reason: 'Khách hủy không muốn mua nữa',
      });
      assert.equal(cancelRes.success, true);
    });
  });

  // ===========================================================================
  // SUITE 5: SHIPMENT ACTIONS (UC15 - UC20)
  // ===========================================================================
  describe('Shipment Actions (UC15 - UC20)', () => {
    let orderId: string;
    let trackingCode: string;

    beforeEach(async () => {
      // Đăng nhập Admin để tạo đơn ở trạng thái ban đầu CREATED
      const adminToken = appContainer.authTokenService.generateToken({
        userId: 'admin-01',
        username: 'admin',
        role: USER_ROLE.ADMIN,
        hubId: null,
      });
      __setMockCookie(AUTH_COOKIE_NAME, adminToken);

      const created = await createOrderAction({
        senderName: 'Shop A',
        senderPhone: '0912345678',
        senderAddress: '10 Cầu Giấy, Hà Nội',
        receiverName: 'Khách Nhận',
        receiverPhone: '0987654321',
        receiverAddress: '20 Kim Mã, Hà Nội',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        weightGram: 500,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        codAmount: 150000,
        paymentBy: PAYMENT_BY.RECEIVER,
      });

      if (created.success) {
        orderId = created.data.id;
        trackingCode = created.data.trackingCode;
      }
    });

    it('executes full shipment lifecycle: check-in, assign, deliver with COD & POD', async () => {
      // Đăng nhập Quản lý trạm để quét nhập kho (UC15)
      const mgrToken = appContainer.authTokenService.generateToken({
        userId: 'mgr-01',
        username: 'manager_cg',
        role: USER_ROLE.HUB_MANAGER,
        hubId: 'hub-01',
      });
      __setMockCookie(AUTH_COOKIE_NAME, mgrToken);

      // 1. Quét mã nhập trạm (UC15)
      const checkInRes = await checkInHubAction({
        trackingCode,
        hubId: 'hub-01',
      });
      assert.equal(checkInRes.success, true);

      // 2. Gán đơn cho Shipper (UC16)
      const assignRes = await assignOrdersToShipperAction({
        orderIds: [orderId],
        shipperId: 'ship-01',
        hubId: 'hub-01',
      });
      assert.equal(assignRes.success, true);
      if (assignRes.success) {
        assert.equal(assignRes.data.assignedCount, 1);
      }

      // 3. Đăng nhập với tư cách Shipper
      const shipToken = appContainer.authTokenService.generateToken({
        userId: 'ship-01',
        username: 'shipper01',
        role: USER_ROLE.SHIPPER,
        hubId: 'hub-01',
      });
      __setMockCookie(AUTH_COOKIE_NAME, shipToken);

      // 4. Giao thành công kèm ảnh POD và thu tiền COD (UC17, UC18)
      const deliverRes = await markDeliveredAction({
        orderId,
        codCollected: 150000,
        proofImageUrl: 'https://r2.deliveryhub.vn/pod/signature.jpg',
      });
      assert.equal(deliverRes.success, true);
      if (deliverRes.success) {
        assert.equal(deliverRes.data.codCollected, 150000);
      }
    });

    it('handles failed delivery attempt and returns lifecycle (UC19, UC20)', async () => {
      const mgrToken = appContainer.authTokenService.generateToken({
        userId: 'mgr-01',
        username: 'manager_cg',
        role: USER_ROLE.HUB_MANAGER,
        hubId: 'hub-01',
      });
      __setMockCookie(AUTH_COOKIE_NAME, mgrToken);

      await checkInHubAction({ trackingCode, hubId: 'hub-01' });

      // Gán đơn cho Shipper
      await assignOrdersToShipperAction({
        orderIds: [orderId],
        shipperId: 'ship-01',
        hubId: 'hub-01',
      });

      // Đăng nhập quyền Shipper
      const shipToken = appContainer.authTokenService.generateToken({
        userId: 'ship-01',
        username: 'shipper01',
        role: USER_ROLE.SHIPPER,
        hubId: 'hub-01',
      });
      __setMockCookie(AUTH_COOKIE_NAME, shipToken);

      // Báo thất bại: Khách từ chối nhận vĩnh viễn -> tự động kích hoạt RETURN_PENDING (UC19)
      const failedRes = await markFailedAttemptAction({
        orderId,
        failureReason: DELIVERY_FAILURE_REASON.CUSTOMER_REJECTED,
      });
      assert.equal(failedRes.success, true);
      if (failedRes.success) {
        assert.equal(failedRes.data.isReturnPending, true);
      }

      // Đăng nhập lại quyền Manager trạm để xử lý hoàn (UC20)
      __setMockCookie(AUTH_COOKIE_NAME, mgrToken);

      const returnRes = await processReturnOrderAction({
        orderId,
        hubId: 'hub-01',
      });
      assert.equal(returnRes.success, true);
    });
  });

  // ===========================================================================
  // SUITE 6: COD & KPI ACTIONS (UC21, UC22)
  // ===========================================================================
  describe('COD & KPI Actions (UC21, UC22)', () => {
    it('generates statistics and handles settlement lifecycle', async () => {
      // 1. Quản lý xem thống kê trạm (UC21)
      const mgrToken = appContainer.authTokenService.generateToken({
        userId: 'mgr-01',
        username: 'manager_cg',
        role: USER_ROLE.HUB_MANAGER,
        hubId: 'hub-01',
      });
      __setMockCookie(AUTH_COOKIE_NAME, mgrToken);

      const statsRes = await getHubStatisticsAction({ hubId: 'hub-01' });
      assert.equal(statsRes.success, true);

      // Tạo đơn hàng và hoàn tất giao thành công để có tiền COD
      const created = await createOrderAction({
        senderName: 'Shop A',
        senderPhone: '0912345678',
        senderAddress: '10 Cầu Giấy, Hà Nội',
        receiverName: 'Khách B',
        receiverPhone: '0987654321',
        receiverAddress: '20 Kim Mã, Hà Nội',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        weightGram: 500,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        codAmount: 200000,
        paymentBy: PAYMENT_BY.RECEIVER,
      });
      assert.equal(created.success, true);
      if (!created.success) return;

      await assignOrdersToShipperAction({
        orderIds: [created.data.id],
        shipperId: 'ship-01',
        hubId: 'hub-01',
      });

      // Shipper giao hàng
      const shipToken = appContainer.authTokenService.generateToken({
        userId: 'ship-01',
        username: 'shipper01',
        role: USER_ROLE.SHIPPER,
        hubId: 'hub-01',
      });
      __setMockCookie(AUTH_COOKIE_NAME, shipToken);

      await markDeliveredAction({
        orderId: created.data.id,
        codCollected: 200000,
        proofImageUrl: 'https://r2.deliveryhub.vn/pod/signature.jpg',
      });

      // 2. Shipper tạo phiên nộp tiền COD (UC22)
      const createSettlementRes = await createCODSettlementAction({
        hubId: 'hub-01',
        orderIds: [created.data.id],
        notes: 'Nộp tiền ca sáng',
      });
      assert.equal(createSettlementRes.success, true);
      if (!createSettlementRes.success) return;
      const settlementId = createSettlementRes.data.id;

      // 3. Quản lý duyệt đối soát tiền COD (UC22)
      __setMockCookie(AUTH_COOKIE_NAME, mgrToken);

      const reviewRes = await reviewCODSettlementAction({
        settlementId,
        action: 'CONFIRM',
      });
      assert.equal(reviewRes.success, true);
      if (reviewRes.success) {
        assert.equal(reviewRes.data.status, 'CONFIRMED');
      }
    });
  });

  // ===========================================================================
  // SUITE 7: PUBLIC TRACKING ACTION (UC23)
  // ===========================================================================
  describe('Public Tracking Action (UC23)', () => {
    it('trackOrderPublicAction: allows public access and masks phone number', async () => {
      // Không có cookie đăng nhập
      __resetMockCookies();

      // Tạo đơn hàng trước đó
      const mgrToken = appContainer.authTokenService.generateToken({
        userId: 'mgr-01',
        username: 'manager_cg',
        role: USER_ROLE.HUB_MANAGER,
        hubId: 'hub-01',
      });
      __setMockCookie(AUTH_COOKIE_NAME, mgrToken);

      const created = await createOrderAction({
        senderName: 'Shop A',
        senderPhone: '0912345678',
        senderAddress: '10 Cầu Giấy, Hà Nội',
        receiverName: 'Khách Hàng Bảo Mật',
        receiverPhone: '0987654321',
        receiverAddress: '20 Kim Mã, Hà Nội',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        weightGram: 500,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        codAmount: 0,
        paymentBy: PAYMENT_BY.SENDER,
      });
      assert.equal(created.success, true);
      if (!created.success) return;

      const trackingCode = created.data.trackingCode;

      // Khách vãng lai tra cứu ngoài trang chủ (không có session cookie)
      __resetMockCookies();

      const trackRes = await trackOrderPublicAction(trackingCode);
      assert.equal(trackRes.success, true);
      if (trackRes.success) {
        assert.equal(trackRes.data.trackingCode, trackingCode);
        assert.ok(trackRes.data.receiverName.includes('*'));
        // Kiểm tra che số điện thoại: '0987654321' -> '0987***321'
        assert.equal(trackRes.data.receiverPhoneMasked, '0987***321');
        assert.ok(trackRes.data.timeline.length >= 1);
      }
    });
  });
});
