/**
 * @file hubs.mock.ts
 * @description Dữ liệu mẫu giả lập cho Trạm Giao Nhận (Hubs) phục vụ kiểm thử E2E.
 * Mang tiền tố 'MOCK-' để phân biệt và dọn dẹp an toàn.
 * @module tests/mock-data
 */

import { HubStatus } from '@prisma/client';

export interface MockHubData {
  code: string;
  name: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  phone: string;
  status: HubStatus;
}

export const MOCK_HUBS: MockHubData[] = [
  {
    code: 'MOCK-HUB-HN-01',
    name: 'Trạm Giao Nhận Mock Cầu Giấy - Hà Nội',
    address: 'Số 199 Xuân Thủy, Phường Dịch Vọng Hậu',
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    ward: 'Dịch Vọng Hậu',
    phone: '02439998888',
    status: HubStatus.ACTIVE,
  },
  {
    code: 'MOCK-HUB-DN-01',
    name: 'Trạm Giao Nhận Mock Hải Châu - Đà Nẵng',
    address: 'Số 88 Bạch Đằng, Phường Hải Châu 1',
    province: 'Đà Nẵng',
    district: 'Hải Châu',
    ward: 'Hải Châu 1',
    phone: '02363888999',
    status: HubStatus.ACTIVE,
  },
];

