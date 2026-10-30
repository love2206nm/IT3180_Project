'use client';

/**
 * @file kiot-summary-footer.tsx
 * @description Thanh Footer tổng kết chỉ số cố định dưới đáy bảng chuẩn KiotViet.
 * Hiển thị tổng số bản ghi, tổng tiền COD, và bộ điều khiển phân trang.
 * @module presentation/components/ui/kiot-summary-footer
 */

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './utils';

export interface KiotSummaryFooterProps {
  totalItems: number;
  totalCodAmount?: number;
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
}

/**
 * Component thanh Footer tổng kết dữ liệu chuẩn KiotViet.
 * @param {KiotSummaryFooterProps} props
 * @returns {React.ReactElement}
 */
export const KiotSummaryFooter: React.FC<KiotSummaryFooterProps> = ({
  totalItems,
  totalCodAmount = 0,
  currentPage,
  totalPages,
  baseUrl,
  searchParams = {},
  className,
}) => {
  const buildPageUrl = (pageNumber: number): string => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, val]) => {
      if (val && key !== 'page') {
        params.set(key, val);
      }
    });
    params.set('page', pageNumber.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700 select-none shadow-xs',
        className
      )}
    >
      {/* Khối bên trái: Thống kê số lượng & tổng tiền COD */}
      <div className="flex items-center gap-4">
        <div>
          <span>Tổng số: </span>
          <span className="font-bold text-slate-900">{totalItems.toLocaleString('vi-VN')}</span>
          <span className="text-slate-500"> đơn hàng</span>
        </div>

        {totalCodAmount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-300 pl-4">
            <span>Tổng tiền COD: </span>
            <span className="font-mono font-bold text-[#EA580C]">
              {totalCodAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>
        )}
      </div>

      {/* Khối bên phải: Bộ điều khiển phân trang KiotViet */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500">
          Trang <span className="font-semibold text-slate-900">{currentPage}</span> / {totalPages || 1}
        </span>

        <div className="flex items-center gap-1 ml-2">
          {currentPage > 1 ? (
            <Link
              href={buildPageUrl(currentPage - 1)}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
              title="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {currentPage < totalPages ? (
            <Link
              href={buildPageUrl(currentPage + 1)}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
              title="Trang tiếp theo"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
