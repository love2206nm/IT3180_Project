import React from 'react';
import { redirect } from 'next/navigation';
import { Header } from '../../presentation/components/layout/header';
import { ShipperBottomNav } from '../../presentation/components/layout/shipper-bottom-nav';
import { getCurrentUserSession } from '../../presentation/actions/session.helper';

export default async function ShipperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect('/login');
  }

  const userProp = {
    username: session.username,
    role: session.role,
    hubName: session.hubId ? `Bưu Cục #${session.hubId}` : undefined,
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 max-w-md mx-auto relative shadow-xl border-x border-slate-200">
      <Header user={userProp} />
      <main className="flex-1 p-3 pb-20 overflow-y-auto">
        {children}
      </main>
      <ShipperBottomNav />
    </div>
  );
}

