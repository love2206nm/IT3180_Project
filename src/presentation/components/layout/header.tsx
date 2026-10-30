'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { LogOut, Package, User, Building2, Bell } from 'lucide-react';
import { RoleBadge } from '../ui/badge';
import { Button } from '../ui/button';
import { logoutAction } from '../../actions/auth.actions';
import type { UserRole } from '../../../domain/constants/roles.constant';

export interface HeaderProps {
  user?: {
    username: string;
    fullName?: string;
    role: UserRole;
    hubName?: string;
  };
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      window.location.href = '/login';
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      {/* Left: Mobile Brand / Hub Name */}
      <div className="flex items-center gap-3">
        <Link href="/hub/dashboard" className="flex items-center gap-2 font-bold text-primary lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Package className="h-4 w-4" />
          </div>
          <span className="text-sm tracking-tight text-slate-900">DeliveryHub</span>
        </Link>

        {user?.hubName && (
          <div className="hidden items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 md:flex">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Trạm: {user.hubName}</span>
          </div>
        )}
      </div>

      {/* Right: User Info & Actions */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <div className="hidden text-right sm:block">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs font-semibold text-slate-900">{user.fullName || user.username}</span>
                <RoleBadge role={user.role} />
              </div>
              <p className="text-[11px] text-slate-500 font-mono">@{user.username}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={isPending}
              className="text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Đăng xuất
            </Button>
          </>
        ) : (
          <Link href="/login">
            <Button variant="primary" size="sm">
              Đăng nhập
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};

