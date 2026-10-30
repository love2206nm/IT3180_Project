'use client';

/**
 * @file cod-settlement-review-dialog.tsx
 * @description Hộp thoại (Modal) dành cho Quản lý trạm Phê duyệt (CONFIRM) hoặc Từ chối (REJECT) phiên nộp tiền COD của Shipper (UC22).
 * @module presentation/components/cod
 */

import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, DollarSign, Loader2 } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import type { ReviewCODSettlementInputDTO } from '../../../application/dtos/cod.dto';

export interface CODSettlementReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: {
    id: string;
    settlementCode: string;
    shipperName?: string;
    totalCodAmount: number;
    totalOrdersCount: number;
    createdAt?: Date | string;
  } | null;
  onReview: (input: ReviewCODSettlementInputDTO) => Promise<void>;
  isPending?: boolean;
}

export const CODSettlementReviewDialog: React.FC<CODSettlementReviewDialogProps> = ({
  isOpen,
  onClose,
  settlement,
  onReview,
  isPending = false,
}) => {
  const [action, setAction] = useState<'CONFIRM' | 'REJECT'>('CONFIRM');
  const [rejectionReason, setRejectionReason] = useState('');

  if (!settlement) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ReviewCODSettlementInputDTO = {
      settlementId: settlement.id,
      action,
      rejectionReason: action === 'REJECT' ? rejectionReason.trim() || 'Lệch số tiền thực tế hoặc có sai sót' : undefined,
    };

    await onReview(payload);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Đối soát phiên nộp tiền: ${settlement.settlementCode}`}
      description="Quản lý trạm kiểm tra số tiền mặt bàn giao thực tế trước khi xác nhận vào quỹ trạm."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tóm tắt phiên đối soát */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Shipper nộp tiền:</span>
            <span className="font-semibold text-slate-800">{settlement.shipperName || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Số lượng đơn hàng nộp:</span>
            <span className="font-semibold text-slate-800">{settlement.totalOrdersCount} bưu kiện</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-700">Tổng tiền COD nộp:</span>
            <span className="text-base font-bold text-emerald-600">
              {settlement.totalCodAmount.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

        {/* Lựa chọn hành động */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Quyết định phê duyệt <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction('CONFIRM')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                action === 'CONFIRM'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Xác nhận đã thu đủ tiền</span>
            </button>

            <button
              type="button"
              onClick={() => setAction('REJECT')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                action === 'REJECT'
                  ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Từ chối phiên nộp</span>
            </button>
          </div>
        </div>

        {/* Lý do từ chối nếu chọn REJECT */}
        {action === 'REJECT' && (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-rose-700">
              Lý do từ chối (bắt buộc diễn giải cho Shipper)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="VD: Thiếu 50.000đ tiền mặt so với danh sách đơn..."
              rows={2}
              required
              className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            size="sm"
            variant={action === 'CONFIRM' ? 'primary' : 'destructive'}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Đang xử lý...
              </>
            ) : action === 'CONFIRM' ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Duyệt phiên nộp tiền
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-1.5" />
                Xác nhận từ chối
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
