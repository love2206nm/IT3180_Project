import React from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  PlusCircle,
  FileSpreadsheet,
  Download,
  RotateCcw,
} from 'lucide-react';
import { appContainer } from '../../../infrastructure/di';
import { getCurrentUserSession } from '../../../presentation/actions/session.helper';
import { KiotAccordionFilter } from '../../../presentation/components/ui/kiot-accordion-filter';
import { KiotOrdersTable } from '../../../presentation/components/orders/kiot-orders-table';
import { KiotSummaryFooter } from '../../../presentation/components/ui/kiot-summary-footer';
import type { OrderStatus } from '../../../domain/constants/order-status.constant';

export interface OrdersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    cod?: string;
    page?: string;
  }>;
}

export default async function OrdersListPage({ searchParams }: OrdersPageProps) {
  const session = await getCurrentUserSession();
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const statusFilter = params.status as OrderStatus | undefined;
  const searchTerm = params.search?.trim();
  const codFilter = params.cod;

  let ordersData = null;

  if (session) {
    const result = await appContainer.orders.getOrderList().execute(
      {
        page,
        limit: 25,
        trackingCode: searchTerm && searchTerm.startsWith('TRK') ? searchTerm : undefined,
        receiverPhone: searchTerm && !searchTerm.startsWith('TRK') ? searchTerm : undefined,
        status: statusFilter,
        currentHubId: session.hubId ?? undefined,
        sortOrder: 'desc',
      },
      session
    );

    if (result.success) {
      ordersData = result.data;
    }
  }

  let items = ordersData?.items ?? [];

  // Lọc thêm theo điều kiện COD ở client/view nếu có
  if (codFilter === 'has_cod') {
    items = items.filter((o) => o.codAmount > 0);
  } else if (codFilter === 'no_cod') {
    items = items.filter((o) => o.codAmount === 0);
  }

  const total = ordersData?.total ?? 0;
  const totalPages = ordersData?.totalPages ?? 1;

  // Tính tổng tiền COD của danh sách hiện tại
  const totalCodAmount = items.reduce((acc, curr) => acc + (curr.codAmount || 0), 0);

  return (
    <div className="space-y-3">
      {/* Thanh Tiêu Đề & Công Cụ KiotViet */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-[#0066CC]">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Quản Lý Danh Sách Đơn Hàng
            </h1>
            <p className="text-[11px] text-slate-500">
              Tổng số <span className="font-semibold text-slate-800">{total}</span> đơn hàng trong hệ thống
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Link href="/orders/import">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Nhập Excel</span>
            </button>
          </Link>

          <Link href="/orders/create">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors shadow-xs active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Tạo đơn quầy</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Bố cục 2 cột đặc trưng KiotViet */}
      <div className="flex flex-col lg:flex-row items-start gap-3">
        {/* Cột trái: Accordion Bộ Lọc 260px */}
        <KiotAccordionFilter />

        {/* Cột phải: Khối Tìm Kiếm, Bảng Dữ Liệu & Footer Tổng */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-2">
          {/* Thanh tìm kiếm nhanh */}
          <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
            <form method="GET" action="/orders" className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  name="search"
                  defaultValue={searchTerm || ''}
                  placeholder="Tìm theo Mã vận đơn (TRK) hoặc Số điện thoại người nhận..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0066CC] focus:bg-white"
                />
              </div>

              {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
              {codFilter && <input type="hidden" name="cod" value={codFilter} />}

              <button
                type="submit"
                className="h-8 rounded bg-[#0066CC] hover:bg-[#0052A3] px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Tìm kiếm
              </button>

              {searchTerm && (
                <Link href="/orders">
                  <button
                    type="button"
                    className="h-8 rounded border border-slate-300 bg-white hover:bg-slate-50 px-2.5 text-xs text-slate-600 transition-colors"
                  >
                    Xóa
                  </button>
                </Link>
              )}
            </form>
          </div>

          {/* Bảng Dữ Liệu Nén Cao Hỗ Trợ Row Expansion */}
          <KiotOrdersTable orders={items} userRole={session?.role} />

          {/* Sticky Summary Footer */}
          <KiotSummaryFooter
            totalItems={total}
            totalCodAmount={totalCodAmount}
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/orders"
            searchParams={{
              search: searchTerm,
              status: statusFilter,
              cod: codFilter,
            }}
          />
        </div>
      </div>
    </div>
  );
}
