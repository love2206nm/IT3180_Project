/**
 * @file order.dto.ts
 * @description Zod Schemas và DTOs phục vụ phân hệ Quản lý Đơn hàng (CRUD Đơn hàng - UC09, UC10, UC11, UC12, UC13, UC14).
 * @module application/dtos
 */

import { z } from 'zod';
import { ORDER_STATUS, type OrderStatus } from '../../domain/constants/order-status.constant';
import { PAYMENT_BY, PAYMENT_STATUS, type PaymentBy, type PaymentStatus } from '../../domain/constants/payment.constant';
import { DELIVERY_CONSTRAINTS } from '../../domain/constants/delivery-constraints.constant';
import { PaginationQuerySchema, type PaginatedResultDTO } from './pagination.dto';
import { createSafeTextSchema } from './common-validators';

// =============================================================================
// UC09: TIẾP NHẬN / TẠO MỚI ĐƠN HÀNG TẠI TRẠM
// =============================================================================

export const CreateOrderInputSchema = z.object({
  /** Trạm tiếp nhận đơn hàng (nếu tạo tại bưu cục) */
  currentHubId: z.string().trim().nullable().optional(),

  // Thông tin người gửi
  senderName: createSafeTextSchema(2, 100, 'Tên người gửi'),
  senderPhone: z
    .string()
    .trim()
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại người gửi không hợp lệ (10 số di động VN)'),
  senderAddress: createSafeTextSchema(5, 255, 'Địa chỉ người gửi'),

  // Thông tin người nhận
  receiverName: createSafeTextSchema(2, 100, 'Tên người nhận'),
  receiverPhone: z
    .string()
    .trim()
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại người nhận không hợp lệ (10 số di động VN)'),
  receiverAddress: createSafeTextSchema(5, 255, 'Địa chỉ nhận chi tiết'),
  receiverProvince: createSafeTextSchema(2, 100, 'Tỉnh/Thành phố nhận'),
  receiverDistrict: createSafeTextSchema(2, 100, 'Quận/Huyện nhận'),
  receiverWard: createSafeTextSchema(0, 100, 'Phường/Xã nhận').optional().nullable(),

  // Thông số bưu kiện
  weightGram: z
    .number()
    .int('Khối lượng phải là số nguyên gram')
    .min(DELIVERY_CONSTRAINTS.MIN_WEIGHT_GRAM, `Khối lượng tối thiểu ${DELIVERY_CONSTRAINTS.MIN_WEIGHT_GRAM}g`)
    .max(DELIVERY_CONSTRAINTS.MAX_WEIGHT_GRAM, `Khối lượng tối đa ${DELIVERY_CONSTRAINTS.MAX_WEIGHT_GRAM}g`),
  lengthCm: z.number().min(0, 'Chiều dài không được âm').max(200).default(0),
  widthCm: z.number().min(0, 'Chiều rộng không được âm').max(200).default(0),
  heightCm: z.number().min(0, 'Chiều cao không được âm').max(200).default(0),

  // Tiền thu hộ COD và cước phí (chống tràn số và gian lận cước phí)
  codAmount: z
    .number()
    .min(0, 'Tiền thu hộ COD không được âm')
    .max(
      DELIVERY_CONSTRAINTS.MAX_COD_AMOUNT_VND,
      `Tiền thu hộ COD không vượt quá ${DELIVERY_CONSTRAINTS.MAX_COD_AMOUNT_VND.toLocaleString('vi-VN')} VNĐ`
    )
    .default(0),
  /**
   * Cước phí vận chuyển:
   * Nếu nhân viên nhập thì ghi nhận; nếu bỏ trống, hệ thống sẽ tự động tính theo công thức cước chuẩn.
   */
  shippingFee: z
    .number()
    .min(0, 'Cước phí vận chuyển không được âm')
    .max(
      DELIVERY_CONSTRAINTS.MAX_SHIPPING_FEE_VND,
      `Cước phí vận chuyển không vượt quá ${DELIVERY_CONSTRAINTS.MAX_SHIPPING_FEE_VND.toLocaleString('vi-VN')} VNĐ`
    )
    .optional(),
  paymentBy: z.nativeEnum(PAYMENT_BY).default(PAYMENT_BY.SENDER),

  notes: createSafeTextSchema(0, DELIVERY_CONSTRAINTS.MAX_NOTES_LENGTH, 'Ghi chú').optional().nullable(),
});

export type CreateOrderInputDTO = z.infer<typeof CreateOrderInputSchema>;

export interface OrderDetailDTO {
  id: string;
  trackingCode: string;
  currentHubId: string | null;
  currentHubName?: string | null;
  assignedShipperId: string | null;
  assignedShipperName?: string | null;

  senderName: string;
  senderPhone: string;
  senderAddress: string;

  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverProvince: string;
  receiverDistrict: string;
  receiverWard: string | null;

  weightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  billableWeightGram: number;

  codAmount: number;
  shippingFee: number;
  paymentBy: PaymentBy;
  paymentStatus: PaymentStatus;

  currentStatus: OrderStatus;
  deliveryAttempts: number;
  maxAttempts: number;
  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// UC10: TRA CỨU & LỌC DANH SÁCH ĐƠN HÀNG
// =============================================================================

export const GetOrderListQuerySchema = PaginationQuerySchema.extend({
  trackingCode: z.string().trim().optional(),
  senderPhone: z.string().trim().optional(),
  receiverPhone: z.string().trim().optional(),
  currentHubId: z.string().trim().optional(),
  assignedShipperId: z.string().trim().optional(),
  status: z.union([z.nativeEnum(ORDER_STATUS), z.array(z.nativeEnum(ORDER_STATUS))]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type GetOrderListQueryDTO = z.infer<typeof GetOrderListQuerySchema>;

export interface OrderListItemDTO {
  id: string;
  trackingCode: string;
  currentHubName?: string | null;
  assignedShipperName?: string | null;
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  receiverProvince: string;
  receiverDistrict: string;
  weightGram: number;
  codAmount: number;
  shippingFee: number;
  currentStatus: OrderStatus;
  deliveryAttempts: number;
  createdAt: Date;
}

export type OrderListOutputDTO = PaginatedResultDTO<OrderListItemDTO>;

// =============================================================================
// UC11: XEM CHI TIẾT ĐƠN HÀNG & LỊCH SỬ KIỂM VẾT
// =============================================================================

export const GetOrderDetailQuerySchema = z.object({
  /** Tìm theo ID hoặc Mã vận đơn trackingCode */
  identifier: z
    .string()
    .trim()
    .min(1, 'Định danh đơn hàng không được để trống')
    .max(
      DELIVERY_CONSTRAINTS.MAX_IDENTIFIER_LENGTH,
      `Định danh đơn hàng không vượt quá ${DELIVERY_CONSTRAINTS.MAX_IDENTIFIER_LENGTH} ký tự`
    ),
});

export type GetOrderDetailQueryDTO = z.infer<typeof GetOrderDetailQuerySchema>;

export interface OrderStatusLogDTO {
  id: string;
  orderId: string;
  hubId: string | null;
  hubName?: string | null;
  actorId: string;
  actorName: string;
  actorRole: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  failureReason: string | null;
  proofImageUrl: string | null;
  locationLat: number | null;
  locationLng: number | null;
  note: string | null;
  createdAt: Date;
}

export interface OrderDetailWithLogsDTO {
  order: OrderDetailDTO;
  logs: OrderStatusLogDTO[];
}

// =============================================================================
// UC12: CẬP NHẬT THÔNG TIN ĐƠN HÀNG (TRƯỚC KHI GIAO)
// =============================================================================

export const UpdateOrderInputSchema = z.object({
  id: z.string().trim().min(1, 'ID đơn hàng không được để trống'),
  receiverName: createSafeTextSchema(2, 100, 'Tên người nhận').optional(),
  receiverPhone: z
    .string()
    .trim()
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại người nhận không hợp lệ')
    .optional(),
  receiverAddress: createSafeTextSchema(5, 255, 'Địa chỉ nhận chi tiết').optional(),
  receiverProvince: createSafeTextSchema(2, 100, 'Tỉnh/Thành phố').optional(),
  receiverDistrict: createSafeTextSchema(2, 100, 'Quận/Huyện').optional(),
  receiverWard: createSafeTextSchema(0, 100, 'Phường/Xã').optional().nullable(),
  notes: createSafeTextSchema(0, DELIVERY_CONSTRAINTS.MAX_NOTES_LENGTH, 'Ghi chú').optional().nullable(),
});

export type UpdateOrderInputDTO = z.infer<typeof UpdateOrderInputSchema>;

// =============================================================================
// UC13: HỦY ĐƠN HÀNG
// =============================================================================

export const CancelOrderInputSchema = z.object({
  id: z.string().trim().min(1, 'ID đơn hàng không được để trống'),
  reason: createSafeTextSchema(3, 200, 'Lý do hủy đơn'),
});

export type CancelOrderInputDTO = z.infer<typeof CancelOrderInputSchema>;

// =============================================================================
// UC14: IMPORT & EXPORT ĐƠN HÀNG
// =============================================================================

export const ImportOrdersInputSchema = z.object({
  orders: z
    .array(CreateOrderInputSchema)
    .min(1, 'Danh sách đơn hàng import không được để trống')
    .max(
      DELIVERY_CONSTRAINTS.MAX_IMPORT_BATCH_SIZE,
      `Chỉ được import tối đa ${DELIVERY_CONSTRAINTS.MAX_IMPORT_BATCH_SIZE} đơn mỗi lần`
    ),
});

export type ImportOrdersInputDTO = z.infer<typeof ImportOrdersInputSchema>;

export interface ImportOrdersOutputDTO {
  totalRequested: number;
  successCount: number;
  failedCount: number;
  createdOrders: OrderDetailDTO[];
  errors: {
    rowNumber: number;
    trackingCode?: string;
    reason: string;
  }[];
}
