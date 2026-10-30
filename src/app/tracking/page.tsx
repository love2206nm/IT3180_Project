import React from 'react';
import Link from 'next/link';
import { Package, Search, MapPin, Clock, ArrowLeft, Shield, AlertCircle, Calendar, Barcode, CheckCircle2 } from 'lucide-react';
import { appContainer } from '../../infrastructure/di';
import { OrderStatusBadge } from '../../presentation/components/ui/badge';
import { OrderTimeline } from '../../presentation/components/orders/order-timeline';
import { isSuccess } from '../../application/interfaces';
import type { PublicTrackingOutputDTO } from '../../application/dtos/tracking.dto';

export interface TrackingPageProps {
  searchParams: Promise<{ code?: string }>;
}

/**
 * @file page.tsx (tracking)
 * @description Màn hình Tra cứu vận đơn công khai chuẩn KiotViet Design System.
 * Thiết kế Phiếu Vận Đơn Điện Tử sắc nét, loại bỏ hoàn toàn gradient AI, bảo vệ thông tin cá nhân.
 */
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
      errorMessage = 'Không thể tra cứu vận đơn vào lúc này. Vui lòng kiểm tra lại mã hoặc thử lại sau.';
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col font-sans">
      {/* Top Header Kiot Style */}
      <header className="sticky top-0 z-30 flex h-12 w-full items-center justify-between bg-[#0066CC] px-4 text-white shadow-sm sm:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <div className="h-4 w-px bg-blue-400" />
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-white text-[#0066CC] font-bold text-xs shadow-xs">
              <Package className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-xs sm:text-sm uppercase tracking-wide">
              Tra Cứu Vận Đơn Bưu Cục
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white transition-colors shadow-2xs"
        >
          Đăng Nhập Cán Bộ
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Search Bar Section */}
        <div className="bg-white p-4 sm:p-5 rounded-md border border-slate-200 shadow-2xs space-y-3">
          <div className="text-center space-y-1">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              Theo Dõi Hành Trình Bưu Phẩm
            </h1>
            <p className="text-xs text-slate-500">
              Nhập mã vận đơn để xem chi tiết lịch sử luân chuyển kiện hàng từ bưu cục gửi đến tay người nhận
            </p>
          </div>

          <form action="/tracking" method="GET" className="max-w-xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                name="code"
                defaultValue={trackingCodeQuery || ''}
                placeholder="Nhập mã vận đơn (VD: TRK-20261030-15MKWY)"
                className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded font-mono uppercase placeholder:normal-case placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC]"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Tra Cứu
            </button>
          </form>

          {/* Gợi ý mã mẫu */}
          <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <span>Mã gợi ý:</span>
            <Link
              href="/tracking?code=TRK-20261030-15MKWY"
              className="font-mono text-[11px] text-[#0066CC] hover:underline"
            >
              TRK-20261030-15MKWY
            </Link>
            <span>•</span>
            <Link
              href="/tracking?code=TRK-20261030-W4TE2Q"
              className="font-mono text-[11px] text-[#0066CC] hover:underline"
            >
              TRK-20261030-W4TE2Q
            </Link>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3.5 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-red-900">Không tìm thấy thông tin bưu phẩm</h4>
              <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Tracking Details View: Phiếu Vận Đơn Điện Tử Chuẩn KiotViet */}
        {trackingResult && (
          <div className="space-y-4">
            <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-hidden">
              {/* Header Phiếu Vận Đơn */}
              <div className="bg-[#0066CC] px-4 py-3 sm:px-6 sm:py-3.5 text-white flex flex-wrap items-center justify-between gap-3 border-b border-blue-700">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/10 rounded">
                    <Barcode className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-blue-200">
                      MÃ VẬN ĐƠN BƯU CHÍNH
                    </div>
                    <div className="text-base sm:text-lg font-mono font-bold tracking-tight">
                      {trackingResult.trackingCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <OrderStatusBadge
                    status={trackingResult.currentStatus}
                    className="text-xs px-2.5 py-0.5 font-bold shadow-2xs"
                  />
                </div>
              </div>

              {/* Thông Số Kỹ Thuật Bưu Kiện */}
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 text-xs bg-slate-50/50">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Người nhận:
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{trackingResult.receiverName}</p>
                  <p className="font-mono text-slate-600 flex items-center gap-1 text-xs">
                    <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>SĐT bảo mật: {trackingResult.receiverPhoneMasked}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Khu vực phát hàng:
                  </span>
                  <p className="font-bold text-slate-900 text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{trackingResult.destinationDistrict}, {trackingResult.destinationProvince}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Địa chỉ chi tiết được bảo mật thông tin</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Quy cách bưu kiện:
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    Khối lượng: {trackingResult.weightGram.toLocaleString('vi-VN')} g
                  </p>
                  <p className="text-slate-500 flex items-center gap-1 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Khởi tạo: {new Date(trackingResult.createdAt).toLocaleDateString('vi-VN')}</span>
                  </p>
                </div>
              </div>

              {/* Dòng Thời Gian Lịch Sử Hành Trình (Audit Trail Timeline) */}
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#0066CC]" />
                    <span>Lịch Sử Hành Trình Bưu Gửi Chi Tiết</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Cập nhật mới nhất: {new Date().toLocaleTimeString('vi-VN')}
                  </span>
                </div>

                <OrderTimeline events={trackingResult.timeline} reverse={true} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>© 2026 DeliveryHub - Hệ Thống Quản Lý Bưu Cục KiotViet Design System.</p>
      </footer>
    </div>
  );
}
