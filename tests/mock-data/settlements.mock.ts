/**
 * @file settlements.mock.ts
 * @description Dữ liệu mẫu giả lập cho Phiên đối soát COD (UC22).
 * @module tests/mock-data
 */

import { CODSettlementStatus } from '@prisma/client';

export interface MockSettlementData {
  settlementCode: string;
  hubCode: string;
  shipperUsername: string;
  managerUsername: string | null;
  totalCodAmount: number;
  totalOrdersCount: number;
  status: CODSettlementStatus;
  notes: string;
  orderTrackingCodes: string[];
}

export const MOCK_SETTLEMENTS: MockSettlementData[] = [
  {
    settlementCode: 'MOCK-COD-20261029-01',
    hubCode: 'MOCK-HUB-HN-01',
    shipperUsername: 'mock_shipper1',
    managerUsername: 'mock_manager',
    totalCodAmount: 300000,
    totalOrdersCount: 1,
    status: CODSettlementStatus.CONFIRMED,
    notes: 'Phiên nộp COD mock ca sáng',
    orderTrackingCodes: ['MOCK-TRK-DELIVERED-01'],
  },
];

