'use client';

/**
 * @file pod-capture-dialog.tsx
 * @description Hộp thoại (Modal) dành riêng cho Shipper Xác nhận Giao hàng thành công (Proof of Delivery - POD).
 * Hỗ trợ thu thập: Ảnh bằng chứng giao hàng, xác nhận số tiền thu hộ COD và định vị GPS thực tế (UC18).
 * @module presentation/components/shipment
 */

import React, { useState, useEffect } from 'react';
import { Camera, Navigation, DollarSign, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useGeolocation } from '../../hooks/use-geolocation';
import type { MarkDeliveredInputDTO } from '../../../application/dtos/shipment.dto';

export interface PODCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    trackingCode: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    codAmount: number;
  } | null;
  onSubmit: (input: MarkDeliveredInputDTO) => Promise<void>;
  isPending?: boolean;
}

export const PODCaptureDialog: React.FC<PODCaptureDialogProps> = ({
  isOpen,
  onClose,
  order,
  onSubmit,
  isPending = false,
}) => {
  const [proofImageUrl, setProofImageUrl] = useState('https://r2.deliveryhub.vn/pod/delivered-sample.jpg');
  const [codCollected, setCodCollected] = useState<number>(0);
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { coordinates, isLocating, getLocation, resetLocation } = useGeolocation();

  useEffect(() => {
    if (order) {
      setCodCollected(order.codAmount);
      setNote('Giao hàng thành công đến tay người nhận');
      setValidationError(null);
      resetLocation();
    }
  }, [order, resetLocation]);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Kiểm tra số tiền COD nếu đơn yêu cầu thu tiền
    if (order.codAmount > 0 && codCollected !== order.codAmount) {
      setValidationError(
        `Số tiền thu hộ không khớp! Đơn hàng yêu cầu thu: ${order.codAmount.toLocaleString('vi-VN')} ₫`
      );
      return;
    }

    const payload: MarkDeliveredInputDTO = {
      orderId: order.id,
      codCollected,
      proofImageUrl: proofImageUrl.trim() || undefined,
      locationLat: coordinates.lat ?? undefined,
      locationLng: coordinates.lng ?? undefined,
      note: note.trim() || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Xác nhận giao thành công: ${order.trackingCode}`}
      description="Ghi nhận chữ ký/ảnh bằng chứng nhận hàng (POD) và số tiền COD thực thu."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Thông tin người nhận */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between font-medium text-slate-700">
            <span>Người nhận: {order.receiverName}</span>
            <span className="font-mono text-slate-500">{order.receiverPhone}</span>
          </div>
          <div className="text-slate-500">{order.receiverAddress}</div>
        </div>

        {/* Tiền thu hộ COD */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Số tiền thu hộ COD (VNĐ)
          </label>
          <div className="relative">
            <input
              type="number"
              value={codCollected}
              onChange={(e) => setCodCollected(Number(e.target.value))}
              disabled={isPending || order.codAmount === 0}
              className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-emerald-700 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-100"
            />
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
          </div>
          {order.codAmount > 0 ? (
            <p className="text-[11px] text-slate-500 mt-1">
              Số tiền cần thu theo đơn: <span className="font-bold text-slate-800">{order.codAmount.toLocaleString('vi-VN')} ₫</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1">Đơn hàng không có tiền thu hộ COD (0 ₫).</p>
          )}
        </div>

        {/* Ảnh bằng chứng POD */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Đường dẫn ảnh bằng chứng (POD URL)
          </label>
          <div className="relative">
            <input
              type="url"
              value={proofImageUrl}
              onChange={(e) => setProofImageUrl(e.target.value)}
              placeholder="https://r2.deliveryhub.vn/pod/..."
              disabled={isPending}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <Camera className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Bắt buộc giao thức HTTPS và domain hợp lệ của hệ thống.</p>
        </div>

        {/* Tọa độ GPS */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tọa độ định vị vị trí giao hàng (GPS)
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
              {coordinates.lat && coordinates.lng ? (
                <span className="text-emerald-600 font-semibold">
                  Lat: {coordinates.lat}, Lng: {coordinates.lng}
                </span>
              ) : (
                <span className="text-slate-400">Chưa lấy tọa độ GPS</span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getLocation}
              disabled={isLocating || isPending}
              className="shrink-0"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Đang quét...
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 mr-1 text-primary" />
                  Lấy GPS
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Ghi chú */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú bàn giao
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Lỗi xác thực */}
        {validationError && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Hoàn tất giao hàng
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
