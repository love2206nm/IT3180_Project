'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Truck, ArrowLeft, CheckCircle2, User, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../../../presentation/components/ui/button';
import { Card, CardContent } from '../../../../presentation/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../presentation/components/ui/table';
import { OrderStatusBadge } from '../../../../presentation/components/ui/badge';
import { ORDER_STATUS } from '../../../../domain/constants/order-status.constant';
import { useServerAction } from '../../../../presentation/hooks/use-server-action';
import { useAudioFeedback } from '../../../../presentation/hooks/use-audio-feedback';
import { assignOrdersToShipperAction } from '../../../../presentation/actions/shipment.actions';

interface OrderDispatchItem {
  id: string;
  trackingCode: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  ward: string;
  weightGram: number;
  codAmount: number;
}

const INITIAL_ORDERS_AT_HUB: OrderDispatchItem[] = [
  {
    id: 'ord-101',
    trackingCode: 'MOCK-TRK-ATHUB-01',
    receiverName: 'Nguyễn Văn Minh',
    receiverPhone: '0912000222',
    receiverAddress: 'Số 22 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    ward: 'Dịch Vọng Hậu',
    weightGram: 1000,
    codAmount: 0,
  },
  {
    id: 'ord-102',
    trackingCode: 'MOCK-TRK-ATHUB-02',
    receiverName: 'Lê Thu Trang',
    receiverPhone: '0912000333',
    receiverAddress: 'Số 33 Trần Thái Tông, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    ward: 'Dịch Vọng Hậu',
    weightGram: 350,
    codAmount: 150000,
  },
  {
    id: 'ord-103',
    trackingCode: 'MOCK-TRK-ATHUB-03',
    receiverName: 'Vũ Quốc Huy',
    receiverPhone: '0912000555',
    receiverAddress: 'Số 5 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội',
    ward: 'Mai Dịch',
    weightGram: 500,
    codAmount: 220000,
  },
];

const SHIPPERS_LIST = [
  { id: 'mock_shipper1', name: 'Nguyễn Văn Giao Hàng (Shipper 1)', phone: '0901234567', zone: 'Tuyến Dịch Vọng Hậu' },
  { id: 'mock_shipper2', name: 'Trần Văn Vận Chuyển (Shipper 2)', phone: '0902345678', zone: 'Tuyến Mai Dịch' },
];

export default function DispatchShipmentsPage() {
  const [ordersAtHub, setOrdersAtHub] = useState<OrderDispatchItem[]>(INITIAL_ORDERS_AT_HUB);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedShipperId, setSelectedShipperId] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { playSuccess, playError } = useAudioFeedback();

  const { execute: executeDispatch, isPending } = useServerAction(
    assignOrdersToShipperAction,
    {
      onSuccess: (result) => {
        playSuccess();
        const shipperName = SHIPPERS_LIST.find((s) => s.id === selectedShipperId)?.name || selectedShipperId;
        const count = result.assignedCount ?? selectedOrderIds.length;
        setNotification({
          type: 'success',
          message: `Đã bàn giao thành công ${count} đơn hàng cho bưu tá ${shipperName}! Các đơn đã chuyển sang trạng thái OUT_FOR_DELIVERY.`,
        });
        setOrdersAtHub((prev) => prev.filter((o) => !selectedOrderIds.includes(o.id)));
        setSelectedOrderIds([]);
      },
      onError: (err) => {
        playError();
        setNotification({
          type: 'error',
          message: `Bàn giao thất bại: ${err}`,
        });
      },
    }
  );

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === ordersAtHub.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(ordersAtHub.map((o) => o.id));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((item) => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const handleDispatchBatch = async () => {
    if (selectedOrderIds.length === 0 || !selectedShipperId) return;

    await executeDispatch({
      orderIds: selectedOrderIds,
      shipperId: selectedShipperId,
      hubId: '1',
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-accent" />
              Bàn Giao & Gán Tuyến Cho Shipper (UC16)
            </h1>
            <p className="text-xs text-slate-500">
              Lọc các đơn hàng lưu kho tại trạm (AT_HUB), chọn hàng loạt theo Tuyến/Phường và bàn giao cho Shipper đi phát
            </p>
          </div>
        </div>
      </div>

      {/* Thông báo kết quả */}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotification(null)}
            className={notification.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Dispatching Control Bar */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" />
              Chọn Shipper nhận hàng:
            </label>
            <select
              value={selectedShipperId}
              onChange={(e) => setSelectedShipperId(e.target.value)}
              disabled={isPending}
              className="h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary min-w-[260px]"
            >
              <option value="">-- Chọn nhân viên giao hàng --</option>
              {SHIPPERS_LIST.map((shipper) => (
                <option key={shipper.id} value={shipper.id}>
                  {shipper.name} ({shipper.zone})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono">
              Đã chọn: <strong className="text-primary">{selectedOrderIds.length}</strong> đơn
            </span>
            <Button
              variant="accent"
              size="md"
              disabled={selectedOrderIds.length === 0 || !selectedShipperId || isPending}
              isLoading={isPending}
              onClick={handleDispatchBatch}
              className="font-semibold shadow-xs"
            >
              <Truck className="w-4 h-4 mr-1.5" />
              Bàn Giao Xuất Kho Đi Phát
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table with Batch Checkbox */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">
              <input
                type="checkbox"
                checked={selectedOrderIds.length > 0 && selectedOrderIds.length === ordersAtHub.length}
                onChange={handleToggleSelectAll}
                disabled={ordersAtHub.length === 0 || isPending}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
            </TableHead>
            <TableHead>Mã Vận Đơn</TableHead>
            <TableHead>Người Nhận & Số Điện Thoại</TableHead>
            <TableHead>Địa Chỉ Chi Tiết (Phường / Tuyến)</TableHead>
            <TableHead>Khối Lượng</TableHead>
            <TableHead>Tiền Thu Hộ COD</TableHead>
            <TableHead>Trạng Thái</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {ordersAtHub.length > 0 ? (
            ordersAtHub.map((order) => {
              const isSelected = selectedOrderIds.includes(order.id);
              return (
                <TableRow
                  key={order.id}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                  onClick={() => handleToggleSelectOrder(order.id)}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOrder(order.id)}
                      disabled={isPending}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary">{order.trackingCode}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-slate-900 text-xs">{order.receiverName}</p>
                    <p className="font-mono text-slate-500 text-[11px]">{order.receiverPhone}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-slate-800 leading-snug">{order.receiverAddress}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                      {order.ward}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{order.weightGram.toLocaleString('vi-VN')} g</TableCell>
                  <TableCell className="font-mono font-bold text-accent text-xs">
                    {order.codAmount > 0 ? `${order.codAmount.toLocaleString('vi-VN')} ₫` : '0 ₫'}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={ORDER_STATUS.AT_HUB} />
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                Không có đơn hàng nào đang lưu kho (AT_HUB) chờ gán tuyến.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
