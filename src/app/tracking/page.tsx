import React from 'react';
import Link from 'next/link';
import { Package, Search, MapPin, Clock, ArrowLeft, Shield, AlertCircle, Calendar } from 'lucide-react';
import { appContainer } from '../../infrastructure/di';
import { OrderStatusBadge } from '../../presentation/components/ui/badge';
import { Button } from '../../presentation/components/ui/button';
import { Card } from '../../presentation/components/ui/card';
import { OrderTimeline } from '../../presentation/components/orders/order-timeline';
import { isSuccess } from '../../application/interfaces';
import type { PublicTrackingOutputDTO } from '../../application/dtos/tracking.dto';

export interface TrackingPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function TrackingPage({ searchParams }: TrackingPageProps) {
  const { code } = await searchParams;
  const trackingCodeQuery = code?.trim().toUpperCase();

  let trackingResult: PublicTrackingOutputDTO | null = null;
  let errorMessage: string | null = null;

  if (trackingCodeQuery) {
    try {
      const result = await appContainer.orders.getPublicTracking().execute({
        trackingCode: trackingCodeQuery,
      });

      if (isSuccess(result)) {
        trackingResult = result.data;
      } else {
        errorMessage = result.error;
      }
    } catch {
      errorMessage = 'Không thể tra cứu vận đơn vào lúc này. Vui lòng thử lại sau.';
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-800 hover:text-primary transition-colors text-xs">
            <ArrowLeft className="w-4 h-4" />
            Trang chủ
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <span className="font-semibold text-sm text-slate-900">Tra Cứu Vận Đơn Công Khai</span>
        </div>

        <Link href="/login">
          <Button variant="outline" size="sm" className="text-xs">
            Cán bộ đăng nhập
          </Button>
        </Link>
      </header>

      {/* Search Bar Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="text-center space-y-2 py-4">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Theo Dõi Hành Trình Đơn Hàng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Nhập mã vận đơn bưu phẩm để xem dòng thời gian di chuyển thực tế từ trạm xuất phát đến tay người nhận.
          </p>

          <form action="/tracking" method="GET" className="max-w-xl mx-auto pt-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                name="code"
                defaultValue={trackingCodeQuery || ''}
                placeholder="Nhập mã vận đơn (VD: TRK-20261029-A1B2C3)"
                className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent uppercase placeholder:normal-case"
                required
              />
            </div>
            <Button type="submit" variant="primary" size="md" className="rounded-xl font-semibold">
              Tra Cứu
            </Button>
          </form>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-900">Không tìm thấy thông tin</h4>
              <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Tracking Details View */}
        {trackingResult && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Header Card */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6 text-white flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Mã Vận Đơn</div>
                  <div className="text-xl sm:text-2xl font-mono font-bold">{trackingResult.trackingCode}</div>
                </div>

                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={trackingResult.currentStatus} className="text-xs px-3 py-1 bg-white/20 text-white border-white/30 backdrop-blur-xs" />
                </div>
              </div>

              {/* General Package Info Grid */}
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-b border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Người nhận:</span>
                  <p className="font-semibold text-slate-800 text-sm">{trackingResult.receiverName}</p>
                  <p className="font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-600 inline" />
                    SĐT bảo mật: {trackingResult.receiverPhoneMasked}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Khu vực giao hàng:</span>
                  <p className="text-slate-800 leading-relaxed font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 inline shrink-0" />
                    {trackingResult.destinationDistrict}, {trackingResult.destinationProvince}
                  </p>
                  <span className="text-[11px] text-slate-400">Địa chỉ chi tiết được bảo vệ quyền riêng tư</span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Thông tin kiện hàng:</span>
                  <p className="text-slate-800 font-medium">Khối lượng: {trackingResult.weightGram.toLocaleString('vi-VN')} g</p>
                  <p className="text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 inline" />
                    Khởi tạo: {new Date(trackingResult.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Stepper Timeline Section with OrderTimeline */}
              <div className="p-4 sm:p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Lịch Sử Hành Trình Chi Tiết
                </h3>

                <OrderTimeline events={trackingResult.timeline} reverse={true} />
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
