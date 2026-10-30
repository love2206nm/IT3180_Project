'use client';

/**
 * @file page.tsx (auth/login)
 * @description Màn hình Đăng nhập cán bộ bưu cục chuẩn KiotViet Design System.
 * Thiết kế gọn gàng, sắc nét, đồng bộ màu sắc thương hiệu và hỗ trợ nạp nhanh tài khoản Demo.
 */

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Package, Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';
import { loginAction } from '../../../presentation/actions/auth.actions';
import { isFailure } from '../../../application/interfaces';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors(undefined);

    startTransition(async () => {
      const result = await loginAction({
        usernameOrEmail: usernameOrEmail.trim(),
        password,
      });

      if (isFailure(result)) {
        setErrorMessage(result.error);
        setFieldErrors(result.fieldErrors);
        return;
      }

      // Điều hướng thông minh theo vai trò người dùng
      const role = result.data.user.role;
      if (role === USER_ROLE.SHIPPER) {
        window.location.href = '/shipper/deliveries';
      } else {
        window.location.href = '/hub/dashboard';
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-sans">
      {/* Top Header Link */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#0066CC] px-4 sm:px-8 flex items-center justify-between text-white shadow-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-100 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về Cổng Tra Cứu</span>
        </Link>
        <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
          DeliveryHub Portal
        </span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-6">
        {/* Brand Icon Header */}
        <div className="flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded bg-[#0066CC] text-white shadow-xs">
            <Package className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-3 text-center text-xl font-extrabold text-slate-900 tracking-tight uppercase">
          DeliveryHub System
        </h2>
        <p className="mt-0.5 text-center text-xs text-slate-500">
          Phần Mềm Quản Lý Bưu Cục & Điều Phối Giao Hàng
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white rounded-md border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Đăng Nhập Cán Bộ Tác Nghiệp
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Nhập tên tài khoản hoặc mã nhân sự và mật khẩu được cấp
            </p>
          </div>

          {/* Global Error Banner */}
          {errorMessage && (
            <div className="rounded bg-red-50 p-2.5 border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-red-700">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên đăng nhập / Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nhập tên đăng nhập hoặc email..."
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC]"
                />
              </div>
              {fieldErrors?.usernameOrEmail?.[0] && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.usernameOrEmail[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="•••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC]"
                />
              </div>
              {fieldErrors?.password?.[0] && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.password[0]}</p>
              )}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 rounded bg-[#0066CC] hover:bg-[#0052A3] disabled:bg-blue-300 text-white font-bold text-xs uppercase tracking-wide transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isPending ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
