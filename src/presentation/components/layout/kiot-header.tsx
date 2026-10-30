'use client';

/**
 * @file kiot-header.tsx
 * @description Thanh điều hướng ngang Topbar chuẩn KiotViet Design System.
 * Nền màu xanh thương hiệu #0066CC, tích hợp Menu xổ xuống (Dropdown Menu),
 * Hub Selector, nút "+ Tạo đơn" màu xanh lá (#16A34A) và quản lý phiên người dùng.
 * @module presentation/components/layout/kiot-header
 */

import React, { useState, useTransition, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  ChevronDown,
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  ScanBarcode,
  Truck,
  RotateCcw,
  Users,
  BadgeDollarSign,
  Search,
  Building2,
  LogOut,
  User,
  ShieldCheck,
} from 'lucide-react';
import { logoutAction } from '../../actions/auth.actions';
import type { UserRole } from '../../../domain/constants/roles.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';
import { cn } from '../ui/utils';

export interface KiotHeaderProps {
  user?: {
    username: string;
    fullName?: string;
    role: UserRole;
    hubName?: string;
    hubId?: number | null;
  };
}

/**
 * Component thanh điều hướng ngang Topbar chuẩn KiotViet.
 * @param {KiotHeaderProps} props - Thông tin phiên người dùng đăng nhập
 * @returns {React.ReactElement}
 */
export const KiotHeader: React.FC<KiotHeaderProps> = ({ user }) => {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Trạng thái mở các dropdown menu
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = (): void => {
    startTransition(async () => {
      await logoutAction();
      window.location.href = '/login';
    });
  };

  const isOrdersActive =
    pathname.startsWith('/orders') && !pathname.includes('/orders/create') && !pathname.includes('/orders/import');
  const isShipmentsActive = pathname.startsWith('/shipments');
  const isDashboardActive = pathname === '/hub/dashboard';
  const isCODActive = pathname === '/hub/cod-settlements';
  const isStaffActive = pathname === '/hub/staff';
  const isTrackingActive = pathname === '/tracking';

  return (
    <header className="sticky top-0 z-50 h-12 w-full bg-[#0066CC] text-white shadow-md select-none">
      <div className="flex h-full w-full items-center justify-between px-3 lg:px-4" ref={navRef}>
        {/* Khối bên trái: Logo + Navigation Links */}
        <div className="flex items-center gap-2 lg:gap-4 h-full">
          {/* Logo DeliveryHub */}
          <Link
            href="/hub/dashboard"
            className="flex items-center gap-2 pr-3 py-1 text-white hover:opacity-95 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white/15 text-white shadow-xs">
              <Package className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white leading-none">DeliveryHub</span>
              <span className="text-[10px] text-blue-100 font-light tracking-wider mt-0.5">QUẢN LÝ BƯU CỤC</span>
            </div>
          </Link>

          {/* Hub Selector Badge */}
          {user?.hubName && (
            <div className="hidden xl:flex items-center gap-1.5 rounded bg-blue-700/60 px-2.5 py-1 text-xs text-blue-100 border border-blue-500/40">
              <Building2 className="h-3.5 w-3.5 text-blue-200" />
              <span className="font-medium text-white">{user.hubName}</span>
            </div>
          )}

          {/* Desktop Navigation Menus (Dropdown) */}
          <nav className="hidden md:flex items-center h-full text-xs font-medium">
            {/* Tổng quan */}
            <Link
              href="/hub/dashboard"
              className={cn(
                'flex items-center gap-1.5 h-12 px-3 transition-colors',
                isDashboardActive
                  ? 'bg-[#0052A3] text-white font-semibold border-b-2 border-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Tổng quan</span>
            </Link>

            {/* Menu Dropdown: Đơn hàng */}
            <div className="relative h-full flex items-center">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'orders' ? null : 'orders')}
                className={cn(
                  'flex items-center gap-1.5 h-12 px-3 transition-colors cursor-pointer',
                  pathname.startsWith('/orders')
                    ? 'bg-[#0052A3] text-white font-semibold border-b-2 border-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Đơn hàng</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', openDropdown === 'orders' && 'rotate-180')} />
              </button>

              {openDropdown === 'orders' && (
                <div className="absolute top-12 left-0 w-52 rounded-b-md bg-white py-1 text-slate-800 shadow-xl border border-slate-200 z-50">
                  <Link
                    href="/orders"
                    onClick={() => setOpenDropdown(null)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 hover:text-[#0066CC]',
                      isOrdersActive && 'bg-blue-50 font-semibold text-[#0066CC]'
                    )}
                  >
                    <Package className="h-3.5 w-3.5 text-slate-500" />
                    <span>Danh sách đơn hàng</span>
                  </Link>
                  <Link
                    href="/orders/create"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 hover:text-[#0066CC]"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Tạo đơn tại quầy (POS)</span>
                  </Link>
                  <Link
                    href="/orders/import"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 hover:text-[#0066CC]"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                    <span>Nhập Excel / CSV</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Menu Dropdown: Vận chuyển & Kho */}
            <div className="relative h-full flex items-center">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'shipments' ? null : 'shipments')}
                className={cn(
                  'flex items-center gap-1.5 h-12 px-3 transition-colors cursor-pointer',
                  isShipmentsActive
                    ? 'bg-[#0052A3] text-white font-semibold border-b-2 border-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Vận chuyển & Kho</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', openDropdown === 'shipments' && 'rotate-180')} />
              </button>

              {openDropdown === 'shipments' && (
                <div className="absolute top-12 left-0 w-56 rounded-b-md bg-white py-1 text-slate-800 shadow-xl border border-slate-200 z-50">
                  <Link
                    href="/shipments/inbound"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 hover:text-[#0066CC]"
                  >
                    <ScanBarcode className="h-3.5 w-3.5 text-blue-600" />
                    <span>Quét nhập kho (Inbound)</span>
                  </Link>
                  <Link
                    href="/shipments/dispatch"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 hover:text-[#0066CC]"
                  >
                    <Truck className="h-3.5 w-3.5 text-amber-600" />
                    <span>Bàn giao Shipper (Dispatch)</span>
                  </Link>
                  <Link
                    href="/shipments/returns"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 hover:text-[#0066CC]"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                    <span>Xử lý hàng hoàn (Returns)</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Sổ quỹ & Đối soát COD */}
            <Link
              href="/hub/cod-settlements"
              className={cn(
                'flex items-center gap-1.5 h-12 px-3 transition-colors',
                isCODActive
                  ? 'bg-[#0052A3] text-white font-semibold border-b-2 border-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <BadgeDollarSign className="h-3.5 w-3.5" />
              <span>Sổ quỹ COD</span>
            </Link>

            {/* Nhân sự & Bưu cục */}
            <Link
              href="/hub/staff"
              className={cn(
                'flex items-center gap-1.5 h-12 px-3 transition-colors',
                isStaffActive
                  ? 'bg-[#0052A3] text-white font-semibold border-b-2 border-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Nhân sự</span>
            </Link>

            {/* Tra cứu công khai */}
            <Link
              href="/tracking"
              className={cn(
                'flex items-center gap-1.5 h-12 px-3 transition-colors',
                isTrackingActive
                  ? 'bg-[#0052A3] text-white font-semibold border-b-2 border-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Tra cứu vận đơn</span>
            </Link>
          </nav>
        </div>

        {/* Khối bên phải: Nút Tạo đơn xanh lá + Profile & Đăng xuất */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Nút xanh lá cây chuẩn KiotViet: + Tạo đơn */}
          <Link href="/orders/create">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer active:scale-95"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">+ Tạo đơn quầy</span>
              <span className="sm:hidden">+ Đơn</span>
            </button>
          </Link>

          {/* User Profile Dropdown */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded px-2 py-1 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-800 text-white font-bold text-xs border border-blue-400">
                  {(user.fullName || user.username).charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="font-semibold text-xs leading-none">{user.fullName || user.username}</span>
                  <span className="text-[10px] text-blue-200 mt-0.5">{user.role}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-blue-200" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-10 w-56 rounded-md bg-white py-1.5 text-slate-800 shadow-xl border border-slate-200 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user.fullName || user.username}</p>
                    <p className="text-[11px] text-slate-500 font-mono">@{user.username}</p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Vai trò: {user.role}</span>
                    </div>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#0066CC]"
                  >
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>Hồ sơ & Đổi mật khẩu</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isPending}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-500" />
                    <span>{isPending ? 'Đang đăng xuất...' : 'Đăng xuất tài khoản'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <button
                type="button"
                className="rounded bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30"
              >
                Đăng nhập
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
