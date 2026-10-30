'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Wallet, CheckCircle2, Package, ArrowRight, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '../../../presentation/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../presentation/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../presentation/components/ui/table';
import { createCODSettlementAction } from '../../../presentation/actions/cod.actions';
import { getOrderListAction } from '../../../presentation/actions/order.actions';
import { ORDER_STATUS } from '../../../domain/constants/order-status.constant';
import { useAudioFeedback } from '../../../presentation/hooks/use-audio-feedback';
import { isSuccess, isFailure } from '../../../application/interfaces';

interface DeliveredOrderItem {
  id: string;
  trackingCode: string;
  receiverName: string;
  codAmount: number;
  deliveredAt: string;
}

export default function ShipperCODSettlementPage() {
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { playSuccess, playError } = useAudioFeedback();

  const loadDeliveredOrders = async () => {
    setIsLoading(true);
    try {
      const res = await getOrderListAction({ page: 1, limit: 50, status: ORDER_STATUS.DELIVERED });
      if (res.success) {
        const codOrders = res.data.items
          .filter((ord) => ord.codAmount > 0)
          .map((ord) => ({
            id: ord.id,
            trackingCode: ord.trackingCode,
            receiverName: ord.receiverName,
            codAmount: ord.codAmount,
            deliveredAt: new Date(ord.createdAt).toLocaleDateString('vi-VN'),
          }));
        setDeliveredOrders(codOrders);
        setSelectedIds(codOrders.map((o) => o.id));
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveredOrders();
  }, []);

  const totalSelectedCOD = deliveredOrders
    .filter((o) => selectedIds.includes(o.id))
    .reduce((sum, o) => sum + o.codAmount, 0);

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateSettlement = () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 đơn đã thu tiền COD để nộp');
      return;
    }

    setErrorMessage(null);
    setSettlementSuccess(null);

    startTransition(async () => {
      const res = await createCODSettlementAction({
        hubId: '',
        orderIds: selectedIds,
        notes: 'Bàn giao tiền COD cuối ca',
      });

      if (isSuccess(res)) {
        playSuccess();
        setSettlementSuccess(
          `Đã tạo phiên nộp tiền COD ${res.data.settlementCode} thành công! Vui lòng nộp ${res.data.totalCodAmount.toLocaleString('vi-VN')} đ tiền mặt cho Quản lý trạm để đối soát.`
        );
        setDeliveredOrders((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
        setSelectedIds([]);
      } else if (isFailure(res)) {
        playError();
        setErrorMessage(res.error || 'Tạo phiên nộp tiền thất bại');
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-accent" />
            Nộp Tiền Thu Hộ COD Cuối Ca
          </h1>
          <p className="text-xs text-slate-500">
            Gom danh sách đơn hàng đã thu tiền mặt và tạo phiên bàn giao nộp tiền cho Quản lý trạm
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={loadDeliveredOrders} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {settlementSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Tạo Phiên Nộp Tiền Thành Công!
          </div>
          <p className="text-[11px] leading-relaxed text-emerald-700">{settlementSuccess}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary Box */}
      <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl text-white shadow-md space-y-2">
        <span className="text-xs text-orange-100 font-semibold uppercase tracking-wider block">
          Tổng Tiền COD Cần Bàn Giao
        </span>
        <div className="text-2xl font-black font-mono">
          {totalSelectedCOD.toLocaleString('vi-VN')} VNĐ
        </div>
        <p className="text-[11px] text-orange-100">
          Đang chọn: {selectedIds.length} / {deliveredOrders.length} đơn hàng đã giao thành công
        </p>
      </div>

      {/* Orders List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
          Chọn đơn hàng để kết chuyển nộp tiền:
        </h3>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Đang tải danh sách đơn đã giao...
          </div>
        ) : deliveredOrders.length > 0 ? (
          deliveredOrders.map((order) => {
            const isSelected = selectedIds.includes(order.id);
            return (
              <div
                key={order.id}
                onClick={() => handleToggleSelect(order.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(order.id)}
                    className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 block">
                      {order.trackingCode}
                    </span>
                    <span className="text-[11px] text-slate-500">Khách: {order.receiverName}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-emerald-700 block">
                    +{order.codAmount.toLocaleString('vi-VN')} ₫
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {order.deliveredAt}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
            Hiện không có đơn hàng DELIVERED nào có tiền COD cần nộp.
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        variant="accent"
        size="lg"
        onClick={handleCreateSettlement}
        disabled={selectedIds.length === 0 || isPending}
        isLoading={isPending}
        className="w-full font-bold shadow-md h-12"
      >
        <Wallet className="w-4 h-4 mr-2" />
        Xác Nhận Nộp {totalSelectedCOD.toLocaleString('vi-VN')} ₫
      </Button>
    </div>
  );
}
