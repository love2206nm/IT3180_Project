/**
 * @file dtos_validation.test.ts
 * @description Bộ kiểm thử toàn diện cho Tầng Application (Zod Schemas, DTOs & Interfaces)
 * Kiểm tra xác thực dữ liệu đầu vào theo 23 Use Cases và tính toàn vẹn của Result Pattern.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  // Auth
  LoginInputSchema,
  ChangePasswordInputSchema,
  UpdateProfileInputSchema,
  // Staff
  CreateStaffInputSchema,
  UpdateStaffInputSchema,
  AssignShipperZoneInputSchema,
  // Orders
  CreateOrderInputSchema,
  GetOrderListQuerySchema,
  CancelOrderInputSchema,
  ImportOrdersInputSchema,
  GetOrderDetailQuerySchema,
  // Shipments
  CheckInHubInputSchema,
  AssignOrdersToShipperInputSchema,
  MarkDeliveredInputSchema,
  MarkFailedAttemptInputSchema,
  // COD
  CreateCODSettlementInputSchema,
  ReviewCODSettlementInputSchema,
  // Tracking
  PublicTrackingQuerySchema,
  // Pagination & Common
  PaginationQuerySchema,
  ProofImageUrlSchema,
  createSafeTextSchema,
} from '../../src/application/dtos';
import { success, failure, isSuccess, isFailure } from '../../src/application/interfaces/result.interface';
import { USER_ROLE } from '../../src/domain/constants/roles.constant';
import { PAYMENT_BY } from '../../src/domain/constants/payment.constant';
import { DELIVERY_FAILURE_REASON } from '../../src/domain/constants/failure-reasons.constant';
import { COD_SETTLEMENT_STATUS } from '../../src/domain/constants/cod-status.constant';
import { DELIVERY_CONSTRAINTS } from '../../src/domain/constants/delivery-constraints.constant';

describe('Application Layer: Zod Schemas & DTO Validation Suite', () => {

  describe('Auth Schemas (UC01 - UC03)', () => {
    it('LoginInputSchema: accepts valid username or email with password', () => {
      const valid = LoginInputSchema.parse({
        usernameOrEmail: 'shipper_hn01',
        password: 'Password@123',
      });
      assert.equal(valid.usernameOrEmail, 'shipper_hn01');

      // Fails on empty account or short password
      assert.throws(() => LoginInputSchema.parse({ usernameOrEmail: '', password: '123' }));
    });

    it('ChangePasswordInputSchema: validates password confirmation match', () => {
      const valid = ChangePasswordInputSchema.parse({
        userId: 'user-001',
        currentPassword: 'OldPassword@123',
        newPassword: 'NewPassword@456',
        confirmPassword: 'NewPassword@456',
      });
      assert.equal(valid.newPassword, 'NewPassword@456');

      // Fails when confirmPassword does not match
      assert.throws(
        () =>
          ChangePasswordInputSchema.parse({
            userId: 'user-001',
            currentPassword: 'OldPassword@123',
            newPassword: 'NewPassword@456',
            confirmPassword: 'MismatchPassword',
          }),
        /Mật khẩu xác nhận không khớp/
      );
    });

    it('UpdateProfileInputSchema: validates fullName and VN mobile phone', () => {
      const valid = UpdateProfileInputSchema.parse({
        userId: 'user-001',
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
      });
      assert.equal(valid.fullName, 'Nguyễn Văn A');

      // Fails invalid VN phone prefix
      assert.throws(() =>
        UpdateProfileInputSchema.parse({
          userId: 'user-001',
          fullName: 'Nguyễn Văn A',
          phone: '0112345678',
        })
      );
    });
  });

  describe('Staff Schemas (UC04 - UC08)', () => {
    it('CreateStaffInputSchema: validates staff creation input and role enum', () => {
      const valid = CreateStaffInputSchema.parse({
        username: 'manager_caugiay',
        password: 'SecurePassword123',
        fullName: 'Trần Quản Lý',
        email: 'manager.caugiay@deliveryhub.vn',
        phone: '0988776655',
        role: USER_ROLE.HUB_MANAGER,
        hubId: 'hub-cg-01',
      });
      assert.equal(valid.role, USER_ROLE.HUB_MANAGER);

      // Fails invalid role
      assert.throws(() =>
        CreateStaffInputSchema.parse({
          username: 'manager_caugiay',
          password: 'SecurePassword123',
          fullName: 'Trần Quản Lý',
          email: 'manager@example.com',
          phone: '0988776655',
          role: 'SUPER_USER' as any,
          hubId: 'hub-cg-01',
        })
      );
    });

    it('AssignShipperZoneInputSchema: validates shipper ID and zone ID', () => {
      const valid = AssignShipperZoneInputSchema.parse({
        shipperId: 'shipper-123',
        zoneId: 'zone-hn-01',
      });
      assert.equal(valid.shipperId, 'shipper-123');

      assert.throws(() =>
        AssignShipperZoneInputSchema.parse({
          shipperId: '',
          zoneId: '',
        })
      );
    });
  });

  describe('Order Schemas (UC09 - UC14)', () => {
    it('CreateOrderInputSchema: validates complete order creation input', () => {
      const valid = CreateOrderInputSchema.parse({
        senderName: 'Shop Thời Trang ABC',
        senderPhone: '0912345678',
        senderAddress: 'Số 10 Tràng Thi, Hoàn Kiếm, Hà Nội',
        receiverName: 'Lê Khách Hàng',
        receiverPhone: '0987654321',
        receiverAddress: 'Số 25 Cầu Giấy',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        receiverWard: 'Dịch Vọng',
        weightGram: 1500,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        codAmount: 350000,
        shippingFee: 30000,
        paymentBy: PAYMENT_BY.RECEIVER,
      });

      assert.equal(valid.weightGram, 1500);
      assert.equal(valid.codAmount, 350000);
      assert.equal(valid.paymentBy, PAYMENT_BY.RECEIVER);
    });

    it('CreateOrderInputSchema: rejects invalid weight, negative COD or invalid phone', () => {
      // Negative weight
      assert.throws(() =>
        CreateOrderInputSchema.parse({
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'Hà Nội',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'Hà Nội',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: -50,
        })
      );

      // Negative COD
      assert.throws(() =>
        CreateOrderInputSchema.parse({
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'Hà Nội',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'Hà Nội',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          codAmount: -10000,
        })
      );
    });

    it('CancelOrderInputSchema: requires non-empty cancellation reason', () => {
      const valid = CancelOrderInputSchema.parse({
        id: 'order-123',
        reason: 'Khách hàng thay đổi ý định, yêu cầu hủy đơn',
      });
      assert.equal(valid.id, 'order-123');

      assert.throws(() =>
        CancelOrderInputSchema.parse({
          id: 'order-123',
          reason: '12', // Less than 3 chars
        })
      );
    });
  });

  describe('Shipment & Status Schemas (UC15 - UC20)', () => {
    it('CheckInHubInputSchema: validates inbound scanning input', () => {
      const valid = CheckInHubInputSchema.parse({
        trackingCode: 'TRK-20261029-ABC123',
        hubId: 'hub-01',
        actorId: 'staff-01',
        note: 'Hàng nguyên seal, không móp méo',
      });
      assert.equal(valid.trackingCode, 'TRK-20261029-ABC123');
    });

    it('AssignOrdersToShipperInputSchema: requires non-empty array of order IDs', () => {
      const valid = AssignOrdersToShipperInputSchema.parse({
        orderIds: ['ord-01', 'ord-02'],
        shipperId: 'ship-01',
        hubId: 'hub-01',
        actorId: 'mgr-01',
      });
      assert.equal(valid.orderIds.length, 2);

      // Fails when orderIds is empty
      assert.throws(() =>
        AssignOrdersToShipperInputSchema.parse({
          orderIds: [],
          shipperId: 'ship-01',
          hubId: 'hub-01',
          actorId: 'mgr-01',
        })
      );
    });

    it('MarkDeliveredInputSchema: validates POD URL, COD amount, and GPS coordinates', () => {
      const valid = MarkDeliveredInputSchema.parse({
        orderId: 'ord-01',
        shipperId: 'ship-01',
        proofImageUrl: 'https://r2.deliveryhub.vn/pod/20261029-01.jpg',
        codCollected: 250000,
        locationLat: 21.028511,
        locationLng: 105.854444,
        note: 'Người nhận trực tiếp ký nhận',
      });
      assert.equal(valid.codCollected, 250000);
      assert.equal(valid.proofImageUrl, 'https://r2.deliveryhub.vn/pod/20261029-01.jpg');

      // Rejects invalid URL
      assert.throws(() =>
        MarkDeliveredInputSchema.parse({
          orderId: 'ord-01',
          shipperId: 'ship-01',
          proofImageUrl: 'not-a-valid-url',
          codCollected: 0,
        })
      );
    });

    it('MarkFailedAttemptInputSchema: validates valid failure reason from domain enum', () => {
      const valid = MarkFailedAttemptInputSchema.parse({
        orderId: 'ord-01',
        shipperId: 'ship-01',
        failureReason: DELIVERY_FAILURE_REASON.CUSTOMER_UNREACHABLE,
        proofImageUrl: 'https://r2.deliveryhub.vn/pod/call-log-01.jpg',
        note: 'Gọi 3 cuộc chuông đổ không ai bắt máy',
      });
      assert.equal(valid.failureReason, DELIVERY_FAILURE_REASON.CUSTOMER_UNREACHABLE);

      // Rejects unlisted failure reason
      assert.throws(() =>
        MarkFailedAttemptInputSchema.parse({
          orderId: 'ord-01',
          shipperId: 'ship-01',
          failureReason: 'Lý do tự bịa' as any,
        })
      );
    });
  });

  describe('COD Settlement Schemas (UC22)', () => {
    it('CreateCODSettlementInputSchema: validates settlement creation', () => {
      const valid = CreateCODSettlementInputSchema.parse({
        hubId: 'hub-01',
        shipperId: 'ship-01',
        orderIds: ['ord-01', 'ord-02', 'ord-03'],
        notes: 'Tiền thu 3 đơn ca chiều',
      });
      assert.equal(valid.shipperId, 'ship-01');
      assert.equal(valid.orderIds.length, 3);
    });

    it('ReviewCODSettlementInputSchema: validates CONFIRM and REJECT decisions', () => {
      const approved = ReviewCODSettlementInputSchema.parse({
        settlementId: 'set-01',
        managerId: 'mgr-01',
        action: 'CONFIRM',
      });
      assert.equal(approved.action, 'CONFIRM');

      const rejected = ReviewCODSettlementInputSchema.parse({
        settlementId: 'set-01',
        managerId: 'mgr-01',
        action: 'REJECT',
        rejectionReason: 'Thiếu 50k tiền COD của đơn ord-03',
      });
      assert.equal(rejected.action, 'REJECT');

      // Fails when action is REJECT without rejectionReason
      assert.throws(() =>
        ReviewCODSettlementInputSchema.parse({
          settlementId: 'set-01',
          managerId: 'mgr-01',
          action: 'REJECT',
        })
      );
    });
  });

  describe('Public Tracking Schemas (UC23)', () => {
    it('PublicTrackingQuerySchema: accepts valid tracking codes and rejects invalid ones', () => {
      const valid = PublicTrackingQuerySchema.parse({
        trackingCode: 'TRK-20261029-A1B2C3',
      });
      assert.equal(valid.trackingCode, 'TRK-20261029-A1B2C3');

      // Rejects too short or invalid special characters
      assert.throws(() => PublicTrackingQuerySchema.parse({ trackingCode: '12' }));
      assert.throws(() => PublicTrackingQuerySchema.parse({ trackingCode: 'TRK@#$%^' }));
    });
  });

  describe('Result Pattern Helpers & Interfaces', () => {
    it('success() & failure(): construct correct tagged union results', () => {
      const okResult = success({ trackingCode: 'TRK-01' });
      assert.equal(okResult.success, true);
      assert.equal(isSuccess(okResult), true);
      assert.equal(isFailure(okResult), false);
      if (okResult.success) {
        assert.equal(okResult.data.trackingCode, 'TRK-01');
      }

      const failResult = failure('Đơn hàng không tồn tại', { orderId: ['Không tìm thấy ID'] });
      assert.equal(failResult.success, false);
      assert.equal(isSuccess(failResult), false);
      assert.equal(isFailure(failResult), true);
      if (!failResult.success) {
        assert.equal(failResult.error, 'Đơn hàng không tồn tại');
        assert.deepEqual(failResult.fieldErrors, { orderId: ['Không tìm thấy ID'] });
      }
    });
  });

  describe('Security Hardening & Penetration Testing Suite (SEC-01 - SEC-06)', () => {
    it('[SEC-02] ProofImageUrlSchema: rejects SSRF attacks and accepts whitelisted storage domains', () => {
      // Rejects AWS / Cloud metadata IP
      assert.throws(() => ProofImageUrlSchema.parse('http://169.254.169.254/latest/meta-data/'));

      // Rejects internal port scan
      assert.throws(() => ProofImageUrlSchema.parse('http://127.0.0.1:5432/evil.png'));

      // Rejects non-whitelisted external domain
      assert.throws(() => ProofImageUrlSchema.parse('https://attacker.com/logger.png'));

      // Rejects HTTP protocol on remote domain
      assert.throws(() => ProofImageUrlSchema.parse('http://r2.deliveryhub.vn/pod/img.jpg'));

      // Accepts HTTPS with whitelisted official domain
      const validR2 = ProofImageUrlSchema.parse('https://r2.deliveryhub.vn/pod/20261029-01.jpg');
      assert.equal(validR2, 'https://r2.deliveryhub.vn/pod/20261029-01.jpg');

      const validStorage = ProofImageUrlSchema.parse('https://storage.deliveryhub.vn/pod/signature.webp');
      assert.equal(validStorage, 'https://storage.deliveryhub.vn/pod/signature.webp');
    });

    it('[SEC-03] CreateOrderInputSchema: enforces COD max ceiling (50M VND) to prevent numeric overflow', () => {
      // Rejects > 50,000,000 VND
      assert.throws(() =>
        CreateOrderInputSchema.parse({
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'Số 10 Tràng Tiền',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'Số 20 Cầu Giấy',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          codAmount: 50000001, // 50M + 1 VND
        })
      );

      // Accepts valid COD amount <= 50,000,000 VND
      const valid = CreateOrderInputSchema.parse({
        senderName: 'Shop A',
        senderPhone: '0912345678',
        senderAddress: 'Số 10 Tràng Tiền',
        receiverName: 'Khách B',
        receiverPhone: '0987654321',
        receiverAddress: 'Số 20 Cầu Giấy',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        weightGram: 500,
        codAmount: 50000000,
      });
      assert.equal(valid.codAmount, 50000000);
    });

    it('[SEC-04] Batch Schemas: prevents Unbounded Array DoS attacks', () => {
      // 1. ImportOrdersInputSchema rejects arrays exceeding MAX_IMPORT_BATCH_SIZE (200)
      const validOrder = {
        senderName: 'Shop A',
        senderPhone: '0912345678',
        senderAddress: 'Số 10 Tràng Tiền',
        receiverName: 'Khách B',
        receiverPhone: '0987654321',
        receiverAddress: 'Số 20 Cầu Giấy',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        weightGram: 500,
      };

      const oversizedImport = Array.from({ length: DELIVERY_CONSTRAINTS.MAX_IMPORT_BATCH_SIZE + 1 }, () => validOrder);
      assert.throws(() => ImportOrdersInputSchema.parse({ orders: oversizedImport }));

      // 2. AssignOrdersToShipperInputSchema rejects orderIds array exceeding MAX_ASSIGN_BATCH_SIZE (100)
      const oversizedAssign = Array.from({ length: DELIVERY_CONSTRAINTS.MAX_ASSIGN_BATCH_SIZE + 1 }, (_, i) => `ord-${i}`);
      assert.throws(() =>
        AssignOrdersToShipperInputSchema.parse({
          orderIds: oversizedAssign,
          shipperId: 'ship-01',
          hubId: 'hub-01',
          actorId: 'mgr-01',
        })
      );

      // 3. CreateCODSettlementInputSchema rejects orderIds array exceeding MAX_SETTLEMENT_BATCH_SIZE (100)
      const oversizedSettlement = Array.from({ length: DELIVERY_CONSTRAINTS.MAX_SETTLEMENT_BATCH_SIZE + 1 }, (_, i) => `ord-${i}`);
      assert.throws(() =>
        CreateCODSettlementInputSchema.parse({
          hubId: 'hub-01',
          shipperId: 'ship-01',
          orderIds: oversizedSettlement,
        })
      );
    });

    it('[SEC-04] Pagination & Identifier: restricts search string and identifier lengths against DB DoS', () => {
      // Rejects search query longer than MAX_SEARCH_TERM_LENGTH (100 chars)
      const oversizedSearch = 'a'.repeat(DELIVERY_CONSTRAINTS.MAX_SEARCH_TERM_LENGTH + 1);
      assert.throws(() => PaginationQuerySchema.parse({ search: oversizedSearch }));

      // Accepts search query within limit
      const validSearch = PaginationQuerySchema.parse({ search: 'Hà Nội' });
      assert.equal(validSearch.search, 'Hà Nội');

      // Rejects invalid sortBy with SQL injection or dangerous characters
      assert.throws(() => PaginationQuerySchema.parse({ sortBy: 'id; DROP TABLE orders;--' }));

      // Rejects identifier longer than MAX_IDENTIFIER_LENGTH (50 chars)
      const oversizedId = 'x'.repeat(DELIVERY_CONSTRAINTS.MAX_IDENTIFIER_LENGTH + 1);
      assert.throws(() => GetOrderDetailQuerySchema.parse({ identifier: oversizedId }));
    });

    it('[SEC-06] Stored XSS: rejects HTML tags and script injections in free-text fields', () => {
      // 1. Rejects <script> tag in order notes
      assert.throws(() =>
        CreateOrderInputSchema.parse({
          senderName: 'Shop A',
          senderPhone: '0912345678',
          senderAddress: 'Số 10 Tràng Tiền',
          receiverName: 'Khách B',
          receiverPhone: '0987654321',
          receiverAddress: 'Số 20 Cầu Giấy',
          receiverProvince: 'Hà Nội',
          receiverDistrict: 'Cầu Giấy',
          weightGram: 500,
          notes: '<script>alert(document.cookie)</script>',
        })
      );

      // 2. Rejects <img> onerror tag in cancel reason
      assert.throws(() =>
        CancelOrderInputSchema.parse({
          id: 'ord-01',
          reason: '<img src=x onerror=alert(1)>',
        })
      );

      // 3. Rejects HTML tags in COD rejection reason
      assert.throws(() =>
        ReviewCODSettlementInputSchema.parse({
          settlementId: 'set-01',
          managerId: 'mgr-01',
          action: 'REJECT',
          rejectionReason: '<b>Sai lệch tiền</b><script>',
        })
      );
    });
  });
});
