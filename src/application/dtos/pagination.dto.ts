/**
 * @file pagination.dto.ts
 * @description Zod Schemas và Interfaces phân trang dùng chung cho các danh sách (Đơn hàng, Nhân viên, Đối soát).
 * @module application/dtos
 */

import { z } from 'zod';
import { DELIVERY_CONSTRAINTS } from '../../domain/constants/delivery-constraints.constant';

/**
 * Lược đồ Zod xác thực tham số phân trang gửi lên từ query parameters.
 */
export const PaginationQuerySchema = z.object({
  /** Số trang hiện tại (tối thiểu là 1, mặc định 1) */
  page: z.coerce.number().int().min(1).default(1),

  /** Số lượng bản ghi mỗi trang (tối thiểu 1, tối đa 100, mặc định 20) */
  limit: z.coerce.number().int().min(1).max(100).default(20),

  /** Từ khóa tìm kiếm nhanh (chống DoS tải nặng cho Database) */
  search: z
    .string()
    .trim()
    .max(
      DELIVERY_CONSTRAINTS.MAX_SEARCH_TERM_LENGTH,
      `Từ khóa tìm kiếm không vượt quá ${DELIVERY_CONSTRAINTS.MAX_SEARCH_TERM_LENGTH} ký tự`
    )
    .optional(),

  /** Trường cần sắp xếp (chỉ chứa ký tự chữ cái, số, gạch dưới) */
  sortBy: z
    .string()
    .trim()
    .max(50, 'Tên trường sắp xếp không vượt quá 50 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên trường sắp xếp chỉ chứa chữ cái, số và dấu gạch dưới')
    .optional(),

  /** Hướng sắp xếp: tăng dần hoặc giảm dần */
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PaginationQueryDTO = z.infer<typeof PaginationQuerySchema>;

/**
 * Cấu trúc đóng gói dữ liệu trả về sau khi phân trang.
 *
 * @template T Kiểu phần tử trong danh sách
 */
export interface PaginatedResultDTO<T> {
  /** Danh sách các bản ghi ở trang hiện tại */
  items: T[];

  /** Tổng số bản ghi thỏa mãn điều kiện lọc */
  total: number;

  /** Trang hiện tại */
  page: number;

  /** Giới hạn số bản ghi mỗi trang */
  limit: number;

  /** Tổng số trang */
  totalPages: number;

  /** Có trang tiếp theo hay không */
  hasNextPage: boolean;

  /** Có trang trước đó hay không */
  hasPrevPage: boolean;
}
