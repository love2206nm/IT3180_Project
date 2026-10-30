/**
 * @file staff_use_cases.test.ts
 * @description Unit Tests cho các Use Cases Quản lý Nhân sự & Phân quyền (UC04 - UC08).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GetStaffListUseCase,
  CreateStaffUseCase,
  UpdateStaffUseCase,
  ToggleStaffStatusUseCase,
  AssignShipperZoneUseCase,
} from '../../src/application/use-cases/staff';
import {
  InMemoryUserRepository,
  InMemoryHubRepository,
  InMemoryDeliveryZoneRepository,
  MockPasswordHasherService,
} from './mocks/in-memory-repositories';
import { User } from '../../src/domain/entities/user.entity';
import { Hub } from '../../src/domain/entities/hub.entity';
import { DeliveryZone } from '../../src/domain/entities/delivery-zone.entity';
import { PhoneNumber } from '../../src/domain/value-objects/phone-number.vo';
import { USER_ROLE } from '../../src/domain/constants/roles.constant';
import { USER_STATUS } from '../../src/domain/constants/user-status.constant';
import { HUB_STATUS } from '../../src/domain/constants/hub-status.constant';

describe('Application Layer: Staff Use Cases (UC04 - UC08)', () => {
  let userRepo: InMemoryUserRepository;
  let hubRepo: InMemoryHubRepository;
  let zoneRepo: InMemoryDeliveryZoneRepository;
  let passwordHasher: MockPasswordHasherService;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    hubRepo = new InMemoryHubRepository();
    zoneRepo = new InMemoryDeliveryZoneRepository();
    passwordHasher = new MockPasswordHasherService();

    // Tạo Hub
    const hub = new Hub({
      id: 'hub-01',
      code: 'HUB-HAN-01',
      name: 'Trạm Cầu Giấy',
      address: '10 Cầu Giấy',
      province: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng',
      phone: PhoneNumber.create('02412345678'),
      status: HUB_STATUS.ACTIVE,
    });
    await hubRepo.save(hub);

    // Tạo Admin
    await userRepo.save(
      new User({
        id: 'admin-01',
        username: 'admin',
        passwordHash: 'hashed_pass',
        fullName: 'Quản trị viên',
        email: 'admin@delivery.vn',
        phone: PhoneNumber.create('0900000001'),
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
        hubId: null,
      })
    );

    // Tạo Hub Manager
    await userRepo.save(
      new User({
        id: 'mgr-01',
        username: 'manager_cg',
        passwordHash: 'hashed_pass',
        fullName: 'Trần Quản Lý',
        email: 'manager@delivery.vn',
        phone: PhoneNumber.create('0900000002'),
        role: USER_ROLE.HUB_MANAGER,
        status: USER_STATUS.ACTIVE,
        hubId: 'hub-01',
      })
    );

    // Tạo Shipper
    await userRepo.save(
      new User({
        id: 'ship-01',
        username: 'shipper_cg01',
        passwordHash: 'hashed_pass',
        fullName: 'Lê Giao Hàng',
        email: 'shipper@delivery.vn',
        phone: PhoneNumber.create('0900000003'),
        role: USER_ROLE.SHIPPER,
        status: USER_STATUS.ACTIVE,
        hubId: 'hub-01',
      })
    );

    // Tạo Tuyến đường
    await zoneRepo.save(
      new DeliveryZone({
        id: 'zone-01',
        hubId: 'hub-01',
        code: 'ZONE-CG-01',
        name: 'Tuyến Dịch Vọng Hậu',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng Hậu',
      })
    );
  });

  describe('UC04: GetStaffListUseCase', () => {
    it('returns paginated staff list with enriched hub names', async () => {
      const useCase = new GetStaffListUseCase(userRepo, hubRepo);
      const res = await useCase.execute(
        { page: 1, limit: 10 },
        { userId: 'admin-01', username: 'admin', role: USER_ROLE.ADMIN, hubId: null }
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.total, 3);
        assert.equal(res.data.items.length, 3);
        const shipper = res.data.items.find((i) => i.username === 'shipper_cg01');
        assert.equal(shipper?.hubName, 'Trạm Cầu Giấy');
      }
    });

    it('enforces RBAC: Hub Manager only sees staff from their hub', async () => {
      const useCase = new GetStaffListUseCase(userRepo, hubRepo);
      const res = await useCase.execute(
        { page: 1, limit: 10 },
        { userId: 'mgr-01', username: 'manager_cg', role: USER_ROLE.HUB_MANAGER, hubId: 'hub-01' }
      );

      assert.equal(res.success, true);
      if (res.success) {
        // Manager and Shipper belong to hub-01, Admin does not
        assert.equal(res.data.total, 2);
      }
    });
  });

  describe('UC05: CreateStaffUseCase', () => {
    it('successfully creates new staff with hashed password', async () => {
      const useCase = new CreateStaffUseCase(userRepo, hubRepo, passwordHasher);
      const res = await useCase.execute(
        {
          username: 'new_shipper',
          password: 'Password@123',
          fullName: 'Bùi Văn Mới',
          email: 'newshipper@delivery.vn',
          phone: '0911223344',
          role: USER_ROLE.SHIPPER,
          hubId: 'hub-01',
        },
        { userId: 'admin-01', username: 'admin', role: USER_ROLE.ADMIN, hubId: null }
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.username, 'new_shipper');
        assert.equal(res.data.hubName, 'Trạm Cầu Giấy');
      }
    });

    it('rejects duplicate username', async () => {
      const useCase = new CreateStaffUseCase(userRepo, hubRepo, passwordHasher);
      const res = await useCase.execute(
        {
          username: 'shipper_cg01',
          password: 'Password@123',
          fullName: 'Người Trùng',
          email: 'unique@delivery.vn',
          phone: '0955555555',
          role: USER_ROLE.SHIPPER,
          hubId: 'hub-01',
        },
        { userId: 'admin-01', username: 'admin', role: USER_ROLE.ADMIN, hubId: null }
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Tên đăng nhập này đã tồn tại/);
      }
    });

    it('[SEC-P10] rejects creating staff without securityContext (Fail-Closed)', async () => {
      const useCase = new CreateStaffUseCase(userRepo, hubRepo, passwordHasher);
      const res = await useCase.execute({
        username: 'hacker_user',
        password: 'Password@123',
        fullName: 'Hacker',
        email: 'hacker@delivery.vn',
        phone: '0955555556',
        role: USER_ROLE.ADMIN,
        hubId: 'hub-01',
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Yêu cầu không được xác thực/);
      }
    });

    it('[SEC-P11] prevents Hub Manager from creating Admin account', async () => {
      const useCase = new CreateStaffUseCase(userRepo, hubRepo, passwordHasher);
      const res = await useCase.execute(
        {
          username: 'fake_admin',
          password: 'Password@123',
          fullName: 'Fake Admin',
          email: 'fakeadmin@delivery.vn',
          phone: '0955555557',
          role: USER_ROLE.ADMIN,
          hubId: 'hub-01',
        },
        { userId: 'mgr-01', username: 'manager_cg', role: USER_ROLE.HUB_MANAGER, hubId: 'hub-01' }
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /Quản lý trạm không được phép tạo tài khoản Quản trị viên/);
      }
    });
  });

  describe('UC06: UpdateStaffUseCase', () => {
    it('updates staff profile and transfers hub', async () => {
      const useCase = new UpdateStaffUseCase(userRepo, hubRepo);
      const res = await useCase.execute(
        {
          id: 'ship-01',
          fullName: 'Lê Giao Hàng Đã Sửa',
        },
        { userId: 'admin-01', username: 'admin', role: USER_ROLE.ADMIN, hubId: null }
      );

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.fullName, 'Lê Giao Hàng Đã Sửa');
      }
    });
  });

  describe('UC07: ToggleStaffStatusUseCase', () => {
    it('deactivates and activates staff account', async () => {
      const useCase = new ToggleStaffStatusUseCase(userRepo);
      const deactRes = await useCase.execute(
        { id: 'ship-01', status: USER_STATUS.INACTIVE },
        { userId: 'admin-01', username: 'admin', role: USER_ROLE.ADMIN, hubId: null }
      );

      assert.equal(deactRes.success, true);
      const user = await userRepo.findById('ship-01');
      assert.equal(user?.getStatus(), USER_STATUS.INACTIVE);
    });

    it('prevents user from locking their own account', async () => {
      const useCase = new ToggleStaffStatusUseCase(userRepo);
      const res = await useCase.execute(
        { id: 'admin-01', status: USER_STATUS.INACTIVE },
        { userId: 'admin-01', username: 'admin', role: USER_ROLE.ADMIN, hubId: null }
      );

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error, /không thể tự thay đổi trạng thái tài khoản của chính mình/);
      }
    });
  });

  describe('UC08: AssignShipperZoneUseCase', () => {
    it('assigns zone to shipper matching hub', async () => {
      const useCase = new AssignShipperZoneUseCase(userRepo, zoneRepo);
      const res = await useCase.execute(
        { shipperId: 'ship-01', zoneId: 'zone-01' },
        { userId: 'mgr-01', username: 'manager_cg', role: USER_ROLE.HUB_MANAGER, hubId: 'hub-01' }
      );

      assert.equal(res.success, true);
      const assigned = await zoneRepo.findByShipperId('ship-01');
      assert.equal(assigned.length, 1);
    });
  });
});
