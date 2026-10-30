/**
 * @file action-utils.helper.ts
 * @description Các hàm tiện ích hỗ trợ định dạng lỗi Zod Validation và Revalidate Cache an toàn cho Server Actions.
 * @module presentation/actions/action-utils.helper
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { failure, type FailureResult } from '../../application/interfaces';

/**
 * Định dạng lỗi từ ZodError thành FailureResult có trường fieldErrors chi tiết.
 * @param {z.ZodError} error Đối tượng lỗi từ Zod
 * @returns {FailureResult<string>}
 */
export function formatZodFailure(error: z.ZodError): FailureResult<string> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const fieldPath = issue.path.join('.') || 'root';
    if (!fieldErrors[fieldPath]) {
      fieldErrors[fieldPath] = [];
    }
    fieldErrors[fieldPath].push(issue.message);
  }

  const primaryMessage = error.issues[0]?.message || 'Dữ liệu đầu vào không hợp lệ';
  return failure(primaryMessage, fieldErrors);
}

/**
 * Gọi revalidatePath một cách an toàn, không làm crash môi trường kiểm thử Unit Tests thuần Node.js.
 * @param {string} path Tuyến đường cần xóa cache
 * @param {'page' | 'layout'} [type] Phạm vi xóa cache
 */
export function safeRevalidatePath(path: string, type?: 'page' | 'layout'): void {
  try {
    revalidatePath(path, type);
  } catch {
    // Bỏ qua lỗi ngữ cảnh khi chạy ngoài Next.js server runtime
  }
}
