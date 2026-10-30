/**
 * @file session.helper.ts
 * @description Trình quản trị phiên xác thực và phân quyền máy chủ qua HTTP-Only Cookie.
 * Đọc, giải mã và thẩm định JWT Token an toàn, trích xuất SecurityContext cho Server Actions.
 * @module presentation/actions/session.helper
 */

import { cookies } from 'next/headers';
import type { UserRole } from '../../domain';
import type { SecurityContext, Result } from '../../application/interfaces';
import { success, failure } from '../../application/interfaces';
import { appContainer } from '../../infrastructure/di';

/** Tên định danh Cookie lưu phiên JWT */
export const AUTH_COOKIE_NAME = 'auth_token';

/** Thời gian sống của Cookie: 7 ngày (tính bằng giây) */
export const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/** Bộ nhớ cookie giả lập dùng riêng cho môi trường kiểm thử Unit Tests */
let mockCookieStore: Map<string, string> | null = null;

/**
 * Bật chế độ giả lập cookie cho môi trường kiểm thử Unit Tests.
 */
export function __enableMockCookies(): void {
  mockCookieStore = new Map<string, string>();
}

/**
 * Tắt chế độ giả lập cookie (chuyển về đọc cookie thực của Next.js).
 */
export function __disableMockCookies(): void {
  mockCookieStore = null;
}

/**
 * Đặt lại trạng thái bộ nhớ cookie giả lập.
 */
export function __resetMockCookies(): void {
  if (mockCookieStore) {
    mockCookieStore.clear();
  } else {
    mockCookieStore = new Map<string, string>();
  }
}

/**
 * Gán cookie giả lập khi chạy kiểm thử ngoài môi trường Next.js Request Context.
 * @param {string} name Tên cookie
 * @param {string | null} value Giá trị cookie hoặc null để xóa
 */
export function __setMockCookie(name: string, value: string | null): void {
  if (!mockCookieStore) {
    mockCookieStore = new Map<string, string>();
  }
  if (value === null) {
    mockCookieStore.delete(name);
  } else {
    mockCookieStore.set(name, value);
  }
}

/**
 * Trích xuất chuỗi JWT Token từ HTTP-Only Cookie.
 * @returns {Promise<string | null>}
 */
export async function getAuthTokenFromCookie(): Promise<string | null> {
  if (mockCookieStore !== null) {
    return mockCookieStore.get(AUTH_COOKIE_NAME) ?? null;
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
  } catch {
    // Trường hợp thực thi ngoài ngữ cảnh Request của Next.js (ví dụ unit tests)
    return null;
  }
}

/**
 * Lấy ngữ cảnh bảo mật người dùng hiện tại (SecurityContext) từ Cookie.
 * Trả về null nếu chưa đăng nhập hoặc token đã hết hạn / bị thu hồi.
 *
 * @returns {Promise<SecurityContext | null>}
 */
export async function getCurrentUserSession(): Promise<SecurityContext | null> {
  const token = await getAuthTokenFromCookie();
  if (!token) {
    return null;
  }

  const payload = appContainer.authTokenService.verifyToken(token);
  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    hubId: payload.hubId ?? null,
  };
}

/**
 * Kiểm tra xác thực bắt buộc và phân quyền vai trò (RBAC - Fail-Closed).
 *
 * @param {UserRole[]} [allowedRoles] Danh sách vai trò được phép (bỏ trống nếu cho phép mọi user đã đăng nhập)
 * @returns {Promise<Result<SecurityContext, string>>}
 */
export async function requireAuth(
  allowedRoles?: UserRole[]
): Promise<Result<SecurityContext, string>> {
  const session = await getCurrentUserSession();

  if (!session) {
    return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.role)) {
      return failure('Bạn không có quyền thực hiện thao tác này.');
    }
  }

  return success(session);
}

/**
 * Thiết lập HTTP-Only Cookie lưu JWT Token an toàn sau khi đăng nhập thành công.
 * Áp dụng các cờ phòng thủ: httpOnly, secure (production), sameSite: lax.
 *
 * @param {string} token Chuỗi JWT Token vừa ký
 * @returns {Promise<void>}
 */
export async function setAuthCookie(token: string): Promise<void> {
  if (mockCookieStore !== null) {
    mockCookieStore.set(AUTH_COOKIE_NAME, token);
    return;
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE,
    });
  } catch {
    // Bỏ qua lỗi ngữ cảnh khi kiểm thử
  }
}

/**
 * Xóa HTTP-Only Cookie khi đăng xuất.
 * @returns {Promise<void>}
 */
export async function clearAuthCookie(): Promise<void> {
  if (mockCookieStore !== null) {
    mockCookieStore.delete(AUTH_COOKIE_NAME);
    return;
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  } catch {
    // Bỏ qua lỗi ngữ cảnh khi kiểm thử
  }
}
