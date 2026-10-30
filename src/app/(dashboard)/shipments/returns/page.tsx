'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RotateCcw, ArrowLeft, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { Button } from '../../../../presentation/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../presentation/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../presentation/components/ui/table';
import { OrderStatusBadge } from '../../../../presentation/components/ui/badge';
import { ORDER_STATUS } from '../../../../domain/constants/order-status.constant';

export default function ReturnsManagementPage() {
  const [returnOrders, setReturnOrders] = useState([
    {
      id: 'ord-ret-01',
      trackingCode: 'MOCK-TRK-FAIL3-01',
      senderName: 'Shop Quần Áo Nam',
      senderPhone: '0988111222',
      receiverName: 'Khách Hàng Từ Chối',
      receiverPhone: '0912999888',
      reason: 'Khách từ chối nhận hàng (CUSTOMER_REJECTED)',
      attempts: 3,
      status: ORDER_STATUS.RETURN_PENDING,
    },
  ]);

  const [message, setMessage] = useState<string | null>(null);

  const handleProcessReturn = (id: string, code: string) => {
    // Xử lý chuyển hoàn (UC20)
    setReturnOrders((prev) => prev.filter((o) => o.id !== id));
    setMessage(`Đã hoàn tất thủ tục xuất chuyển hoàn đơn ${code} về cho người gửi (RETURNED).`);
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
              Xử Lý Hàng Chuyển Hoàn (UC20)
            </h1>
            <p className="text-xs text-slate-500">
              Kiểm soát các đơn giao thất bại 3 lần hoặc khách từ chối nhận, thực hiện hoàn trả hàng cho Shop gửi
            </p>
          </div>
        </div>
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
            <TableHead>Lý Do Hoàn</TableHead>
            <TableHead>Số Lần Giao</TableHead>
            <TableHead>Trạng Thái</TableHead>
            <TableHead className="text-right">Thao Tác</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {returnOrders.length > 0 ? (
            returnOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono font-bold text-primary">{order.trackingCode}</TableCell>
                <TableCell>
                  <p className="font-semibold text-slate-900 text-xs">{order.senderName}</p>
                  <p className="font-mono text-slate-500 text-[11px]">{order.senderPhone}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-slate-800">{order.receiverName}</p>
                </TableCell>
                <TableCell className="text-xs text-red-600 font-medium">{order.reason}</TableCell>
                <TableCell className="font-mono text-xs">{order.attempts} lần</TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleProcessReturn(order.id, order.trackingCode)}
                    className="text-xs"
                  >
                    Hoàn Tất Trả Hàng
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                Hiện không có đơn hàng nào đang trong diện chờ chuyển hoàn (RETURN_PENDING).
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

