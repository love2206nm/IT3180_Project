/**
 * @file tracking.dto.ts
 * @description Zod Schemas và DTOs phục vụ phân hệ Tra cứu Vận đơn Công khai (UC23).
 * Đảm bảo bảo vệ thông tin khách hàng: số điện thoại được che ký tự, không để lộ thông tin nội bộ.
 * @module application/dtos
 */

import { z } from 'zod';
import { type OrderStatus } from '../../domain/constants/order-status.constant';

// =============================================================================
// UC23: TRA CỨU VẬN ĐƠN CÔNG KHAI (PUBLIC TRACKING)
// =============================================================================

/**
 * Schema xác thực dữ liệu đầu vào khi người dùng tra cứu vận đơn ngoài trang chủ
 */
export const PublicTrackingQuerySchema = z.object({
  /** Mã vận đơn cần tra cứu (ví dụ: TRK-20261029-A1B2C3) */
  trackingCode: z
    .string()
    .trim()
    .min(5, 'Mã vận đơn phải từ 5 ký tự trở lên')
    .max(50, 'Mã vận đơn không được vượt quá 50 ký tự')
    .regex(/^[A-Za-z0-9\-_]+$/, 'Mã vận đơn chỉ chứa chữ cái, số, gạch nối hoặc gạch dưới'),
});

export type PublicTrackingQueryDTO = z.infer<typeof PublicTrackingQuerySchema>;

/**
 * Một mốc thời gian trên Timeline hành trình của bưu kiện
 */
export interface TrackingTimelineEventDTO {
  /** Trạng thái đơn hàng tại thời điểm ghi log */
  status: OrderStatus;
  /** Tên trạng thái thân thiện hiển thị cho khách hàng tiếng Việt */
  statusLabel: string;
  /** Thời gian ghi nhận mốc hành trình */
  timestamp: string;
  /** Tên trạm / bưu cục xử lý (nếu có) */
  hubName: string | null;
  /** Tỉnh / Thành phố nơi diễn ra sự kiện */
  locationName: string | null;
  /** Ghi chú hiển thị công khai (ví dụ: Đang trên đường giao hàng) */
  note: string | null;
}

/**
 * Thông tin chi tiết bưu kiện trả về cho khách hàng công khai.
 * Tuyệt đối tuân thủ bảo vệ dữ liệu: SĐT được che 3 số giữa (0912***456).
 */
export interface PublicTrackingOutputDTO {
  /** Mã vận đơn */
  trackingCode: string;
  /** Trạng thái hiện tại của đơn hàng */
  currentStatus: OrderStatus;
  /** Tên hiển thị tiếng Việt của trạng thái hiện tại */
  currentStatusLabel: string;
  /** Tên người nhận (ví dụ: "Nguyễn Văn A") */
  receiverName: string;
  /** Số điện thoại người nhận đã được che bảo mật (ví dụ: "0912***456") */
  receiverPhoneMasked: string;
  /** Địa chỉ điểm đến (Tỉnh / Thành phố) */
  destinationProvince: string;
  /** Quận / Huyện điểm đến */
  destinationDistrict: string;
  /** Trọng lượng bưu kiện (gram) */
  weightGram: number;
  /** Thời điểm tiếp nhận đơn hàng */
  createdAt: string;
  /** Ước tính thời gian giao hoặc thời gian hoàn tất */
  updatedAt: string;
  /** Lịch sử hành trình bưu kiện theo thứ tự thời gian */
  timeline: TrackingTimelineEventDTO[];
}
