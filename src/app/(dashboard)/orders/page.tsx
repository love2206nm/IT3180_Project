import React from 'react';
import Link from 'next/link';
import { Package, Search, PlusCircle, Filter, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { appContainer } from '../../../infrastructure/di';
import { getCurrentUserSession } from '../../../presentation/actions/session.helper';
import { Button } from '../../../presentation/components/ui/button';
import { Input } from '../../../presentation/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../../presentation/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../presentation/components/ui/table';
import { OrderStatusBadge } from '../../../presentation/components/ui/badge';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';

export interface OrdersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function OrdersListPage({ searchParams }: OrdersPageProps) {
  const session = await getCurrentUserSession();
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const statusFilter = params.status as OrderStatus | undefined;
  const searchTerm = params.search?.trim();

  let ordersData = null;

  if (session) {
    const result = await appContainer.orders.getOrderList().execute(
      {
        page,
        limit: 20,
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

  const items = ordersData?.items ?? [];
  const total = ordersData?.total ?? 0;
  const totalPages = ordersData?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Quản Lý Danh Sách Đơn Hàng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng số: <span className="font-bold text-slate-900">{total}</span> đơn hàng trên toàn hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/orders/import">
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-slate-500" />
              Nhập Excel/CSV
            </Button>
          </Link>
          <Link href="/orders/create">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Tạo Đơn Quầy
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <form method="GET" action="/orders" className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  name="search"
                  defaultValue={searchTerm || ''}
                  placeholder="Tìm mã vận đơn (TRK) hoặc SĐT người nhận..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>
            </div>

            <div className="w-44">
              <select
                name="status"
                defaultValue={statusFilter || ''}
                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
              >
                <option value="">-- Tất cả trạng thái --</option>
                {Object.values(ORDER_STATUS).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" variant="secondary" size="sm">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Lọc Dữ Liệu
            </Button>

            {searchTerm || statusFilter ? (
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                  Xóa lọc
                </Button>
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {/* Data-Dense Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã Vận Đơn</TableHead>
            <TableHead>Người Gửi</TableHead>
            <TableHead>Người Nhận & Địa Chỉ</TableHead>
            <TableHead>Tiền Thu Hộ COD</TableHead>
            <TableHead>Trạng Thái</TableHead>
            <TableHead>Shipper Phụ Trách</TableHead>
            <TableHead className="text-right">Chi Tiết</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.length > 0 ? (
            items.map((order) => (
              <TableRow key={order.id} className="hover:bg-slate-50/80 transition-colors">
                <TableCell className="font-mono font-bold text-primary">
                  <Link href={`/orders/${order.trackingCode}`} className="hover:underline flex items-center gap-1">
                    {order.trackingCode}
                  </Link>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-slate-900">{order.senderName}</p>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-slate-900">{order.receiverName}</p>
                  <p className="text-[11px] text-slate-500 truncate max-w-xs">{order.receiverAddress}</p>
                </TableCell>
                <TableCell className="font-mono font-bold text-accent">
                  {order.codAmount > 0 ? `${order.codAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.currentStatus} />
                </TableCell>
                <TableCell>
                  {order.assignedShipperName ? (
                    <span className="text-xs text-slate-700 font-medium">{order.assignedShipperName}</span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Chưa gán</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/orders/${order.trackingCode}`}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                Không tìm thấy đơn hàng nào phù hợp với điều kiện tìm kiếm.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
          <span>Trang {page} / {totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={`/orders?page=${page - 1}&search=${searchTerm || ''}&status=${statusFilter || ''}`}>
                <Button variant="secondary" size="sm">Trang trước</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/orders?page=${page + 1}&search=${searchTerm || ''}&status=${statusFilter || ''}`}>
                <Button variant="secondary" size="sm">Trang tiếp</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

