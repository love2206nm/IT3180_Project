'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, Wallet, UserCircle } from 'lucide-react';
import { cn } from '../ui/utils';

export const ShipperBottomNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Đơn Cần Giao', href: '/shipper/deliveries', icon: Truck },
    { label: 'Nộp Tiền COD', href: '/shipper/cod-settlement', icon: Wallet },
    { label: 'Tài Khoản', href: '/profile', icon: UserCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md pb-safe">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center py-1 transition-colors select-none',
              isActive ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-12 items-center justify-center rounded-full transition-all',
                isActive && 'bg-primary/10'
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[11px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

