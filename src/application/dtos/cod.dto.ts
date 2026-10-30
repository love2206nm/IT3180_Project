/**
 * @file cod.dto.ts
 * @description Zod Schemas và DTOs phục vụ phân hệ Báo cáo & Quản lý Đối soát Tiền thu hộ COD (UC21, UC22).
 * @module application/dtos
 */

import { z } from 'zod';
import { COD_SETTLEMENT_STATUS, type CODSettlementStatus } from '../../domain/constants/cod-status.constant';
import type { OrderStatus } from '../../domain/constants/order-status.constant';
import { DELIVERY_CONSTRAINTS } from '../../domain/constants/delivery-constraints.constant';
import { createSafeTextSchema } from './common-validators';

// =============================================================================
// UC21: BÁO CÁO & THỐNG KÊ HIỆU SUẤT TRẠM
// =============================================================================

export const GetHubStatisticsQuerySchema = z.object({
  hubId: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type GetHubStatisticsQueryDTO = z.infer<typeof GetHubStatisticsQuerySchema>;

export interface ShipperPerformanceDTO {
  shipperId: string;
  shipperName: string;
  totalAssigned: number;
  totalDelivered: number;
  totalFailed: number;
  successRate: number; // Tỷ lệ thành công (%)
  totalCodCollected: number;
}

export interface HubStatisticsOutputDTO {
  totalOrders: number;
  statusBreakdown: Record<OrderStatus, number>;
  totalCodExpected: number;
  totalCodCollected: number;
  shipperPerformance: ShipperPerformanceDTO[];
}

// =============================================================================
// UC22: TẠO PHIÊN NỘP TIỀN COD (SHIPPER BÀN GIAO TIỀN CUỐI CA)
// =============================================================================

export const CreateCODSettlementInputSchema = z.object({
  hubId: z.string().trim().min(1, 'ID trạm không được để trống'),
  /** ID Shipper (Tùy chọn, Use Case sẽ luôn ưu tiên lấy từ SecurityContext) */
  shipperId: z.string().trim().min(1, 'ID Shipper không được để trống').optional(),
  orderIds: z
    .array(z.string().trim().min(1))
    .min(1, 'Phải chọn ít nhất 1 đơn hàng đã thu tiền để nộp')
    .max(
      DELIVERY_CONSTRAINTS.MAX_SETTLEMENT_BATCH_SIZE,
      `Chỉ được nộp tối đa ${DELIVERY_CONSTRAINTS.MAX_SETTLEMENT_BATCH_SIZE} đơn trong một phiên`
    ),
  notes: createSafeTextSchema(0, 300, 'Ghi chú').optional(),
});

export type CreateCODSettlementInputDTO = z.infer<typeof CreateCODSettlementInputSchema>;

// =============================================================================
// UC22: DUYỆT / TỪ CHỐI PHIÊN ĐỐI SOÁT COD (QUẢN LÝ TRẠM)
// =============================================================================

export const ReviewCODSettlementInputSchema = z
  .object({
    settlementId: z.string().trim().min(1, 'ID phiên đối soát không được để trống'),
    /** ID Quản lý duyệt (Tùy chọn, Use Case sẽ luôn ưu tiên lấy từ SecurityContext) */
    managerId: z.string().trim().min(1, 'ID Quản lý xác nhận không được để trống').optional(),
    action: z.enum(['CONFIRM', 'REJECT']),
    rejectionReason: createSafeTextSchema(0, 300, 'Lý do từ chối').optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'REJECT' && (!data.rejectionReason || data.rejectionReason.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Bắt buộc phải nhập lý do khi từ chối nhận tiền đối soát',
      path: ['rejectionReason'],
    }
  );

export type ReviewCODSettlementInputDTO = z.infer<typeof ReviewCODSettlementInputSchema>;

export interface CODSettlementDetailDTO {
  id: string;
  orderId: string;
  trackingCode: string;
  codCollected: number;
}

export interface CODSettlementDTO {
  id: string;
  settlementCode: string;
  hubId: string;
  hubName?: string;
  shipperId: string;
  shipperName?: string;
  managerId: string | null;
  managerName?: string | null;
  totalCodAmount: number;
  totalOrdersCount: number;
  status: CODSettlementStatus;
  notes: string | null;
  settledAt: Date | null;
  createdAt: Date;
  details: CODSettlementDetailDTO[];
}
