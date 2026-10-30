'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  RefreshCw,
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
import { getOrderListAction } from '../../../presentation/actions/order.actions';
import { ORDER_STATUS } from '../../../domain/constants/order-status.constant';
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

export default function ShipperDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrderItem | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isFailModalOpen, setIsFailModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { playSuccess, playError } = useAudioFeedback();

  const loadDeliveries = async () => {
    setIsLoading(true);
    try {
      const res = await getOrderListAction({ page: 1, limit: 50, status: ORDER_STATUS.OUT_FOR_DELIVERY });
      if (res.success) {
        setDeliveries(
          res.data.items.map((ord) => ({
            id: ord.id,
            trackingCode: ord.trackingCode,
            receiverName: ord.receiverName,
            receiverPhone: ord.receiverPhone,
            receiverAddress: `${ord.receiverDistrict}, ${ord.receiverProvince}`,
            codAmount: ord.codAmount,
            deliveryAttempts: ord.deliveryAttempts ?? 0,
            notes: undefined,
          }))
        );
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  // Server Action: Giao hàng thành công
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

  // Server Action: Báo giao thất bại
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
            ? `Đơn hàng đã thất bại ${data.deliveryAttempts} lần và được chuyển sang Chờ Chuyển Hoàn!`
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

  const handleDeliveredSubmit = async (formData: MarkDeliveredInputDTO) => {
    await executeDelivered(formData);
  };

  const handleFailedSubmit = async (formData: MarkFailedAttemptInputDTO) => {
    await executeFailedAttempt(formData);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-accent" />
            Lộ Trình Giao Hàng Ca Trực
          </h1>
          <p className="text-xs text-slate-500">
            Còn lại <span className="font-bold text-accent">{deliveries.length}</span> bưu phẩm cần phát trong ca
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={loadDeliveries} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Thông báo thao tác */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Delivery Tasks Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Đang tải danh sách lộ trình giao hàng...
          </div>
        ) : deliveries.length > 0 ? (
          deliveries.map((delivery) => (
            <Card key={delivery.id} className="border-slate-200 overflow-hidden shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{delivery.trackingCode}</span>
                    {delivery.deliveryAttempts > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                        <RotateCcw className="w-2.5 h-2.5" /> Lần {delivery.deliveryAttempts}
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    COD: {delivery.codAmount > 0 ? `${delivery.codAmount.toLocaleString('vi-VN')} ₫` : '0 ₫ (Đã TT)'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-900 font-semibold">
                    <span>{delivery.receiverName}</span>
                    <a
                      href={`tel:${delivery.receiverPhone}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-mono"
                    >
                      <Phone className="w-3 h-3" />
                      {delivery.receiverPhone}
                    </a>
                  </div>

                  <div className="flex items-start gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{delivery.receiverAddress}</span>
                  </div>

                  {delivery.notes && (
                    <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-lg text-[11px] text-amber-900">
                      <strong>Ghi chú:</strong> {delivery.notes}
                    </div>
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
                    Báo Giao Thất Bại
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenSuccessModal(delivery)}
                    disabled={isDeliveredPending || isFailedPending}
                    className="text-xs font-semibold py-2 h-auto"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Giao Thành Công
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

      {/* Modal: Giao thành công kèm POD và GPS */}
      <PODCaptureDialog
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        order={activeOrder}
        onSubmit={handleDeliveredSubmit}
        isPending={isDeliveredPending}
      />

      {/* Modal: Báo giao thất bại kèm lý do chuẩn hoá */}
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
