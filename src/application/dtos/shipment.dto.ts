/**
 * @file shipment.dto.ts
 * @description Zod Schemas và DTOs phục vụ phân hệ Quản lý Trạng thái Vận chuyển & Điều phối
 * (UC15, UC16, UC17, UC18, UC19, UC20).
 * @module application/dtos
 */

import { z } from 'zod';
import { DELIVERY_FAILURE_REASON, type DeliveryFailureReason } from '../../domain/constants/failure-reasons.constant';
import { DELIVERY_CONSTRAINTS } from '../../domain/constants/delivery-constraints.constant';
import { ProofImageUrlSchema, createSafeTextSchema } from './common-validators';

// =============================================================================
// UC15: QUÉT MÃ CHECK-IN NHẬP TRẠM (INBOUND SCAN)
// =============================================================================

export const CheckInHubInputSchema = z.object({
  /** Mã vận đơn quét từ Barcode Scanner hoặc nhập tay */
  trackingCode: z.string().trim().min(8, 'Mã vận đơn phải từ 8 ký tự').max(30),

  /** ID trạm giao nhận tiếp nhận */
  hubId: z.string().trim().min(1, 'ID trạm không được để trống'),

  /** ID nhân viên kho quét mã (Tùy chọn, Use Case sẽ luôn ưu tiên lấy từ SecurityContext) */
  actorId: z.string().trim().min(1, 'ID nhân viên không được để trống').optional(),

  note: createSafeTextSchema(0, 300, 'Ghi chú').optional(),
});

export type CheckInHubInputDTO = z.infer<typeof CheckInHubInputSchema>;

// =============================================================================
// UC16: ĐIỀU PHỐI & GÁN ĐƠN HÀNG CHO SHIPPER
// =============================================================================

export const AssignOrdersToShipperInputSchema = z.object({
  /** Danh sách ID các đơn hàng cần gán (chống Database IN query DoS) */
  orderIds: z
    .array(z.string().trim().min(1))
    .min(1, 'Phải chọn ít nhất 1 đơn hàng để gán')
    .max(
      DELIVERY_CONSTRAINTS.MAX_ASSIGN_BATCH_SIZE,
      `Chỉ được gán tối đa ${DELIVERY_CONSTRAINTS.MAX_ASSIGN_BATCH_SIZE} đơn mỗi lần`
    ),

  /** ID Shipper nhận phân công */
  shipperId: z.string().trim().min(1, 'Vui lòng chọn Shipper'),

  /** ID trạm thực hiện điều phối */
  hubId: z.string().trim().min(1, 'ID trạm không được để trống'),

  /** ID nhân viên điều phối (Tùy chọn, Use Case sẽ luôn ưu tiên lấy từ SecurityContext) */
  actorId: z.string().trim().min(1, 'ID người điều phối không được để trống').optional(),
});

export type AssignOrdersToShipperInputDTO = z.infer<typeof AssignOrdersToShipperInputSchema>;

export interface AssignOrdersResultDTO {
  totalRequested: number;
  assignedCount: number;
  failedCount: number;
  assignedOrderIds: string[];
  errors: {
    orderId: string;
    reason: string;
  }[];
}

// =============================================================================
// UC17 & UC18: XÁC NHẬN GIAO HÀNG THÀNH CÔNG (POD & THU TIỀN COD)
// =============================================================================

export const MarkDeliveredInputSchema = z.object({
  orderId: z.string().trim().min(1, 'ID đơn hàng không được để trống'),
  shipperId: z.string().trim().min(1, 'ID Shipper không được để trống').optional(),

  /**
   * Đường dẫn URL ảnh bằng chứng giao hàng (POD) đã upload lên Cloudflare R2 / S3 Storage.
   * Chống SSRF và chỉ chấp nhận giao thức HTTPS từ storage chính thức.
   */
  proofImageUrl: ProofImageUrlSchema.optional(),

  /** Số tiền COD thực tế Shipper đã thu từ người nhận (VNĐ) */
  codCollected: z
    .number()
    .min(0, 'Số tiền COD không được âm')
    .max(
      DELIVERY_CONSTRAINTS.MAX_COD_AMOUNT_VND,
      `Số tiền COD không vượt quá ${DELIVERY_CONSTRAINTS.MAX_COD_AMOUNT_VND.toLocaleString('vi-VN')} VNĐ`
    )
    .default(0),

  /** Tọa độ GPS thời điểm giao hàng */
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),

  note: createSafeTextSchema(0, 300, 'Ghi chú').optional(),
});

export type MarkDeliveredInputDTO = z.infer<typeof MarkDeliveredInputSchema>;

// =============================================================================
// UC19: BÁO GIAO HÀNG THẤT BẠI & TÁI GIAO
// =============================================================================

export const MarkFailedAttemptInputSchema = z.object({
  orderId: z.string().trim().min(1, 'ID đơn hàng không được để trống'),
  shipperId: z.string().trim().min(1, 'ID Shipper không được để trống').optional(),

  /** Lý do giao thất bại thuộc danh mục chuẩn */
  failureReason: z.nativeEnum(DELIVERY_FAILURE_REASON),

  /** Ảnh bằng chứng (chụp nhật ký cuộc gọi hoặc địa chỉ đóng cửa, chống SSRF) */
  proofImageUrl: ProofImageUrlSchema.optional(),

  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),

  note: createSafeTextSchema(0, 300, 'Ghi chú').optional(),
});

export type MarkFailedAttemptInputDTO = z.infer<typeof MarkFailedAttemptInputSchema>;

// =============================================================================
// UC20: XUẤT TRẠM CHUYỂN HOÀN VỀ NGƯỜI GỬI / KHO GỐC
// =============================================================================

export const ProcessReturnOrderInputSchema = z.object({
  orderId: z.string().trim().min(1, 'ID đơn hàng không được để trống'),
  hubId: z.string().trim().min(1, 'ID trạm không được để trống'),
  actorId: z.string().trim().min(1, 'ID nhân sự xử lý không được để trống').optional(),
  note: createSafeTextSchema(0, 300, 'Ghi chú').optional(),
});

export type ProcessReturnOrderInputDTO = z.infer<typeof ProcessReturnOrderInputSchema>;
