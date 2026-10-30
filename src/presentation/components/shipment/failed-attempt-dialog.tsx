'use client';

/**
 * @file failed-attempt-dialog.tsx
 * @description Hộp thoại (Modal) dành cho Shipper Báo Giao hàng Thất bại / Hẹn giao lại (UC19).
 * Sử dụng danh mục lý do chuẩn từ DELIVERY_FAILURE_REASON và tự động tăng bộ đếm giao thất bại.
 * @module presentation/components/shipment
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, XCircle, Loader2 } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import {
  DELIVERY_FAILURE_REASON,
  DELIVERY_FAILURE_REASON_LABELS,
  type DeliveryFailureReason,
} from '../../../domain/constants/failure-reasons.constant';
import type { MarkFailedAttemptInputDTO } from '../../../application/dtos/shipment.dto';

export interface FailedAttemptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    trackingCode: string;
    receiverName: string;
    receiverPhone: string;
    deliveryAttempts?: number;
  } | null;
  onSubmit: (input: MarkFailedAttemptInputDTO) => Promise<void>;
  isPending?: boolean;
}

export const FailedAttemptDialog: React.FC<FailedAttemptDialogProps> = ({
  isOpen,
  onClose,
  order,
  onSubmit,
  isPending = false,
}) => {
  const [reason, setReason] = useState<DeliveryFailureReason>(
    DELIVERY_FAILURE_REASON.CUSTOMER_UNREACHABLE
  );
  const [note, setNote] = useState('');

  useEffect(() => {
    if (order) {
      setReason(DELIVERY_FAILURE_REASON.CUSTOMER_UNREACHABLE);
      setNote('');
    }
  }, [order]);

  if (!order) return null;

  const currentAttempts = order.deliveryAttempts ?? 0;
  const isFinalWarning = currentAttempts >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: MarkFailedAttemptInputDTO = {
      orderId: order.id,
      failureReason: reason,
      note: note.trim() || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Báo giao thất bại: ${order.trackingCode}`}
      description="Ghi nhận lý do giao hàng không thành công và cập nhật số lần thử phát."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cảnh báo số lần giao */}
        <div
          className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
            isFinalWarning
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">
              Đơn hàng đã giao thất bại {currentAttempts}/3 lần.
            </div>
            {isFinalWarning && (
              <p className="mt-0.5 text-[11px]">
                Lưu ý: Nếu lần này thất bại (đạt 3 lần), hệ thống sẽ tự động chuyển đơn sang trạng thái Chờ Chuyển Hoàn (RETURN_PENDING).
              </p>
            )}
          </div>
        </div>

        {/* Lý do thất bại */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Lý do giao thất bại <span className="text-rose-500">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as DeliveryFailureReason)}
            disabled={isPending}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {Object.values(DELIVERY_FAILURE_REASON).map((r) => (
              <option key={r} value={r}>
                {DELIVERY_FAILURE_REASON_LABELS[r] || r}
              </option>
            ))}
          </select>
        </div>

        {/* Ghi chú chi tiết */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú chi tiết (VD: thời gian khách hẹn lại)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
            placeholder="Nhập ghi chú chi tiết nếu có..."
            rows={3}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="destructive" size="sm" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-1.5" />
                Xác nhận thất bại
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
