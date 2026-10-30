'use client';

import React, { useState } from 'react';
import { Wallet, CheckCircle2, Package, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../../../presentation/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../presentation/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../presentation/components/ui/table';

export default function ShipperCODSettlementPage() {
  const [deliveredOrders, setDeliveredOrders] = useState([
    {
      id: 'ord-del-01',
      trackingCode: 'MOCK-TRK-DELIVERED-01',
      receiverName: 'Đặng Ngọc Ánh',
      codAmount: 300000,
      deliveredAt: '2026-10-30 09:15',
    },
    {
      id: 'ord-del-02',
      trackingCode: 'MOCK-TRK-DELIVERED-02',
      receiverName: 'Lê Thu Trang',
      codAmount: 150000,
      deliveredAt: '2026-10-30 10:20',
    },
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>(['ord-del-01', 'ord-del-02']);
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);

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

    const code = `COD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setSettlementSuccess(`Đã tạo phiên nộp tiền COD ${code} thành công! Vui lòng nộp ${totalSelectedCOD.toLocaleString('vi-VN')} đ tiền mặt cho Quản lý trạm để duyệt.`);
    setDeliveredOrders((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent" />
          Nộp Tiền Thu Hộ COD Cuối Ca (UC22)
        </h1>
        <p className="text-xs text-slate-500">
          Gom danh sách đơn hàng đã thu tiền mặt và tạo phiên bàn giao nộp tiền cho Quản lý trạm
        </p>
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

        {deliveredOrders.length > 0 ? (
          deliveredOrders.map((order) => {
            const isSelected = selectedIds.includes(order.id);
            return (
              <div
                key={order.id}
                onClick={() => handleToggleSelect(order.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-orange-50/70 border-accent shadow-xs' : 'bg-white border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(order.id)}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 block">{order.trackingCode}</span>
                    <span className="text-[11px] text-slate-500">{order.receiverName} &bull; {order.deliveredAt}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-extrabold text-accent block">
                    {order.codAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400 text-xs">
            Không còn đơn hàng COD nào cần nộp.
          </div>
        )}
      </div>

      {/* Submit Button */}
      {deliveredOrders.length > 0 && (
        <div className="pt-2">
          <Button
            variant="accent"
            size="lg"
            disabled={selectedIds.length === 0}
            onClick={handleCreateSettlement}
            className="w-full font-bold shadow-md h-12 rounded-xl text-sm"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Tạo Phiên Nộp Tiền ({totalSelectedCOD.toLocaleString('vi-VN')} đ)
          </Button>
        </div>
      )}
    </div>
  );
}

