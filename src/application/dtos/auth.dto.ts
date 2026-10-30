/**
 * @file auth.dto.ts
 * @description Zod Schemas và DTOs phục vụ phân hệ Xác thực & Quản lý Tài khoản (UC01, UC02, UC03).
 * @module application/dtos
 */

import { z } from 'zod';
import { USER_ROLE, type UserRole } from '../../domain/constants/roles.constant';
import { USER_STATUS, type UserStatus } from '../../domain/constants/user-status.constant';
import { createSafeTextSchema } from './common-validators';

// =============================================================================
// UC01: ĐĂNG NHẬP HỆ THỐNG
// =============================================================================

export const LoginInputSchema = z.object({
  /** Tên đăng nhập hoặc Email */
  usernameOrEmail: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập hoặc Email phải có ít nhất 3 ký tự')
    .max(100, 'Tên đăng nhập hoặc Email không vượt quá 100 ký tự'),

  /** Mật khẩu đăng nhập */
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(100, 'Mật khẩu không vượt quá 100 ký tự'),
});

export type LoginInputDTO = z.infer<typeof LoginInputSchema>;

export interface LoginOutputDTO {
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
    hubId: string | null;
  };
  token: string;
  expiresIn: string;
}

// =============================================================================
// UC02: ĐỔI MẬT KHẨU
// =============================================================================

/**
 * Schema dùng ở Client Form (không chứa userId từ client, chống IDOR).
 */
export const ChangePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu mới không vượt quá 100 ký tự')
      .regex(/[a-zA-Z]/, 'Mật khẩu mới phải chứa ít nhất một chữ cái')
      .regex(/[0-9]/, 'Mật khẩu mới phải chứa ít nhất một chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp với mật khẩu mới',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormDTO = z.infer<typeof ChangePasswordFormSchema>;

export const ChangePasswordInputSchema = z
  .object({
    /** ID người dùng (Tùy chọn, Use Case sẽ luôn ưu tiên lấy từ SecurityContext của Server Session) */
    userId: z.string().trim().min(1, 'ID người dùng không được để trống').optional(),
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu mới không vượt quá 100 ký tự')
      .regex(/[a-zA-Z]/, 'Mật khẩu mới phải chứa ít nhất một chữ cái')
      .regex(/[0-9]/, 'Mật khẩu mới phải chứa ít nhất một chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp với mật khẩu mới',
    path: ['confirmPassword'],
  });

export type ChangePasswordInputDTO = z.infer<typeof ChangePasswordInputSchema>;

// =============================================================================
// UC03: XEM & CHỈNH SỬA THÔNG TIN CÁ NHÂN
// =============================================================================

/**
 * Schema dùng ở Client Form (không nhận userId từ client, chống IDOR).
 */
export const UpdateProfileFormSchema = z.object({
  fullName: createSafeTextSchema(2, 100, 'Họ và tên'),
  phone: z
    .string()
    .trim()
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại phải là số di động Việt Nam hợp lệ 10 chữ số'),
});

export type UpdateProfileFormDTO = z.infer<typeof UpdateProfileFormSchema>;

export const UpdateProfileInputSchema = z.object({
  /** ID người dùng (Tùy chọn, Use Case sẽ luôn ưu tiên lấy từ SecurityContext của Server Session) */
  userId: z.string().trim().min(1, 'ID người dùng không được để trống').optional(),
  fullName: createSafeTextSchema(2, 100, 'Họ và tên'),
  phone: z
    .string()
    .trim()
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại phải là số di động Việt Nam hợp lệ 10 chữ số'),
});

export type UpdateProfileInputDTO = z.infer<typeof UpdateProfileInputSchema>;

export interface UserProfileDTO {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  hubId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}
