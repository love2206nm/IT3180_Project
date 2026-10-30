/**
 * @file auth_use_cases.test.ts
 * @description Unit Tests cho các Use Cases Xác thực & Tài khoản (UC01 - UC03).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  LoginUserUseCase,
  ChangePasswordUseCase,
  UpdateProfileUseCase,
  GetProfileUseCase,
} from '../../src/application/use-cases/auth';
import { resetLoginLockoutCache } from '../../src/application/use-cases/auth/login.use-case';
import type { SecurityContext } from '../../src/application/interfaces/security-context.interface';
import {
  InMemoryUserRepository,
  MockPasswordHasherService,
  MockAuthTokenService,
} from './mocks/in-memory-repositories';
import { User } from '../../src/domain/entities/user.entity';
import { PhoneNumber } from '../../src/domain/value-objects/phone-number.vo';
import { USER_ROLE } from '../../src/domain/constants/roles.constant';
import { USER_STATUS } from '../../src/domain/constants/user-status.constant';

describe('Application Layer: Auth Use Cases (UC01 - UC03)', () => {
  let userRepo: InMemoryUserRepository;
  let passwordHasher: MockPasswordHasherService;
  let authTokenService: MockAuthTokenService;

  const mockShipperContext: SecurityContext = {
    userId: 'usr-01',
    username: 'shipper01',
    role: USER_ROLE.SHIPPER,
    hubId: 'hub-01',
  };

  const mockAdminContext: SecurityContext = {
    userId: 'usr-admin',
    username: 'admin',
    role: USER_ROLE.ADMIN,
    hubId: null,
  };

  beforeEach(async () => {
    resetLoginLockoutCache();
    userRepo = new InMemoryUserRepository();
    passwordHasher = new MockPasswordHasherService();
    authTokenService = new MockAuthTokenService();

    // Tạo sẵn 1 user active và 1 user locked
    const activeUser = new User({
      id: 'usr-01',
      username: 'shipper01',
      passwordHash: 'hashed_Password@123',
      fullName: 'Nguyễn Văn Giao',
      email: 'shipper01@delivery.vn',
      phone: PhoneNumber.create('0912345678'),
      role: USER_ROLE.SHIPPER,
      status: USER_STATUS.ACTIVE,
      hubId: 'hub-01',
    });
    await userRepo.save(activeUser);

    const lockedUser = new User({
      id: 'usr-02',
      username: 'locked_user',
      passwordHash: 'hashed_Password@123',
      fullName: 'Trần Bị Khóa',
      email: 'locked@delivery.vn',
      phone: PhoneNumber.create('0987654321'),
      role: USER_ROLE.HUB_STAFF,
      status: USER_STATUS.LOCKED,
      hubId: 'hub-01',
    });
    await userRepo.save(lockedUser);
  });

  describe('UC01: LoginUserUseCase', () => {
    it('successfully logs in with valid username and password', async () => {
      const useCase = new LoginUserUseCase(userRepo, passwordHasher, authTokenService);
      const res = await useCase.execute({
        usernameOrEmail: 'shipper01',
        password: 'Password@123',
      });

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.user.username, 'shipper01');
        assert.equal(res.data.user.role, USER_ROLE.SHIPPER);
        assert.ok(res.data.token);
      }
    });

    it('successfully logs in with email', async () => {
      const useCase = new LoginUserUseCase(userRepo, passwordHasher, authTokenService);
      const res = await useCase.execute({
        usernameOrEmail: 'shipper01@delivery.vn',
        password: 'Password@123',
      });

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.user.email, 'shipper01@delivery.vn');
      }
    });

    it('rejects with incorrect password', async () => {
      const useCase = new LoginUserUseCase(userRepo, passwordHasher, authTokenService);
      const res = await useCase.execute({
        usernameOrEmail: 'shipper01',
        password: 'WrongPassword',
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Tên đăng nhập hoặc mật khẩu không chính xác/);
      }
    });

    it('rejects locked user account', async () => {
      const useCase = new LoginUserUseCase(userRepo, passwordHasher, authTokenService);
      const res = await useCase.execute({
        usernameOrEmail: 'locked_user',
        password: 'Password@123',
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Tài khoản của bạn đã bị khóa/);
      }
    });

    it('[SEC-P01] temporarily locks account after 5 consecutive failed login attempts (Brute Force Defense)', async () => {
      const useCase = new LoginUserUseCase(userRepo, passwordHasher, authTokenService);

      // Thử sai 4 lần đầu
      for (let i = 0; i < 4; i++) {
        const res = await useCase.execute({
          usernameOrEmail: 'shipper01',
          password: `WrongPassword_${i}`,
        });
        assert.equal(res.success, false);
        if (!res.success) {
          assert.match(res.error, /Tên đăng nhập hoặc mật khẩu không chính xác/);
        }
      }

      // Lần thứ 5 sai -> Kích hoạt tạm khóa 15 phút
      const res5 = await useCase.execute({
        usernameOrEmail: 'shipper01',
        password: 'WrongPassword_5',
      });
      assert.equal(res5.success, false);
      if (!res5.success) {
        assert.match(res5.error, /Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần/);
      }

      // Thử lại lần thứ 6 dù gõ đúng pass cũng bị chặn vì đang trong thời gian lockout
      const res6 = await useCase.execute({
        usernameOrEmail: 'shipper01',
        password: 'Password@123',
      });
      assert.equal(res6.success, false);
      if (!res6.success) {
        assert.match(res6.error, /Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần/);
      }
    });
  });

  describe('UC02: ChangePasswordUseCase', () => {
    it('successfully changes password with correct current password', async () => {
      const useCase = new ChangePasswordUseCase(userRepo, passwordHasher);
      const res = await useCase.execute(
        {
          currentPassword: 'Password@123',
          newPassword: 'NewPassword@456',
          confirmPassword: 'NewPassword@456',
        },
        mockShipperContext
      );

      assert.equal(res.success, true);
      const user = await userRepo.findById('usr-01');
      assert.equal(user?.getPasswordHash(), 'hashed_NewPassword@456');
    });

    it('rejects if current password is wrong', async () => {
      const useCase = new ChangePasswordUseCase(userRepo, passwordHasher);
      const res = await useCase.execute(
        {
          currentPassword: 'WrongOldPassword',
          newPassword: 'NewPassword@456',
          confirmPassword: 'NewPassword@456',
        },
        mockShipperContext
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Mật khẩu hiện tại không chính xác/);
      }
    });

    it('[SEC-P02] rejects change password when securityContext is missing (Fail-Closed)', async () => {
      const useCase = new ChangePasswordUseCase(userRepo, passwordHasher);
      const res = await useCase.execute({
        currentPassword: 'Password@123',
        newPassword: 'NewPassword@456',
        confirmPassword: 'NewPassword@456',
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Yêu cầu không được xác thực/);
      }
    });
  });

  describe('UC03: UpdateProfileUseCase & GetProfileUseCase', () => {
    it('successfully updates fullName and phone', async () => {
      const useCase = new UpdateProfileUseCase(userRepo);
      const res = await useCase.execute(
        {
          fullName: 'Nguyễn Văn Giao Mới',
          phone: '0933333333',
        },
        mockShipperContext
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.fullName, 'Nguyễn Văn Giao Mới');
        assert.equal(res.data.phone, '0933333333');
      }
    });

    it('rejects if new phone already belongs to another user', async () => {
      const useCase = new UpdateProfileUseCase(userRepo);
      const res = await useCase.execute(
        {
          fullName: 'Nguyễn Văn Giao',
          phone: '0987654321', // Đã thuộc về usr-02
        },
        mockShipperContext
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Số điện thoại này đã được sử dụng/);
      }
    });

    it('[SEC-P03] rejects update profile without securityContext (Fail-Closed)', async () => {
      const useCase = new UpdateProfileUseCase(userRepo);
      const res = await useCase.execute({
        fullName: 'Hacker Name',
        phone: '0933333333',
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Yêu cầu không được xác thực/);
      }
    });

    it('gets profile info correctly for authenticated user', async () => {
      const getProfile = new GetProfileUseCase(userRepo);
      const res = await getProfile.execute({}, mockShipperContext);

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.username, 'shipper01');
      }
    });

    it('[SEC-P04] non-admin is prevented from getting another user profile (Anti-IDOR)', async () => {
      const getProfile = new GetProfileUseCase(userRepo);
      const res = await getProfile.execute({ userId: 'usr-02' }, mockShipperContext);

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Bạn chỉ có quyền xem thông tin cá nhân của chính mình/);
      }
    });

    it('allows Admin to view another user profile', async () => {
      const getProfile = new GetProfileUseCase(userRepo);
      const res = await getProfile.execute({ userId: 'usr-01' }, mockAdminContext);

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.username, 'shipper01');
      }
    });
  });
});
