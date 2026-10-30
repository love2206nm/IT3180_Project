/**
 * @file staff.dto.ts
 * @description Zod Schemas và DTOs phục vụ phân hệ Quản lý Nhân sự & Phân quyền (UC04, UC05, UC06, UC07, UC08).
 * @module application/dtos
 */

import { z } from 'zod';
import { USER_ROLE, type UserRole } from '../../domain/constants/roles.constant';
import { USER_STATUS, type UserStatus } from '../../domain/constants/user-status.constant';
import { PaginationQuerySchema, type PaginatedResultDTO } from './pagination.dto';
import { createSafeTextSchema } from './common-validators';

// =============================================================================
// UC04: XEM DANH SÁCH NHÂN VIÊN
// =============================================================================

export const GetStaffListQuerySchema = PaginationQuerySchema.extend({
  /** Lọc theo trạm trực thuộc */
  hubId: z.string().trim().optional(),

  /** Lọc theo chức vụ / vai trò */
  role: z.nativeEnum(USER_ROLE).optional(),

  /** Lọc theo trạng thái hoạt động */
  status: z.nativeEnum(USER_STATUS).optional(),
});

export type GetStaffListQueryDTO = z.infer<typeof GetStaffListQuerySchema>;

export interface StaffItemDTO {
  id: string;
  hubId: string | null;
  hubName?: string | null;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export type StaffListOutputDTO = PaginatedResultDTO<StaffItemDTO>;

// =============================================================================
// UC05: THÊM MỚI NHÂN VIÊN
// =============================================================================

export const CreateStaffInputSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(50, 'Tên đăng nhập không vượt quá 50 ký tự')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số, dấu chấm và dấu gạch dưới'),

  password: z
    .string()
    .min(8, 'Mật khẩu khởi tạo phải có ít nhất 8 ký tự')
    .max(100, 'Mật khẩu không vượt quá 100 ký tự'),

  fullName: createSafeTextSchema(2, 100, 'Họ và tên'),

  email: z
    .string()
    .trim()
    .email('Địa chỉ email không đúng định dạng')
    .max(100, 'Email không vượt quá 100 ký tự'),

  phone: z
    .string()
    .trim()
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại phải là số di động Việt Nam 10 chữ số hợp lệ'),

  role: z.nativeEnum(USER_ROLE),

  /** Trạm phân công (bắt buộc với HUB_MANAGER, HUB_STAFF, SHIPPER; tùy chọn với ADMIN) */
  hubId: z.string().trim().nullable().optional(),
});

export type CreateStaffInputDTO = z.infer<typeof CreateStaffInputSchema>;

// =============================================================================
// UC06: CẬP NHẬT THÔNG TIN NHÂN VIÊN
// =============================================================================

export const UpdateStaffInputSchema = z.object({
  id: z.string().trim().min(1, 'ID nhân viên không được để trống'),
  fullName: createSafeTextSchema(2, 100, 'Họ và tên').optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại phải là số di động Việt Nam 10 số')
    .optional(),
  role: z.nativeEnum(USER_ROLE).optional(),
  hubId: z.string().trim().nullable().optional(),
});

export type UpdateStaffInputDTO = z.infer<typeof UpdateStaffInputSchema>;

// =============================================================================
// UC07: KHÓA / MỞ KHÓA TÀI KHOẢN NHÂN VIÊN
// =============================================================================

export const ToggleStaffStatusInputSchema = z.object({
  id: z.string().trim().min(1, 'ID nhân viên không được để trống'),
  status: z.nativeEnum(USER_STATUS),
});

export type ToggleStaffStatusInputDTO = z.infer<typeof ToggleStaffStatusInputSchema>;

// =============================================================================
// UC08: PHÂN BỔ KHU VỰC / TUYẾN ĐƯỜNG CHO SHIPPER
// =============================================================================

export const AssignShipperZoneInputSchema = z.object({
  shipperId: z.string().trim().min(1, 'ID Shipper không được để trống'),
  zoneId: z.string().trim().min(1, 'ID Tuyến giao không được để trống'),
});

export type AssignShipperZoneInputDTO = z.infer<typeof AssignShipperZoneInputSchema>;

export interface ShipperZoneAssignmentOutputDTO {
  id: string;
  shipperId: string;
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  assignedDate: Date;
  status: string;
}
