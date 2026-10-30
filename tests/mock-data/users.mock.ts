/**
 * @file users.mock.ts
 * @description Dữ liệu mẫu giả lập cho Tài khoản & Nhân sự (Users) phục vụ kiểm thử E2E.
 * Mang tiền tố 'mock_' để dọn dẹp an toàn.
 * @module tests/mock-data
 */

import { UserRole, UserStatus } from '@prisma/client';

export interface MockUserData {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  hubCode: string | null;
}

export const MOCK_USERS: MockUserData[] = [
  {
    username: 'mock_admin',
    fullName: 'Quản Trị Viên Mock (Admin)',
    email: 'mock.admin@deliveryhub.vn',
    phone: '0911000001',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    hubCode: null,
  },
  {
    username: 'mock_manager',
    fullName: 'Nguyễn Văn Quản Lý Mock (Manager)',
    email: 'mock.manager@deliveryhub.vn',
    phone: '0911000002',
    role: UserRole.HUB_MANAGER,
    status: UserStatus.ACTIVE,
    hubCode: 'MOCK-HUB-HN-01',
  },
  {
    username: 'mock_staff',
    fullName: 'Lê Thị Điều Phối Mock (Staff)',
    email: 'mock.staff@deliveryhub.vn',
    phone: '0911000003',
    role: UserRole.HUB_STAFF,
    status: UserStatus.ACTIVE,
    hubCode: 'MOCK-HUB-HN-01',
  },
  {
    username: 'mock_shipper1',
    fullName: 'Trần Văn Giao Hàng Mock (Shipper 1)',
    email: 'mock.shipper1@deliveryhub.vn',
    phone: '0911000004',
    role: UserRole.SHIPPER,
    status: UserStatus.ACTIVE,
    hubCode: 'MOCK-HUB-HN-01',
  },
  {
    username: 'mock_shipper2',
    fullName: 'Phạm Văn Vận Chuyển Mock (Shipper 2)',
    email: 'mock.shipper2@deliveryhub.vn',
    phone: '0911000005',
    role: UserRole.SHIPPER,
    status: UserStatus.ACTIVE,
    hubCode: 'MOCK-HUB-HN-01',
  },
];

