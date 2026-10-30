/**
 * @file zones.mock.ts
 * @description Dữ liệu mẫu giả lập cho Tuyến giao hàng và Phân công Shipper phục vụ E2E test.
 * @module tests/mock-data
 */

export interface MockDeliveryZoneData {
  code: string;
  name: string;
  district: string;
  ward: string;
  description: string;
  hubCode: string;
}

export interface MockShipperZoneAssignment {
  shipperUsername: string;
  zoneCode: string;
  status: string;
}

export const MOCK_ZONES: MockDeliveryZoneData[] = [
  {
    code: 'MOCK-ZONE-HN-01',
    name: 'Tuyến Mock Dịch Vọng Hậu',
    district: 'Cầu Giấy',
    ward: 'Dịch Vọng Hậu',
    description: 'Địa bàn Duy Tân, Xuân Thủy, Trần Thái Tông',
    hubCode: 'MOCK-HUB-HN-01',
  },
  {
    code: 'MOCK-ZONE-HN-02',
    name: 'Tuyến Mock Mai Dịch',
    district: 'Cầu Giấy',
    ward: 'Mai Dịch',
    description: 'Địa bàn Hồ Tùng Mậu, Doãn Kế Thiện',
    hubCode: 'MOCK-HUB-HN-01',
  },
];

export const MOCK_SHIPPER_ZONE_ASSIGNMENTS: MockShipperZoneAssignment[] = [
  {
    shipperUsername: 'mock_shipper1',
    zoneCode: 'MOCK-ZONE-HN-01',
    status: 'ACTIVE',
  },
  {
    shipperUsername: 'mock_shipper2',
    zoneCode: 'MOCK-ZONE-HN-02',
    status: 'ACTIVE',
  },
];

