'use client';

/**
 * @file order-action-controls.tsx
 * @description Component điều khiển các thao tác Quản lý Đơn hàng (Hủy đơn UC13, Chỉnh sửa UC12).
 * @module presentation/components/orders
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, XCircle, Printer, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { useServerAction } from '../../hooks/use-server-action';
import { useAudioFeedback } from '../../hooks/use-audio-feedback';
import { cancelOrderAction } from '../../actions/order.actions';

export interface OrderActionControlsProps {
  orderId: string;
  trackingCode: string;
  currentStatus: OrderStatus;
}

export const OrderActionControls: React.FC<OrderActionControlsProps> = ({
  orderId,
  trackingCode,
  currentStatus,
}) => {
  const router = useRouter();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { playSuccess, playError } = useAudioFeedback();

  const isEditable =
    currentStatus === ORDER_STATUS.CREATED || currentStatus === ORDER_STATUS.AT_HUB;
  const isCancellable =
    currentStatus !== ORDER_STATUS.DELIVERED &&
    currentStatus !== ORDER_STATUS.CANCELLED &&
    currentStatus !== ORDER_STATUS.RETURNED;

  const { execute: executeCancel, isPending } = useServerAction(cancelOrderAction, {
    onSuccess: () => {
      playSuccess();
      setIsCancelOpen(false);
      router.refresh();
    },
    onError: (err) => {
      playError();
      setErrorMsg(err);
    },
  });

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do hủy đơn hàng');
      return;
    }
    setErrorMsg(null);
    await executeCancel({
      id: orderId,
      reason: reason.trim(),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {isEditable && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert(`Chức năng chỉnh sửa đơn hàng ${trackingCode} (UC12)`)}
            className="text-xs"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Chỉnh Sửa (UC12)
          </Button>
        )}

        {isCancellable && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setReason('');
              setErrorMsg(null);
              setIsCancelOpen(true);
            }}
            className="text-xs"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Hủy Đơn (UC13)
          </Button>
        )}

        <Button variant="secondary" size="sm" onClick={handlePrint} className="text-xs">
          <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
          In Phiếu
        </Button>
      </div>

      {/* Modal Hủy Đơn Hàng (UC13) */}
      <Dialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title={`Hủy Đơn Hàng: ${trackingCode}`}
        description="Ghi nhận lý do hủy bưu kiện và cập nhật lịch sử kiểm vết bất biến (Audit Trail)."
        size="sm"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Cảnh báo hành động không thể hoàn tác!</p>
              <p className="text-[11px] mt-0.5">
                Đơn hàng sau khi hủy sẽ không thể tiếp tục điều phối hoặc giao lại cho khách.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do hủy đơn hàng <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do chi tiết (VD: Người gửi yêu cầu hủy trước khi giao)..."
              disabled={isPending}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelOpen(false)}
              disabled={isPending}
            >
              Hủy bỏ
            </Button>
            <Button type="submit" variant="destructive" size="sm" isLoading={isPending}>
              Xác Nhận Hủy Đơn
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
};
