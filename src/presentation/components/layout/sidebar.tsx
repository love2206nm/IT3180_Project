'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  ScanBarcode,
  Truck,
  RotateCcw,
  Users,
  BadgeDollarSign,
  Search,
} from 'lucide-react';
import { cn } from '../ui/utils';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navigationGroups = [
    {
      title: 'TỔNG QUAN',
      items: [
        { label: 'Bảng Điều Khiển', href: '/hub/dashboard', icon: LayoutDashboard },
        { label: 'Tra Cứu Vận Đơn', href: '/tracking', icon: Search },
      ],
    },
    {
      title: 'QUẢN LÝ ĐƠN HÀNG',
      items: [
        { label: 'Tạo Đơn Tại Quầy', href: '/orders/create', icon: PlusCircle },
        { label: 'Danh Sách Đơn Hàng', href: '/orders', icon: Package },
        { label: 'Nhập Đơn Hàng Loạt', href: '/orders/import', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'VẬN HÀNH & ĐIỀU PHỐI',
      items: [
        { label: 'Quét Inbound Nhập Kho', href: '/shipments/inbound', icon: ScanBarcode },
        { label: 'Bàn Giao & Gán Tuyến', href: '/shipments/dispatch', icon: Truck },
        { label: 'Xử Lý Hàng Hoàn', href: '/shipments/returns', icon: RotateCcw },
      ],
    },
    {
      title: 'QUẢN TRỊ & TÀI CHÍNH',
      items: [
        { label: 'Nhân Sự & Tuyến Bưu Cục', href: '/hub/staff', icon: Users },
        { label: 'Duyệt Đối Soát COD', href: '/hub/cod-settlements', icon: BadgeDollarSign },
      ],
    },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white min-h-screen select-none">
      {/* Brand Logo Header */}
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
          <Package className="h-4 w-4" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
            DeliveryHub
          </span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Station Operations
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-5 px-3 py-4 overflow-y-auto">
        {navigationGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {group.title}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/hub/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-slate-400')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer System Status */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/50">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Hệ thống trực tuyến
          </span>
          <span className="font-mono text-[10px] text-slate-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};

