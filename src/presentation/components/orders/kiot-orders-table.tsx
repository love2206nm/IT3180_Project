'use client';

/**
 * @file kiot-orders-table.tsx
 * @description Bảng danh sách đơn hàng nén cao chuẩn KiotViet.
 * Hỗ trợ Row Expansion (Phương án A) trượt mở rộng dòng xem thông tin bưu kiện,
 * dòng thời gian kiểm vết (Audit Trail) và thao tác hủy đơn in-place không mất session.
 * @module presentation/components/orders/kiot-orders-table
 */

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  Package,
  User,
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Ban,
  Loader2,
} from 'lucide-react';
import type { OrderDetailDTO, OrderDetailWithLogsDTO } from '../../../application/dtos/order.dto';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { getOrderDetailAction, cancelOrderAction } from '../../actions/order.actions';
import { isSuccess, isFailure } from '../../../application/interfaces';
import { OrderStatusBadge } from '../ui/badge';
import { cn } from '../ui/utils';

export interface KiotOrdersTableProps {
  orders: OrderDetailDTO[];
  userRole?: string;
}

/**
 * Bảng dữ liệu đơn hàng độ nén cao chuẩn KiotViet với cơ chế Row Expansion.
 * @param {KiotOrdersTableProps} props
 * @returns {React.ReactElement}
 */
export const KiotOrdersTable: React.FC<KiotOrdersTableProps> = ({ orders: initialOrders, userRole }) => {
  const [orders, setOrders] = useState<OrderDetailDTO[]>(initialOrders);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<string, OrderDetailWithLogsDTO>>({});
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, startCancelTransition] = useTransition();

  // Đồng bộ lại orders khi initialOrders thay đổi từ server
  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  /**
   * Bật/tắt mở rộng dòng chi tiết đơn hàng (Row Expansion)
   * @param {OrderDetailDTO} order
   */
  const handleToggleRow = async (order: OrderDetailDTO): Promise<void> => {
    if (expandedId === order.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(order.id);

    // Nếu đã cache thông tin chi tiết thì không cần gọi lại
    if (detailsCache[order.id]) {
      return;
    }

    setLoadingDetails(true);
    try {
      const res = await getOrderDetailAction(order.trackingCode);
      if (isSuccess(res) && res.data) {
        setDetailsCache((prev) => ({
          ...prev,
          [order.id]: res.data,
        }));
      }
    } catch {
      //
    } finally {
      setLoadingDetails(false);
    }
  };

  /**
   * Xử lý Hủy đơn hàng trực tiếp tại dòng mở rộng
   * @param {string} orderId
   * @param {string} trackingCode
   */
  const handleExecuteCancel = (orderId: string, trackingCode: string): void => {
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy đơn hàng.');
      return;
    }

    setCancelError(null);
    startCancelTransition(async () => {
      const res = await cancelOrderAction({
        id: orderId,
        reason: cancelReason.trim(),
      });

      if (isSuccess(res)) {
        // Cập nhật trạng thái tại chỗ trên bảng
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, currentStatus: ORDER_STATUS.CANCELLED } : o))
        );
        // Tải lại chi tiết để hiển thị audit log chính xác
        try {
          const detailRes = await getOrderDetailAction(trackingCode);
          if (isSuccess(detailRes) && detailRes.data) {
            setDetailsCache((prev) => ({
              ...prev,
              [orderId]: detailRes.data,
            }));
          }
        } catch {
          //
        }
        setCancelModalOrderId(null);
        setCancelReason('');
      } else if (isFailure(res)) {
        setCancelError(res.error || 'Hủy đơn hàng thất bại.');
      }
    });
  };

  return (
    <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded shadow-xs select-none">
      <table className="w-full text-left border-collapse text-xs">
        {/* Table Header Kiot Style */}
        <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-3 w-10 text-center">#</th>
            <th className="py-2.5 px-3 w-40">Mã Vận Đơn</th>
            <th className="py-2.5 px-3">Người Gửi</th>
            <th className="py-2.5 px-3">Người Nhận & Địa Chỉ</th>
            <th className="py-2.5 px-3 text-right">Tiền Thu Hộ COD</th>
            <th className="py-2.5 px-3 text-center">Trạng Thái</th>
            <th className="py-2.5 px-3">Bưu Tá Phụ Trách</th>
            <th className="py-2.5 px-3 text-center w-24">Chi Tiết</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-slate-100">
          {orders.length > 0 ? (
            orders.map((order, idx) => {
              const isExpanded = expandedId === order.id;
              const detailData = detailsCache[order.id];
              const canCancel =
                order.currentStatus === ORDER_STATUS.CREATED || order.currentStatus === ORDER_STATUS.AT_HUB;

              return (
                <React.Fragment key={order.id}>
                  {/* Dòng chính nén cao Kiot */}
                  <tr
                    onClick={() => handleToggleRow(order)}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-blue-50/60',
                      isExpanded ? 'bg-blue-50/40 border-l-4 border-l-[#0066CC]' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                    )}
                  >
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                    {/* Mã Vận Đơn */}
                    <td className="py-2 px-3">
                      <span className="font-mono font-bold text-[#0066CC] hover:underline flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-blue-500" />
                        {order.trackingCode}
                      </span>
                    </td>

                    {/* Người Gửi */}
                    <td className="py-2 px-3 font-medium text-slate-800 truncate max-w-[140px]">
                      {order.senderName}
                    </td>

                    {/* Người Nhận & Địa chỉ */}
                    <td className="py-2 px-3 max-w-[240px]">
                      <p className="font-semibold text-slate-900 truncate">{order.receiverName}</p>
                      <p className="text-[11px] text-slate-500 truncate" title={order.receiverAddress}>
                        {order.receiverAddress}
                      </p>
                    </td>

                    {/* Tiền COD */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {order.codAmount > 0 ? (
                        <span className="text-[#EA580C]">{order.codAmount.toLocaleString('vi-VN')} đ</span>
                      ) : (
                        <span className="text-slate-400 font-normal">0 đ</span>
                      )}
                    </td>

                    {/* Trạng Thái */}
                    <td className="py-2 px-3 text-center">
                      <OrderStatusBadge status={order.currentStatus} />
                    </td>

                    {/* Shipper */}
                    <td className="py-2 px-3">
                      {order.assignedShipperName ? (
                        <span className="font-medium text-slate-800">{order.assignedShipperName}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa gán</span>
                      )}
                    </td>

                    {/* Nút Xem / Mở rộng */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRow(order);
                        }}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Đóng' : 'Xem'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Dòng con mở rộng chi tiết (Row Expansion - Phương án A) */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90 border-b-2 border-slate-200">
                      <td colSpan={8} className="p-4">
                        {loadingDetails && !detailData ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin text-[#0066CC]" />
                            <span>Đang tải thông tin chi tiết đơn hàng...</span>
                          </div>
                        ) : detailData ? (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                            {/* Panel 1: Thông tin người gửi & nhận */}
                            <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-blue-600" />
                                  Thông Tin Bưu Kiện
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  Khối lượng: {detailData.order.weightGram}g
                                </span>
                              </div>

                              <div className="space-y-1 text-slate-700">
                                <div>
                                  <span className="text-slate-500">Người gửi: </span>
                                  <span className="font-semibold text-slate-900">{detailData.order.senderName}</span>
                                  {detailData.order.senderPhone && (
                                    <span className="font-mono text-slate-600 ml-1">({detailData.order.senderPhone})</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-slate-500">Địa chỉ gửi: </span>
                                  <span>{detailData.order.senderAddress}</span>
                                </div>
                              </div>

                              <div className="border-t border-slate-100 pt-1.5 space-y-1 text-slate-700">
                                <div>
                                  <span className="text-slate-500">Người nhận: </span>
                                  <span className="font-semibold text-slate-900">{detailData.order.receiverName}</span>
                                  {detailData.order.receiverPhone && (
                                    <span className="font-mono text-slate-600 ml-1">({detailData.order.receiverPhone})</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-slate-500">Địa chỉ phát: </span>
                                  <span>{detailData.order.receiverAddress}</span>
                                </div>
                              </div>

                              <div className="border-t border-slate-100 pt-1.5 flex justify-between text-slate-700 font-mono">
                                <span>Cước vận chuyển:</span>
                                <span className="font-semibold text-slate-900">
                                  {detailData.order.shippingFee.toLocaleString('vi-VN')} đ
                                </span>
                              </div>

                              <div className="flex justify-between text-slate-700 font-mono">
                                <span>Tiền thu hộ COD:</span>
                                <span className="font-bold text-[#EA580C]">
                                  {detailData.order.codAmount.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            </div>

                            {/* Panel 2: Dòng thời gian kiểm vết (Audit Trail Timeline) */}
                            <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs space-y-2 lg:col-span-2">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                                  Lịch Sử Hành Trình (Audit Trail)
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Tổng số sự kiện: {detailData.logs.length}
                                </span>
                              </div>

                              <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
                                {detailData.logs.length > 0 ? (
                                  detailData.logs.map((log) => (
                                    <div
                                      key={log.id}
                                      className="flex items-start gap-2.5 text-[11px] border-l-2 border-blue-400 pl-2.5 py-0.5"
                                    >
                                      <div className="min-w-[125px] font-mono text-slate-500">
                                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-semibold text-slate-900 mr-1.5">[{log.newStatus}]</span>
                                        <span className="text-slate-700">{log.note || 'Cập nhật trạng thái'}</span>
                                        {log.failureReason && (
                                          <span className="text-rose-600 ml-1">({log.failureReason})</span>
                                        )}
                                      </div>
                                      {log.hubName && (
                                        <span className="text-slate-400 font-medium">{log.hubName}</span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-slate-400 italic">Chưa có bản ghi lịch sử nào.</p>
                                )}
                              </div>

                              {/* Hành động Hủy đơn hàng in-place */}
                              <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                                <div className="text-[11px] text-slate-500">
                                  Tạo lúc: {new Date(detailData.order.createdAt).toLocaleString('vi-VN')}
                                </div>

                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/orders/${detailData.order.trackingCode}`}
                                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Mở trang chi tiết</span>
                                  </Link>

                                  {canCancel && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelModalOrderId(detailData.order.id);
                                        setCancelReason('');
                                        setCancelError(null);
                                      }}
                                      className="flex items-center gap-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer"
                                    >
                                      <Ban className="w-3 h-3 text-rose-600" />
                                      <span>Hủy Đơn Hàng</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-slate-500">
                            Không thể tải chi tiết đơn hàng.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan={8} className="py-12 text-center text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Vui lòng thay đổi từ khóa tìm kiếm hoặc chọn lại trạng thái.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal Hủy Đơn Hàng Tại Chỗ */}
      {cancelModalOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Xác Nhận Hủy Đơn Hàng</span>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Thao tác hủy đơn sẽ ghi nhận bản ghi kiểm vết bất biến trong lịch sử vận chuyển. Bưu kiện sẽ được chuyển
              sang trạng thái <span className="font-semibold text-slate-900">CANCELLED</span>.
            </p>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Lý do hủy đơn hàng <span className="text-rose-500">*</span>:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Khách hàng yêu cầu hủy đơn, sai thông tin hàng..."
                rows={3}
                className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              {cancelError && <p className="text-xs text-rose-600 mt-1 font-medium">{cancelError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalOrderId(null)}
                disabled={isCancelling}
                className="rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const ord = orders.find((o) => o.id === cancelModalOrderId);
                  handleExecuteCancel(cancelModalOrderId, ord?.trackingCode || '');
                }}
                disabled={isCancelling}
                className="flex items-center gap-1 rounded bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                <span>{isCancelling ? 'Đang xử lý...' : 'Xác Nhận Hủy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
