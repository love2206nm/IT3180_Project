'use client';

/**
 * @file use-server-action.ts
 * @description Custom React Hook đóng gói việc gọi Server Actions với React useTransition.
 * Quản lý trạng thái isPending, bóc tách Result Pattern (data / error / fieldErrors),
 * và xử lý các hàm phản hồi onSuccess/onError một cách an toàn và nhất quán.
 * @module presentation/hooks
 */

import { useState, useTransition, useCallback } from 'react';
import { isSuccess, type Result } from '../../application/interfaces';

export interface UseServerActionOptions<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: string, fieldErrors?: Record<string, string[]>) => void;
}

export interface UseServerActionReturn<TInput, TData> {
  /** Hàm kích hoạt thực thi Server Action */
  execute: (input: TInput) => Promise<Result<TData, string>>;
  /** Trạng thái máy chủ đang xử lý bất đồng bộ */
  isPending: boolean;
  /** Dữ liệu thành công mới nhất */
  data: TData | null;
  /** Thông điệp lỗi nếu thất bại */
  error: string | null;
  /** Chi tiết lỗi của từng trường form Zod */
  fieldErrors?: Record<string, string[]>;
  /** Đặt lại toàn bộ trạng thái về ban đầu */
  reset: () => void;
}

/**
 * Hook chuẩn hóa việc gọi Server Actions từ Client Components.
 *
 * @template TInput Kiểu dữ liệu đầu vào của Server Action
 * @template TData Kiểu dữ liệu kết quả thành công
 * @param actionFn Hàm Server Action cần gọi
 * @param options Các tùy chọn callback onSuccess và onError
 */
export function useServerAction<TInput, TData>(
  actionFn: (input: TInput) => Promise<Result<TData, string>>,
  options?: UseServerActionOptions<TData>
): UseServerActionReturn<TInput, TData> {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  const execute = useCallback(
    (input: TInput): Promise<Result<TData, string>> => {
      setError(null);
      setFieldErrors(undefined);

      return new Promise<Result<TData, string>>((resolve) => {
        startTransition(async () => {
          try {
            const res = await actionFn(input);

            if (isSuccess(res)) {
              setData(res.data);
              setError(null);
              setFieldErrors(undefined);
              options?.onSuccess?.(res.data);
            } else {
              setError(res.error);
              setFieldErrors(res.fieldErrors);
              options?.onError?.(res.error, res.fieldErrors);
            }

            resolve(res);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
            setError(errorMsg);
            options?.onError?.(errorMsg);
            resolve({ success: false, error: errorMsg });
          }
        });
      });
    },
    [actionFn, options]
  );

  const reset = useCallback((): void => {
    setData(null);
    setError(null);
    setFieldErrors(undefined);
  }, []);

  return {
    execute,
    isPending,
    data,
    error,
    fieldErrors,
    reset,
  };
}
