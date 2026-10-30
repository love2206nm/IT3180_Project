import React from 'react';
import Link from 'next/link';
import { Package, Truck, ShieldCheck, Clock, Search, ArrowRight, Barcode, Phone, Building2, CheckCircle2, User } from 'lucide-react';
import { getCurrentUserSession } from '../presentation/actions/session.helper';
import { USER_ROLE } from '../domain/constants/roles.constant';

/**
 * @file page.tsx (Home)
 * @description Trang chủ cổng thông tin bưu cục DeliveryHub theo chuẩn KiotViet Design System.
 * Thiết kế phẳng, dứt khoát, chuyên nghiệp, đồng bộ nhận diện thương hiệu với phân hệ tác nghiệp bên trong.
 */
export default async function HomePage() {
  const session = await getCurrentUserSession();
  const targetDashboardUrl = session?.role === USER_ROLE.SHIPPER ? '/shipper/deliveries' : '/hub/dashboard';

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col font-sans">
      {/* Topbar Kiot Style Header */}
      <header className="sticky top-0 z-30 flex h-12 w-full items-center justify-between bg-[#0066CC] px-4 text-white shadow-sm sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-white text-[#0066CC] font-bold shadow-xs">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight uppercase">DeliveryHub</span>
              <span className="hidden sm:inline-block ml-2 text-[11px] text-blue-200 border-l border-blue-400 pl-2">
                Hệ Thống Quản Lý Bưu Cục
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/tracking"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-white hover:bg-white/10 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-blue-200" />
            Tra Cứu Vận Đơn
          </Link>
          {session ? (
            <Link
              href={targetDashboardUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white transition-colors shadow-2xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>Bàn Làm Việc ({session.username})</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white transition-colors shadow-2xs"
            >
              Đăng Nhập Cán Bộ
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section: Cổng Tra Cứu Bưu Chính Vận Tải */}
      <main className="flex-1">
        <section className="bg-white border-b border-slate-200 py-10 sm:py-14 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-[#0066CC] text-xs font-semibold">
              <Truck className="w-3.5 h-3.5" />
              <span>Nền Tảng Logistics & Quản Trị Bưu Cục Chuẩn Mực</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Tra Cứu Bưu Gửi & Quản Lý Vận Tải Bưu Cục
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              Kiểm soát lộ trình kiện hàng theo thời gian thực, quản lý nhập xuất kho bưu cục và đối soát dòng tiền thu hộ COD minh bạch.
            </p>

            {/* Khung Tra Cứu Vận Đơn Trọng Tâm */}
            <div className="max-w-2xl mx-auto pt-2">
              <form
                action="/tracking"
                method="GET"
                className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-white rounded-md border-2 border-[#0066CC] shadow-xs"
              >
                <div className="flex items-center w-full pl-3 text-slate-400">
                  <Search className="w-4 h-4 text-[#0066CC] shrink-0" />
                  <input
                    name="code"
                    type="text"
                    placeholder="Nhập mã vận đơn (Ví dụ: TRK-20261030-15MKWY)"
                    className="w-full text-xs sm:text-sm bg-transparent outline-none px-2.5 text-slate-900 font-mono uppercase placeholder:normal-case placeholder:text-slate-400"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 rounded bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Tra Cứu Ngay
                </button>
              </form>

              {/* Gợi Ý Mã Demo Tra Cứu 1-Click */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                <span className="text-[11px] font-medium text-slate-400">Mã bưu gửi mẫu:</span>
                <Link
                  href="/tracking?code=TRK-20261030-15MKWY"
                  className="font-mono text-[11px] font-semibold text-[#0066CC] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                >
                  TRK-20261030-15MKWY
                </Link>
                <Link
                  href="/tracking?code=TRK-20261030-W4TE2Q"
                  className="font-mono text-[11px] font-semibold text-[#0066CC] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                >
                  TRK-20261030-W4TE2Q
                </Link>
                <Link
                  href="/tracking?code=MOCK-TRK-DELIVERED-01"
                  className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                >
                  MOCK-TRK-DELIVERED-01
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Khối Giải Pháp Logistics B2B KiotViet */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <div className="mb-6 text-center">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              Quy Trình Nghiệp Vụ Bưu Cục Khép Kín
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Đồng bộ dữ liệu xuyên suốt giữa khách hàng gửi, điều phối trạm và tài xế giao nhận
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-2xs hover:border-[#0066CC]/50 transition-colors">
              <div className="h-9 w-9 rounded bg-blue-50 text-[#0066CC] flex items-center justify-center mb-3.5 border border-blue-100">
                <Barcode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
                <span>Nhập Xuất Kho & Quét Mã</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tác nghiệp Inbound / Dispatch bằng mã vạch Barcode tốc độ cao, xác thực trạng thái bưu kiện lưu kho bưu cục chuẩn xác từng giây.
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-2xs hover:border-[#16A34A]/50 transition-colors">
              <div className="h-9 w-9 rounded bg-emerald-50 text-[#16A34A] flex items-center justify-center mb-3.5 border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
                <span>Quản Lý Tiền Thu Hộ COD</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bảo vệ dòng tiền chặt chẽ với quy trình đối soát ACID, lập phiên nộp tiền cuối ca giữa nhân viên giao hàng và thủ quỹ trạm.
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-2xs hover:border-[#0066CC]/50 transition-colors">
              <div className="h-9 w-9 rounded bg-blue-50 text-[#0066CC] flex items-center justify-center mb-3.5 border border-blue-100">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
                <span>Kiểm Vết & Minh Bạch Dữ Liệu</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ghi nhận lịch sử kiểm vết bất biến (Audit Trail) cho từng lần đổi trạng thái, tích hợp định vị GPS và ảnh bằng chứng giao hàng POD.
              </p>
            </div>
          </div>

          {/* Quick Access Portal Bưu Cục */}
          <div className="mt-8 rounded-md bg-white border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-[#0066CC] text-white flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Bạn là Cán bộ Bưu cục hoặc Tài xế Shipper?</h4>
                <p className="text-xs text-slate-500">Truy cập ngay vào hệ thống điều phối, xử lý đơn hàng và sổ quỹ trực thuộc</p>
              </div>
            </div>

            <Link
              href={targetDashboardUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-xs uppercase tracking-wide transition-colors shrink-0 shadow-2xs"
            >
              <span>Vào Bàn Làm Việc</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer Kiot Style */}
      <footer className="border-t border-slate-200 bg-white py-5 text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-bold text-slate-800">DeliveryHub</span> - Hệ Thống Quản Lý Bưu Cục Logistics (KiotViet Design System)
            <span className="block text-[11px] text-slate-400 mt-0.5">Dự án Môn học Kỹ thuật Phần mềm (IT3180)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 text-xs">
            <Link href="/tracking" className="hover:text-[#0066CC]">Tra Cứu Vận Đơn</Link>
            <span className="text-slate-300">|</span>
            <Link href="/login" className="hover:text-[#0066CC]">Đăng Nhập Cán Bộ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
