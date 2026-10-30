import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserSession } from '../../presentation/actions/session.helper';

/**
 * @file layout.tsx (profile)
 * @description Server Component Layout Guard bảo vệ tuyến đường Hồ sơ cá nhân (/profile).
 * Áp dụng nguyên tắc Fail-Closed: Chuyển hướng tức thì về /login nếu phiên chưa xác thực.
 */
export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-800">
      {children}
    </div>
  );
}
