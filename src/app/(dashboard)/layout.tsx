import React from 'react';
import { redirect } from 'next/navigation';
import { KiotHeader } from '../../presentation/components/layout/kiot-header';
import { getCurrentUserSession } from '../../presentation/actions/session.helper';
import { USER_ROLE } from '../../domain/constants/roles.constant';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect('/login');
  }

  // Nếu là Shipper, chuyển sang giao diện chuyên biệt Mobile Web-App
  if (session.role === USER_ROLE.SHIPPER) {
    redirect('/shipper/deliveries');
  }

  const userProp = {
    username: session.username,
    role: session.role,
    hubId: session.hubId ? Number(session.hubId) : null,
    hubName: session.hubId ? `Bưu Cục #${session.hubId}` : 'Trung Tâm Toàn Quốc',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F5F7] text-slate-800">
      {/* Thanh Topbar ngang chuẩn KiotViet */}
      <KiotHeader user={userProp} />

      {/* Vùng nội dung chính Full Width */}
      <main className="flex-1 w-full max-w-[1680px] mx-auto p-3 sm:p-4 lg:p-5">
        {children}
      </main>
    </div>
  );
}
