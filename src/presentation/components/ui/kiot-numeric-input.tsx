'use client';

import React, { useState, useEffect } from 'react';
import { cn } from './utils';

export interface KiotNumericInputProps {
  /** Giá trị số hiện tại */
  value: number;
  /** Hàm callback khi giá trị thay đổi */
  onChange: (value: number) => void;
  /** Giá trị nhỏ nhất cho phép */
  min?: number;
  /** Giá trị lớn nhất cho phép */
  max?: number;
  /** Bước nhảy */
  step?: number;
  /** Đơn vị hiển thị bên phải (g, cm, VNĐ) */
  suffix?: string;
  /** Định dạng số tiền có phân tách hàng nghìn */
  isCurrency?: boolean;
  /** Placeholder khi rỗng */
  placeholder?: string;
  /** Trạng thái vô hiệu hóa */
  disabled?: boolean;
  /** Tên nhãn hiển thị */
  label?: string;
  /** Class tùy biến bổ sung */
  className?: string;
  /** Giá trị mặc định khi người dùng xóa trắng và blur ra ngoài */
  defaultFallback?: number;
}

/**
 * Component nhập số chuyên dụng chuẩn Kiot POS
 * - Khắc phục triệt để lỗi dính số 0 đằng trước (0500, 0100...)
 * - Cho phép xóa trắng input để nhập mới mà không bị ép về 0 tức thì
 * - Tự động bôi đen toàn bộ giá trị khi click (Auto-select on focus)
 * - Tự động loại bỏ leading zeroes khi người dùng gõ
 *
 * @param {KiotNumericInputProps} props - Thuộc tính cấu hình ô nhập số
 * @returns {React.ReactElement}
 */
export const KiotNumericInput: React.FC<KiotNumericInputProps> = ({
  value,
  onChange,
  min = 0,
  max,
  suffix,
  isCurrency = false,
  placeholder,
  disabled = false,
  label,
  className,
  defaultFallback = 0,
}) => {
  // Trạng thái chuỗi hiển thị cục bộ để cho phép người dùng xóa trắng ô nhập
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === 0 && defaultFallback === 0) return '0';
    return String(value);
  });

  // Đồng bộ từ props value ngoài vào khi component cha thay đổi
  useEffect(() => {
    // Chỉ cập nhật nếu giá trị số thực sự khác để tránh ghi đè lúc người dùng đang gõ dở
    const parsedCurrent = displayValue === '' ? 0 : Number(displayValue.replace(/\./g, ''));
    if (parsedCurrent !== value) {
      if (isCurrency && value > 0) {
        setDisplayValue(value.toLocaleString('vi-VN'));
      } else {
        setDisplayValue(String(value));
      }
    }
  }, [value, isCurrency, displayValue]);

  /**
   * Xử lý khi người dùng thay đổi giá trị
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    let raw = e.target.value;

    // Nếu là ô tiền tệ, gỡ bỏ dấu phân cách chấm/phẩy trước
    if (isCurrency) {
      raw = raw.replace(/[^\d]/g, '');
    }

    // Nếu người dùng xóa hết (chuỗi rỗng), cho phép hiển thị rỗng để người dùng gõ số mới
    if (raw === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Tự động loại bỏ số 0 đứng đầu nếu phía sau là các chữ số khác (ví dụ "0500" -> "500")
    let sanitized = raw.replace(/^0+(?=\d)/, '');
    if (sanitized === '') sanitized = '0';

    const num = Number(sanitized);
    if (!isNaN(num)) {
      if (max !== undefined && num > max) {
        return; // Không cho nhập vượt quá max
      }

      if (isCurrency && num > 0) {
        setDisplayValue(num.toLocaleString('vi-VN'));
      } else {
        setDisplayValue(sanitized);
      }
      onChange(num);
    }
  };

  /**
   * Tự động chọn toàn bộ text khi focus để người dùng có thể gõ đè ngay lập tức
   */
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>): void => {
    e.target.select();
  };

  /**
   * Khi blur ra ngoài, nếu ô đang để trống thì khôi phục giá trị fallback
   */
  const handleBlur = (): void => {
    if (displayValue === '' || isNaN(Number(displayValue.replace(/\./g, '')))) {
      const fallback = defaultFallback !== undefined ? defaultFallback : min;
      if (isCurrency && fallback > 0) {
        setDisplayValue(fallback.toLocaleString('vi-VN'));
      } else {
        setDisplayValue(String(fallback));
      }
      onChange(fallback);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-slate-700 font-semibold mb-1 text-xs">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono text-xs transition-colors',
            'focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC]',
            'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed',
            suffix && 'pr-8',
            className
          )}
        />
        {suffix && (
          <span className="absolute right-2.5 text-[11px] font-semibold text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};
