import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Package,
  ArrowLeft,
  Clock,
  MapPin,
  User,
  Shield,
  CreditCard,
  Truck,
} from 'lucide-react';
import { appContainer } from '../../../../infrastructure/di';
import { getCurrentUserSession } from '../../../../presentation/actions/session.helper';
import { Button } from '../../../../presentation/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../presentation/components/ui/card';
import { OrderStatusBadge } from '../../../../presentation/components/ui/badge';
import { OrderTimeline } from '../../../../presentation/components/orders/order-timeline';
import { OrderActionControls } from '../../../../presentation/components/orders/order-action-controls';
import type { TrackingTimelineEventDTO } from '../../../../application/dtos/tracking.dto';

export interface OrderDetailPageProps {
  params: Promise<{ trackingCode: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { trackingCode } = await params;
  const session = await getCurrentUserSession();

  let orderData = null;

  try {
    const result = await appContainer.orders.getOrderDetail().execute(
      { idOrTrackingCode: trackingCode.trim().toUpperCase() },
      session ?? undefined
    );

    if (result.success) {
      orderData = result.data;
    }
  } catch {
    //
  }

  if (!orderData) {
    notFound();
  }

  const { order, logs } = orderData;

  // Ánh xạ audit logs sang định dạng timeline chuyên nghiệp
  const timelineEvents: TrackingTimelineEventDTO[] = (logs || []).map((log) => ({
    status: log.newStatus,
    statusLabel: log.newStatus,
    timestamp: new Date(log.createdAt).toISOString(),
    hubName: log.hubName ?? null,
    locationName: null,
    note: log.note || (log.failureReason ? `Lý do thất bại: ${log.failureReason}` : null),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight">
                {order.trackingCode}
              </h1>
              <OrderStatusBadge status={order.currentStatus} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Khởi tạo lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <OrderActionControls
          orderId={order.id}
          trackingCode={order.trackingCode}
          currentStatus={order.currentStatus}
          initialReceiverName={order.receiverName}
          initialReceiverPhone={order.receiverPhone}
          initialReceiverAddress={order.receiverAddress}
          initialNotes={order.notes}
        />
      </div>

      {/* Grid: 2 columns Info + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Order Details & Addresses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sender & Receiver Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="py-3 px-4 bg-slate-50/50">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Người Gửi Hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-1 text-xs">
                <p className="font-bold text-slate-900 text-sm">{order.senderName}</p>
                <p className="font-mono text-slate-600">{order.senderPhone}</p>
                <p className="text-slate-500 leading-relaxed pt-1">{order.senderAddress}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="py-3 px-4 bg-slate-50/50">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-accent" />
                  Người Nhận Hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-1 text-xs">
                <p className="font-bold text-slate-900 text-sm">{order.receiverName}</p>
                <p className="font-mono text-slate-600">{order.receiverPhone}</p>
                <p className="text-slate-500 leading-relaxed pt-1">
                  {order.receiverAddress}, {order.receiverDistrict}, {order.receiverProvince}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Package & Payment Card */}
          <Card className="border-slate-200">
            <CardHeader className="py-3 px-4 bg-slate-50/50">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                Thông Số Hàng Hóa & Cước Phí
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Khối lượng:</span>
                <p className="font-semibold text-slate-900">{order.weightGram.toLocaleString('vi-VN')} gram</p>
                <p className="text-[11px] text-slate-400">
                  {order.lengthCm}x{order.widthCm}x{order.heightCm} cm
                </p>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Tiền thu hộ COD:</span>
                <p className="font-bold text-accent font-mono text-sm">
                  {order.codAmount.toLocaleString('vi-VN')} ₫
                </p>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Cước phí giao hàng:</span>
                <p className="font-bold text-slate-900 font-mono">
                  {order.shippingFee.toLocaleString('vi-VN')} ₫
                </p>
                <p className="text-[11px] text-slate-400">Người trả: {order.paymentBy}</p>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Shipper phụ trách:</span>
                <p className="font-semibold text-slate-900">
                  {order.assignedShipperName || 'Chưa gán Shipper'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 col): Audit Trail Timeline with OrderTimeline */}
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="py-3 px-4 bg-slate-50/50">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Nhật Ký Kiểm Vết Bất Biến (Audit Trail)
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4">
              <OrderTimeline events={timelineEvents} reverse={true} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
