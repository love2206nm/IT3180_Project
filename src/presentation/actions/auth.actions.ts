'use server';

/**
 * @file auth.actions.ts
 * @description Server Actions cho phân hệ Xác thực & Quản lý Tài khoản cá nhân (UC01, UC02, UC03).
 * Xử lý đăng nhập, cấp HTTP-Only Cookie JWT, đăng xuất, đổi mật khẩu và cập nhật hồ sơ cá nhân.
 * @module presentation/actions/auth.actions
 */

import {
  LoginInputSchema,
  ChangePasswordFormSchema,
  UpdateProfileInputSchema,
  type LoginInputDTO,
  type LoginOutputDTO,
  type ChangePasswordFormDTO,
  type UpdateProfileInputDTO,
  type UserProfileDTO,
} from '../../application/dtos/auth.dto';
import type { Result } from '../../application/interfaces';
import { success, failure, isFailure } from '../../application/interfaces';
import { appContainer } from '../../infrastructure/di';
import {
  requireAuth,
  getCurrentUserSession,
  setAuthCookie,
  clearAuthCookie,
} from './session.helper';
import { parseActionInput } from './form-parser.helper';
import { formatZodFailure, safeRevalidatePath } from './action-utils.helper';

/**
 * Server Action: Đăng nhập hệ thống (UC01).
 * Xác thực thông tin, cấp phát HTTP-Only Cookie và xóa Next.js Cache.
 *
 * @param {LoginInputDTO | FormData} input Dữ liệu đăng nhập (usernameOrEmail, password)
 * @returns {Promise<Result<LoginOutputDTO, string>>}
 */
export async function loginAction(
  input: LoginInputDTO | FormData
): Promise<Result<LoginOutputDTO, string>> {
  try {
    const rawData = parseActionInput(input);
    const parsed = LoginInputSchema.safeParse(rawData);

    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.auth.login().execute(parsed.data);

    if (!result.success) {
      return result;
    }

    // Thiết lập HTTP-Only Cookie lưu JWT Token an toàn
    await setAuthCookie(result.data.token);

    // Cập nhật Next.js cache cho toàn bộ layout
    safeRevalidatePath('/', 'layout');

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống khi đăng nhập';
    return failure(`Đăng nhập thất bại: ${message}`);
  }
}

/**
 * Server Action: Đăng xuất hệ thống.
 * Xóa Cookie phiên và làm mới Next.js Cache.
 *
 * @returns {Promise<Result<{ message: string }, string>>}
 */
export async function logoutAction(): Promise<Result<{ message: string }, string>> {
  try {
    await clearAuthCookie();
    safeRevalidatePath('/', 'layout');
    return success({ message: 'Đăng xuất thành công' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống khi đăng xuất';
    return failure(`Đăng xuất thất bại: ${message}`);
  }
}

/**
 * Server Action: Đổi mật khẩu tài khoản cá nhân (UC02).
 * Tự động trích xuất userId từ SecurityContext (chống IDOR).
 *
 * @param {ChangePasswordFormDTO | FormData} input Dữ liệu đổi mật khẩu
 * @returns {Promise<Result<{ message: string }, string>>}
 */
export async function changePasswordAction(
  input: ChangePasswordFormDTO | FormData
): Promise<Result<{ message: string }, string>> {
  try {
    const sessionRes = await requireAuth();
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = ChangePasswordFormSchema.safeParse(rawData);

    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.auth.changePassword().execute(
      {
        userId: sessionRes.data.userId,
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        confirmPassword: parsed.data.confirmPassword,
      },
      sessionRes.data
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi đổi mật khẩu';
    return failure(`Đổi mật khẩu thất bại: ${message}`);
  }
}

/**
 * Server Action: Cập nhật thông tin hồ sơ cá nhân (UC03).
 *
 * @param {UpdateProfileInputDTO | FormData} input Dữ liệu cập nhật (fullName, phone)
 * @returns {Promise<Result<UserProfileDTO, string>>}
 */
export async function updateProfileAction(
  input: UpdateProfileInputDTO | FormData
): Promise<Result<UserProfileDTO, string>> {
  try {
    const sessionRes = await requireAuth();
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = UpdateProfileInputSchema.safeParse(rawData);

    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.auth.updateProfile().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/profile');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi cập nhật hồ sơ';
    return failure(`Cập nhật hồ sơ thất bại: ${message}`);
  }
}

/**
 * Server Action: Lấy thông tin tài khoản người dùng hiện tại đang đăng nhập (UC03).
 *
 * @returns {Promise<Result<UserProfileDTO, string>>}
 */
export async function getCurrentUserAction(): Promise<Result<UserProfileDTO, string>> {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
    }

    const result = await appContainer.auth.getProfile().execute(
      { userId: session.userId },
      session
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi lấy thông tin người dùng';
    return failure(`Không thể tải thông tin hồ sơ: ${message}`);
  }
}
