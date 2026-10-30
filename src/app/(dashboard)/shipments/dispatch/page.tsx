'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Truck, ArrowLeft, CheckCircle2, User, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../../../presentation/components/ui/button';
import { Card, CardContent } from '../../../../presentation/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../presentation/components/ui/table';
import { OrderStatusBadge } from '../../../../presentation/components/ui/badge';
import { ORDER_STATUS } from '../../../../domain/constants/order-status.constant';
import { USER_ROLE } from '../../../../domain/constants/roles.constant';
import { useServerAction } from '../../../../presentation/hooks/use-server-action';
import { useAudioFeedback } from '../../../../presentation/hooks/use-audio-feedback';
import { assignOrdersToShipperAction } from '../../../../presentation/actions/shipment.actions';
import { getOrderListAction } from '../../../../presentation/actions/order.actions';
import { getStaffListAction } from '../../../../presentation/actions/staff.actions';

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

interface ShipperOption {
  id: string;
  name: string;
  phone: string;
  zone: string;
}

export default function DispatchOrdersPage() {
  const [ordersAtHub, setOrdersAtHub] = useState<OrderDispatchItem[]>([]);
  const [shippersList, setShippersList] = useState<ShipperOption[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedShipperId, setSelectedShipperId] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { playSuccess, playError } = useAudioFeedback();

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [orderRes, staffRes] = await Promise.all([
        getOrderListAction({ page: 1, limit: 50, status: ORDER_STATUS.AT_HUB }),
        getStaffListAction({ page: 1, limit: 50, role: USER_ROLE.SHIPPER }),
      ]);

      if (orderRes.success) {
        setOrdersAtHub(
          orderRes.data.items.map((ord) => ({
            id: ord.id,
            trackingCode: ord.trackingCode,
            receiverName: ord.receiverName,
            receiverPhone: ord.receiverPhone,
            receiverAddress: `${ord.receiverDistrict}, ${ord.receiverProvince}`,
            ward: ord.receiverDistrict || '',
            weightGram: ord.weightGram,
            codAmount: ord.codAmount,
          }))
        );
      }

      if (staffRes.success) {
        setShippersList(
          staffRes.data.items.map((s) => ({
            id: s.id,
            name: s.fullName,
            phone: s.phone,
            zone: s.hubName || 'Khu vực bưu cục',
          }))
        );
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const { execute: executeAssign, isPending } = useServerAction(assignOrdersToShipperAction, {
    onSuccess: (data) => {
      playSuccess();
      setNotification({
        type: 'success',
        message: `Đã bàn giao thành công ${data.assignedCount} đơn hàng cho Shipper đi phát!`,
      });
      setSelectedOrderIds([]);
      loadData();
    },
    onError: (err) => {
      playError();
      setNotification({
        type: 'error',
        message: `Bàn giao thất bại: ${err}`,
      });
    },
  });

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === ordersAtHub.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(ordersAtHub.map((o) => o.id));
    }
  };

  const handleDispatchBatch = async () => {
    if (selectedOrderIds.length === 0 || !selectedShipperId) return;
    await executeAssign({
      orderIds: selectedOrderIds,
      shipperId: selectedShipperId,
      hubId: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/hub/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-accent" />
              Bàn Giao & Gán Tuyến Cho Shipper
            </h1>
            <p className="text-xs text-slate-500">
              Lọc các đơn hàng lưu kho tại trạm (AT_HUB), chọn hàng loạt theo Tuyến/Phường và bàn giao cho Shipper đi phát
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoadingData}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingData ? 'animate-spin' : ''}`} />
          Làm Mới
        </Button>
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
              {shippersList.map((shipper) => (
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
          {isLoadingData ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                Đang tải danh sách đơn lưu kho...
              </TableCell>
            </TableRow>
          ) : ordersAtHub.length > 0 ? (
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
