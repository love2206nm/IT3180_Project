'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../../../presentation/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../presentation/components/ui/table';
import { OrderStatusBadge } from '../../../../presentation/components/ui/badge';
import { ORDER_STATUS } from '../../../../domain/constants/order-status.constant';
import { useServerAction } from '../../../../presentation/hooks/use-server-action';
import { useAudioFeedback } from '../../../../presentation/hooks/use-audio-feedback';
import { processReturnOrderAction } from '../../../../presentation/actions/shipment.actions';
import { getOrderListAction } from '../../../../presentation/actions/order.actions';

interface ReturnOrderItem {
  id: string;
  trackingCode: string;
  senderName: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  reason: string;
  attempts: number;
}

export default function ShipmentReturnsPage() {
  const [returnOrders, setReturnOrders] = useState<ReturnOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const { playSuccess, playError } = useAudioFeedback();

  const loadReturnOrders = async () => {
    setIsLoading(true);
    try {
      const res = await getOrderListAction({ page: 1, limit: 50, status: ORDER_STATUS.RETURN_PENDING });
      if (res.success) {
        setReturnOrders(
          res.data.items.map((ord) => ({
            id: ord.id,
            trackingCode: ord.trackingCode,
            senderName: ord.senderName,
            senderAddress: 'Kho gửi hàng ban đầu',
            receiverName: ord.receiverName,
            receiverPhone: ord.receiverPhone,
            reason: 'Khách hàng từ chối nhận hoặc vượt quá số lần phát',
            attempts: ord.deliveryAttempts ?? 3,
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
    loadReturnOrders();
  }, []);

  const { execute: executeReturn, isPending } = useServerAction(processReturnOrderAction, {
    onSuccess: (data) => {
      playSuccess();
      setMessage(`Đã hoàn tất thủ tục xuất chuyển hoàn đơn #${data.orderId} về cho người gửi (RETURNED).`);
      loadReturnOrders();
    },
    onError: (err) => {
      playError();
      setMessage(`Xử lý chuyển hoàn thất bại: ${err}`);
    },
  });

  const handleProcessReturn = async (id: string) => {
    if (window.confirm('Xác nhận hoàn trả bưu kiện này về cho người gửi ban đầu?')) {
      await executeReturn({
        orderId: id,
        hubId: '',
        note: 'Xuất hoàn kho bưu cục về người gửi',
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/hub/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-purple-600" />
              Xử Lý Hàng Chuyển Hoàn
            </h1>
            <p className="text-xs text-slate-500">
              Kiểm soát các đơn giao thất bại 3 lần hoặc khách từ chối nhận, thực hiện hoàn trả hàng cho Shop gửi
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadReturnOrders} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Làm Mới
        </Button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Returns Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã Vận Đơn</TableHead>
            <TableHead>Người Gửi (Nơi Hoàn Về)</TableHead>
            <TableHead>Người Nhận</TableHead>
            <TableHead>Lý Do Chuyển Hoàn</TableHead>
            <TableHead>Số Lần Thử</TableHead>
            <TableHead className="text-right">Thao Tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                Đang tải danh sách hàng chuyển hoàn...
              </TableCell>
            </TableRow>
          ) : returnOrders.length > 0 ? (
            returnOrders.map((ord) => (
              <TableRow key={ord.id}>
                <TableCell className="font-mono font-bold text-primary">{ord.trackingCode}</TableCell>
                <TableCell>
                  <p className="font-semibold text-slate-900 text-xs">{ord.senderName}</p>
                  <p className="text-[11px] text-slate-500">{ord.senderAddress}</p>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-slate-900 text-xs">{ord.receiverName}</p>
                  <p className="font-mono text-[11px] text-slate-500">{ord.receiverPhone}</p>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-rose-600 font-medium">{ord.reason}</span>
                </TableCell>
                <TableCell className="font-mono text-xs">{ord.attempts} / 3 lần</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleProcessReturn(ord.id)}
                    disabled={isPending}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs font-semibold"
                  >
                    Xác Nhận Xuất Hoàn
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                Không có đơn hàng nào đang chờ xử lý chuyển hoàn (RETURN_PENDING).
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
