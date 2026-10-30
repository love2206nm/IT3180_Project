import React from 'react';
import Link from 'next/link';
import {
  Package,
  Truck,
  CheckCircle2,
  Wallet,
  ScanBarcode,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { appContainer } from '../../../../infrastructure/di';
import { getCurrentUserSession } from '../../../../presentation/actions/session.helper';
import { Button } from '../../../../presentation/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../presentation/components/ui/card';
import { OrderStatusBadge } from '../../../../presentation/components/ui/badge';
import { ORDER_STATUS, type OrderStatus } from '../../../../domain/constants/order-status.constant';

export default async function HubDashboardPage() {
  const session = await getCurrentUserSession();
  const targetHubId = session?.hubId ?? undefined;

  let statsData = null;
  if (session) {
    const statsResult = await appContainer.cod.getHubStatistics().execute(
      { hubId: targetHubId },
      session
    );
    if (statsResult.success) {
      statsData = statsResult.data;
    }
  }

  const totalOrders = statsData?.totalOrders ?? 0;
  const statusBreakdown = statsData?.statusBreakdown ?? ({} as Record<OrderStatus, number>);
  const deliveredCount = statusBreakdown[ORDER_STATUS.DELIVERED] ?? 0;
  const outForDeliveryCount = statusBreakdown[ORDER_STATUS.OUT_FOR_DELIVERY] ?? 0;
  const atHubCount = statusBreakdown[ORDER_STATUS.AT_HUB] ?? 0;
  const failedCount = (statusBreakdown[ORDER_STATUS.FAILED_ATTEMPT] ?? 0) + (statusBreakdown[ORDER_STATUS.RETURN_PENDING] ?? 0);
  const totalCodCollected = statsData?.totalCodCollected ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Bảng Điều Khiển Vận Hành Bưu Cục
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát thời gian thực số lượng bưu phẩm, phân phối tuyến giao và thu hồi tiền mặt COD (UC21)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/shipments/inbound">
            <Button variant="primary" size="sm" className="font-semibold shadow-xs">
              <ScanBarcode className="w-4 h-4 mr-1.5" />
              Quét Inbound Nhập Kho
            </Button>
          </Link>
          <Link href="/shipments/dispatch">
            <Button variant="accent" size="sm" className="font-semibold shadow-xs">
              <Truck className="w-4 h-4 mr-1.5" />
              Bàn Giao Tuyến
            </Button>
          </Link>
          <Link href="/orders/create">
            <Button variant="secondary" size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5 text-slate-600" />
              Tạo Đơn Quầy
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 KPI Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Đang Lưu Kho */}
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đơn Đang Lưu Kho</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">{atHubCount}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Chờ chia tuyến giao phát</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 text-primary flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Đang Đi Giao */}
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang Đi Giao</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">{outForDeliveryCount}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Shipper đang trên đường</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Giao Thành Công */}
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Giao Thành Công</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{deliveredCount}</h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Tỷ lệ: {totalOrders > 0 ? ((deliveredCount / totalOrders) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Tiền COD Đã Thu */}
        <Card className="border-orange-100 bg-gradient-to-br from-orange-50/50 to-white">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiền COD Đã Thu</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-accent mt-1">
                {totalCodCollected.toLocaleString('vi-VN')} đ
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Cần đối soát nộp thủ quỹ</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 text-accent flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Status Breakdown & Shipper Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Status Breakdown Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Phân Bổ Trạng Thái Đơn Hàng</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Thống kê chi tiết từng giai đoạn trong chuỗi cung ứng</p>
              </div>
              <Link href="/orders" className="text-xs font-semibold text-primary hover:underline">
                Xem tất cả đơn &rarr;
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                {Object.values(ORDER_STATUS).map((status) => {
                  const count = statusBreakdown[status] ?? 0;
                  const percentage = totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(0) : 0;

                  return (
                    <div key={status} className="flex items-center justify-between p-3 sm:px-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <OrderStatusBadge status={status} />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="font-mono font-bold text-slate-900 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right (1 col): Shipper KPI Performance Ranking */}
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Hiệu Suất Shipper
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Xếp hạng giao phát hôm nay</p>
              </div>
              <Link href="/hub/staff" className="text-xs font-semibold text-primary hover:underline">
                Quản lý &rarr;
              </Link>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {statsData?.shipperPerformance && statsData.shipperPerformance.length > 0 ? (
                statsData.shipperPerformance.map((shipper, idx) => (
                  <div key={shipper.shipperId} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">{shipper.shipperName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {shipper.totalDelivered}/{shipper.totalAssigned} đơn hoàn tất
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-600 block">
                        {shipper.successRate.toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        COD: {shipper.totalCodCollected.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  Chưa có dữ liệu giao phát của Shipper trong ngày.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

