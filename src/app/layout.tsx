import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DeliveryHub - Hệ Thống Quản Lý Bưu Cục Logistics',
  description: 'Hệ thống điều phối vận tải, quản lý bưu cục và kiểm soát dòng tiền COD',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

