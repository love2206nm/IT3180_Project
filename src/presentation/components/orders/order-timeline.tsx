'use client';

/**
 * @file order-timeline.tsx
 * @description Component hiển thị Dòng thời gian Hành trình Vận chuyển (Vertical Timeline) của bưu kiện.
 * Phục vụ màn hình Xem chi tiết đơn hàng (UC11) và Tra cứu vận đơn công khai (UC23).
 * @module presentation/components/orders
 */

import React from 'react';
import {
  PackagePlus,
  Warehouse,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { OrderStatusBadge } from '../ui/badge';
import type { TrackingTimelineEventDTO } from '../../../application/dtos/tracking.dto';

export interface OrderTimelineProps {
  /** Danh sách các sự kiện kiểm vết sắp xếp theo thứ tự mới nhất -> cũ nhất hoặc ngược lại */
  events: TrackingTimelineEventDTO[];
  /** Tùy chọn đảo ngược thứ tự hiển thị (mặc định hiển thị mới nhất ở trên cùng) */
  reverse?: boolean;
  className?: string;
}

/**
 * Trả về icon biểu tượng tương ứng với trạng thái vận chuyển.
 */
function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case ORDER_STATUS.CREATED:
      return <PackagePlus className="w-5 h-5 text-slate-500" />;
    case ORDER_STATUS.AT_HUB:
      return <Warehouse className="w-5 h-5 text-sky-600" />;
    case ORDER_STATUS.OUT_FOR_DELIVERY:
      return <Truck className="w-5 h-5 text-amber-600" />;
    case ORDER_STATUS.DELIVERED:
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    case ORDER_STATUS.FAILED_ATTEMPT:
      return <AlertTriangle className="w-5 h-5 text-rose-500" />;
    case ORDER_STATUS.RETURN_PENDING:
    case ORDER_STATUS.RETURNED:
      return <RotateCcw className="w-5 h-5 text-orange-500" />;
    case ORDER_STATUS.CANCELLED:
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-slate-400" />;
  }
}

/**
 * Trả về màu nền cho vòng tròn icon sự kiện.
 */
function getStatusBgColor(status: OrderStatus): string {
  switch (status) {
    case ORDER_STATUS.DELIVERED:
      return 'bg-emerald-100 border-emerald-300';
    case ORDER_STATUS.OUT_FOR_DELIVERY:
      return 'bg-amber-100 border-amber-300';
    case ORDER_STATUS.AT_HUB:
      return 'bg-sky-100 border-sky-300';
    case ORDER_STATUS.FAILED_ATTEMPT:
    case ORDER_STATUS.CANCELLED:
      return 'bg-rose-100 border-rose-300';
    default:
      return 'bg-slate-100 border-slate-300';
  }
}

/**
 * Component hiển thị dòng thời gian hành trình bưu kiện chuẩn UX Logistics.
 */
export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  events,
  reverse = false,
  className = '',
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-sm">
        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
        Chưa có dữ liệu hành trình vận chuyển cho bưu kiện này.
      </div>
    );
  }

  const displayEvents = reverse ? [...events].reverse() : events;

  return (
    <div className={`relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 ${className}`}>
      {displayEvents.map((event, index) => {
        const isLatest = index === 0;
        const eventDate = new Date(event.timestamp);
        const formattedDate = eventDate.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const formattedTime = eventDate.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div key={index} className="relative group">
            {/* Điểm nút trạng thái */}
            <div
              className={`absolute -left-6 top-0 flex items-center justify-center w-6 h-6 rounded-full border-2 ${getStatusBgColor(
                event.status
              )} shadow-sm transition-transform group-hover:scale-110`}
            >
              {getStatusIcon(event.status)}
            </div>

            {/* Nội dung chi tiết sự kiện */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={event.status} />
                  {isLatest && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-white rounded">
                      MỚI NHẤT
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formattedTime}</span>
                  <span className="text-slate-300">|</span>
                  <span>{formattedDate}</span>
                </div>
              </div>

              {/* Thông tin trạm / địa điểm bưu cục */}
              {(event.hubName || event.locationName) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 my-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{event.hubName || event.locationName}</span>
                </div>
              )}

              {/* Ghi chú hoặc lý do chi tiết */}
              {event.note && (
                <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                  {event.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
