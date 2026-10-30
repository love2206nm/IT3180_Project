'use client';

import React, { useState } from 'react';
import {
  Truck,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../../../presentation/components/ui/button';
import { Card, CardContent } from '../../../presentation/components/ui/card';
import { PODCaptureDialog } from '../../../presentation/components/shipment/pod-capture-dialog';
import { FailedAttemptDialog } from '../../../presentation/components/shipment/failed-attempt-dialog';
import { useServerAction } from '../../../presentation/hooks/use-server-action';
import { useAudioFeedback } from '../../../presentation/hooks/use-audio-feedback';
import {
  markDeliveredAction,
  markFailedAttemptAction,
} from '../../../presentation/actions/shipment.actions';
import type { MarkDeliveredInputDTO, MarkFailedAttemptInputDTO } from '../../../application/dtos/shipment.dto';

interface DeliveryOrderItem {
  id: string;
  trackingCode: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  codAmount: number;
  deliveryAttempts: number;
  notes?: string;
}

const INITIAL_DELIVERIES: DeliveryOrderItem[] = [
  {
    id: 'ord-ship-01',
    trackingCode: 'MOCK-TRK-OUT-01',
    receiverName: 'Lê Thu Trang',
    receiverPhone: '0912000333',
    receiverAddress: 'Số 33 Trần Thái Tông, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    codAmount: 150000,
    deliveryAttempts: 0,
    notes: 'Giao giờ hành chính, gọi trước 10 phút',
  },
  {
    id: 'ord-ship-02',
    trackingCode: 'MOCK-TRK-OUT-02',
    receiverName: 'Đặng Ngọc Ánh',
    receiverPhone: '0912000444',
    receiverAddress: 'Tòa nhà HITC, 239 Xuân Thủy, Cầu Giấy, Hà Nội',
    codAmount: 300000,
    deliveryAttempts: 1,
    notes: 'Gửi lễ tân tầng 1',
  },
  {
    id: 'ord-ship-03',
    trackingCode: 'MOCK-TRK-OUT-03',
    receiverName: 'Hoàng Minh Tuấn',
    receiverPhone: '0988777666',
    receiverAddress: 'Số 15 ngõ 199 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội',
    codAmount: 0,
    deliveryAttempts: 2,
    notes: 'Đã thanh toán trước. Lưu ý đơn đã giao thất bại 2 lần!',
  },
];

export default function ShipperDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryOrderItem[]>(INITIAL_DELIVERIES);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrderItem | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isFailModalOpen, setIsFailModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { playSuccess, playError } = useAudioFeedback();

  // UC18 Server Action
  const { execute: executeDelivered, isPending: isDeliveredPending } = useServerAction(
    markDeliveredAction,
    {
      onSuccess: (data) => {
        playSuccess();
        if (activeOrder) {
          setDeliveries((prev) => prev.filter((d) => d.id !== activeOrder.id));
        }
        setIsSuccessModalOpen(false);
        setActiveOrder(null);
        setNotification({
          type: 'success',
          message: `Giao hàng thành công đơn ${data.orderId}! Tiền COD thu được: ${data.codCollected.toLocaleString('vi-VN')} ₫.`,
        });
      },
      onError: (err) => {
        playError();
        setNotification({
          type: 'error',
          message: `Không thể hoàn tất giao hàng: ${err}`,
        });
      },
    }
  );

  // UC19 Server Action
  const { execute: executeFailedAttempt, isPending: isFailedPending } = useServerAction(
    markFailedAttemptAction,
    {
      onSuccess: (data) => {
        playSuccess();
        if (activeOrder) {
          setDeliveries((prev) => prev.filter((d) => d.id !== activeOrder.id));
        }
        setIsFailModalOpen(false);
        setActiveOrder(null);
        setNotification({
          type: 'success',
          message: data.isReturnPending
            ? `Đơn hàng đã thất bại ${data.deliveryAttempts} lần và được chuyển sang Chờ Chuyển Hoàn (RETURN_PENDING)!`
            : `Đã ghi nhận giao thất bại (Lần ${data.deliveryAttempts}). Hệ thống sẽ lên lịch hẹn giao lại.`,
        });
      },
      onError: (err) => {
        playError();
        setNotification({
          type: 'error',
          message: `Không thể ghi nhận giao thất bại: ${err}`,
        });
      },
    }
  );

  const handleOpenSuccessModal = (order: DeliveryOrderItem) => {
    setActiveOrder(order);
    setIsSuccessModalOpen(true);
  };

  const handleOpenFailModal = (order: DeliveryOrderItem) => {
    setActiveOrder(order);
    setIsFailModalOpen(true);
  };

  const handleDeliveredSubmit = async (payload: MarkDeliveredInputDTO) => {
    await executeDelivered(payload);
  };

  const handleFailedSubmit = async (payload: MarkFailedAttemptInputDTO) => {
    await executeFailedAttempt(payload);
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Shipper Status Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Ca Giao Hàng Đang Thực Hiện</h2>
            <p className="text-xs text-slate-500">Tuyến: Cầu Giấy - Mai Dịch</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-base font-bold text-primary">{deliveries.length}</span>
          <span className="text-[11px] text-slate-400 block font-medium">Bưu phẩm còn lại</span>
        </div>
      </div>

      {/* Thông báo kết quả thao tác */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Deliveries Mobile Cards */}
      <div className="space-y-3">
        {deliveries.length > 0 ? (
          deliveries.map((delivery) => (
            <Card key={delivery.id} className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
              <CardContent className="p-4 space-y-3">
                {/* Header row: Tracking code + COD Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">
                    {delivery.trackingCode}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {delivery.deliveryAttempts > 0 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Thử phát: {delivery.deliveryAttempts}/3
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-xs">
                      COD: {delivery.codAmount.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>

                {/* Receiver Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">{delivery.receiverName}</p>
                    <a
                      href={`tel:${delivery.receiverPhone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      {delivery.receiverPhone}
                    </a>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{delivery.receiverAddress}</span>
                  </p>
                  {delivery.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      Ghi chú: {delivery.notes}
                    </p>
                  )}
                </div>

                {/* Mobile Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenFailModal(delivery)}
                    disabled={isDeliveredPending || isFailedPending}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-2 h-auto"
                  >
                    <XCircle className="w-4 h-4 mr-1 text-rose-500" />
                    Báo Giao Thất Bại (UC19)
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenSuccessModal(delivery)}
                    disabled={isDeliveredPending || isFailedPending}
                    className="text-xs font-semibold py-2 h-auto"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Giao Thành Công (UC18)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-16 text-slate-400 space-y-3 bg-white rounded-xl border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">Đã giao hết tất cả bưu phẩm trong ca!</p>
              <p className="text-xs text-slate-500">
                Hãy chuyển sang màn hình nộp tiền COD để hoàn tất bảng kê quyết toán với kế toán trạm.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Giao thành công kèm POD và GPS (UC18) */}
      <PODCaptureDialog
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        order={activeOrder}
        onSubmit={handleDeliveredSubmit}
        isPending={isDeliveredPending}
      />

      {/* Modal: Báo giao thất bại kèm lý do chuẩn hoá (UC19) */}
      <FailedAttemptDialog
        isOpen={isFailModalOpen}
        onClose={() => setIsFailModalOpen(false)}
        order={activeOrder}
        onSubmit={handleFailedSubmit}
        isPending={isFailedPending}
      />
    </div>
  );
}
