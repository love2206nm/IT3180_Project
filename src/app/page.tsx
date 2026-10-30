import React from 'react';
import Link from 'next/link';
import { Package, Truck, ShieldCheck, Clock, ArrowRight, Search } from 'lucide-react';
import { Button } from '../presentation/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
            <Package className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">DeliveryHub</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/tracking">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Search className="w-4 h-4 mr-1 text-slate-500" />
              Tra Cứu Vận Đơn
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="primary" size="sm">
              Đăng Nhập Quản Trị
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-blue-50/50 to-transparent">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-primary text-xs font-semibold">
              <Truck className="w-3.5 h-3.5" />
              Hệ Thống Bưu Cục Điều Phối Thế Hệ Mới
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Quản Lý Vận Tải, Bưu Cục & <br />
              <span className="text-primary">Kiểm Soát Thu Hộ COD Thời Gian Thực</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              Nền tảng công nghệ logistics đồng bộ dữ liệu xuyên suốt giữa khách hàng,
              nhân viên trạm kiểm soát nhập kho và tài xế giao hàng chặng cuối.
            </p>

            {/* Quick Public Tracking Search Widget */}
            <div className="max-w-xl mx-auto pt-4">
              <form action="/tracking" method="GET" className="flex items-center gap-2 p-1.5 bg-white rounded-2xl shadow-lg border border-slate-200">
                <div className="flex items-center pl-3 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  name="code"
                  type="text"
                  placeholder="Nhập mã vận đơn (Ví dụ: MOCK-TRK-DELIVERED-01)"
                  className="w-full text-sm bg-transparent outline-none px-2 text-slate-900 font-mono placeholder:text-slate-400"
                  required
                />
                <Button type="submit" variant="accent" size="md" className="rounded-xl font-semibold">
                  Tra Cứu Ngay
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Tra Cứu Minh Bạch</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Theo dõi lịch sử đơn hàng theo dòng thời gian chuẩn xác, tự động che bảo mật số điện thoại người nhận.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-accent flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Bảo Vệ Dòng Tiền COD</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Quy trình giao nhận ACID, đối soát nộp tiền COD cuối ca chặt chẽ giữa tài xế và quản lý trạm.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Điều Phối Thông Minh</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Chia tuyến giao hàng tự động theo khu vực Phường/Xã, hỗ trợ súng quét barcode tốc độ cao tại cửa kho.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 DeliveryHub Management System - Dự án Môn học IT3180 (Software Engineering).</p>
      </footer>
    </div>
  );
}

