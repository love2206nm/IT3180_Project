'use client';

/**
 * @file kiot-accordion-filter.tsx
 * @description Khung bộ lọc Accordion đa tiêu chí chuẩn KiotViet.
 * Hỗ trợ lọc theo Thời gian, Trạng thái đơn hàng, Thu hộ COD và tìm kiếm bưu tá.
 * @module presentation/components/ui/kiot-accordion-filter
 */

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Filter,
  ChevronDown,
  RotateCcw,
  Calendar,
  CheckCircle2,
  DollarSign,
  Search,
} from 'lucide-react';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { cn } from './utils';

export interface KiotAccordionFilterProps {
  className?: string;
}

/**
 * Component bộ lọc Accordion cột trái 260px chuẩn KiotViet.
 * @param {KiotAccordionFilterProps} props
 * @returns {React.ReactElement}
 */
export const KiotAccordionFilter: React.FC<KiotAccordionFilterProps> = ({ className }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Đọc các giá trị lọc hiện tại từ URL
  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentCod = searchParams.get('cod') || '';

  // Trạng thái mở/đóng từng khối accordion
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    status: true,
    cod: true,
  });

  const toggleSection = (key: string): void => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStatusChange = (statusValue: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusValue) {
      params.set('status', statusValue);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/orders?${params.toString()}`);
  };

  const handleCodChange = (codValue: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (codValue) {
      params.set('cod', codValue);
    } else {
      params.delete('cod');
    }
    params.set('page', '1');
    router.push(`/orders?${params.toString()}`);
  };

  const handleResetFilters = (): void => {
    router.push('/orders');
  };

  const hasActiveFilters = Boolean(currentStatus || currentSearch || currentCod);

  return (
    <div
      className={cn(
        'w-full lg:w-64 flex-shrink-0 bg-white border border-slate-200 rounded shadow-xs overflow-hidden select-none',
        className
      )}
    >
      {/* Tiêu đề Bộ Lọc KiotViet */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50/80 border-b border-slate-200">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5 text-[#0066CC]" />
          <span>Bộ Lọc Đơn Hàng</span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            title="Xóa toàn bộ bộ lọc"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100 text-xs">
        {/* Accordion 1: Trạng thái đơn hàng */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => toggleSection('status')}
            className="flex w-full items-center justify-between font-semibold text-slate-800 mb-2 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Trạng thái giao hàng</span>
            </span>
            <ChevronDown
              className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', !openSections.status && '-rotate-90')}
            />
          </button>

          {openSections.status && (
            <div className="space-y-1.5 pl-1">
              {/* Option: Tất cả */}
              <label className="flex items-center gap-2 cursor-pointer py-0.5 text-slate-700 hover:text-[#0066CC]">
                <input
                  type="radio"
                  name="order_status"
                  value=""
                  checked={currentStatus === ''}
                  onChange={() => handleStatusChange('')}
                  className="w-3.5 h-3.5 text-[#0066CC] focus:ring-blue-500"
                />
                <span className={cn('text-xs', currentStatus === '' && 'font-bold text-[#0066CC]')}>
                  Tất cả trạng thái
                </span>
              </label>

              {/* Từng trạng thái vận chuyển */}
              {Object.values(ORDER_STATUS).map((status) => {
                const isSelected = currentStatus === status;
                return (
                  <label
                    key={status}
                    className="flex items-center gap-2 cursor-pointer py-0.5 text-slate-700 hover:text-[#0066CC]"
                  >
                    <input
                      type="radio"
                      name="order_status"
                      value={status}
                      checked={isSelected}
                      onChange={() => handleStatusChange(status)}
                      className="w-3.5 h-3.5 text-[#0066CC] focus:ring-blue-500"
                    />
                    <span className={cn('text-xs truncate', isSelected && 'font-bold text-[#0066CC]')}>
                      {status}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Accordion 2: Tiền thu hộ COD */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => toggleSection('cod')}
            className="flex w-full items-center justify-between font-semibold text-slate-800 mb-2 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span>Tiền thu hộ COD</span>
            </span>
            <ChevronDown
              className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', !openSections.cod && '-rotate-90')}
            />
          </button>

          {openSections.cod && (
            <div className="space-y-1.5 pl-1">
              <label className="flex items-center gap-2 cursor-pointer py-0.5 text-slate-700 hover:text-[#0066CC]">
                <input
                  type="radio"
                  name="order_cod"
                  value=""
                  checked={currentCod === ''}
                  onChange={() => handleCodChange('')}
                  className="w-3.5 h-3.5 text-[#0066CC] focus:ring-blue-500"
                />
                <span className={cn('text-xs', currentCod === '' && 'font-bold text-[#0066CC]')}>Tất cả</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-0.5 text-slate-700 hover:text-[#0066CC]">
                <input
                  type="radio"
                  name="order_cod"
                  value="has_cod"
                  checked={currentCod === 'has_cod'}
                  onChange={() => handleCodChange('has_cod')}
                  className="w-3.5 h-3.5 text-[#0066CC] focus:ring-blue-500"
                />
                <span className={cn('text-xs', currentCod === 'has_cod' && 'font-bold text-[#0066CC]')}>
                  Có thu hộ COD (&gt; 0đ)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-0.5 text-slate-700 hover:text-[#0066CC]">
                <input
                  type="radio"
                  name="order_cod"
                  value="no_cod"
                  checked={currentCod === 'no_cod'}
                  onChange={() => handleCodChange('no_cod')}
                  className="w-3.5 h-3.5 text-[#0066CC] focus:ring-blue-500"
                />
                <span className={cn('text-xs', currentCod === 'no_cod' && 'font-bold text-[#0066CC]')}>
                  Không thu COD (0đ)
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
