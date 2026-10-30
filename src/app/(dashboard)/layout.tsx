import React from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '../../presentation/components/layout/sidebar';
import { Header } from '../../presentation/components/layout/header';
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
    hubName: session.hubId ? `Bưu Cục #${session.hubId}` : 'Trung Tâm Toàn Quốc',
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={userProp} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

