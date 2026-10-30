'use client';

/**
 * @file use-debounce.ts
 * @description Custom React Hook làm trễ giá trị cập nhật (Debounce) cho các trường tìm kiếm theo thời gian thực.
 * Ngăn chặn gửi quá nhiều request lên máy chủ khi người dùng đang gõ phím liên tục.
 * @module presentation/hooks
 */

import { useState, useEffect } from 'react';

/**
 * Hook làm trễ giá trị thay đổi.
 *
 * @template T Kiểu dữ liệu của giá trị cần debounce
 * @param value Giá trị đầu vào thay đổi liên tục
 * @param delayMs Thời gian chờ sau lần thay đổi cuối cùng (ms, mặc định 300ms)
 * @returns {T} Giá trị đã được debounce
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
