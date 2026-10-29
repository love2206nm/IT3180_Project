/**
 * @file user.exceptions.ts
 * @description Các ngoại lệ nghiệp vụ liên quan đến tài khoản người dùng và xác thực.
 * @module domain/exceptions
 */

import { BaseDomainException } from './domain.exception';

/**
 * Ngoại lệ không tìm thấy tài khoản người dùng theo ID, username hoặc email.
 */
export class UserNotFoundException extends BaseDomainException {
  public readonly errorCode = 'USER_NOT_FOUND';

  /**
   * @param identifier Định danh người dùng không tìm thấy
   */
  constructor(identifier: string | number) {
    super(`Không tìm thấy người dùng với thông tin: '${identifier}'`);
  }
}

/**
 * Ngoại lệ khi tài khoản đã bị khóa hoặc ngừng hoạt động cố tình thực hiện thao tác.
 */
export class UserInactiveException extends BaseDomainException {
  public readonly errorCode = 'USER_INACTIVE';

  /**
   * @param username Tên đăng nhập bị khóa
   */
  constructor(username: string) {
    super(`Tài khoản '${username}' hiện đang bị vô hiệu hóa hoặc bị khóa.`);
  }
}

/**
 * Ngoại lệ trùng lặp thông tin duy nhất (Email, Username, Số điện thoại).
 */
export class DuplicateUserCredentialsException extends BaseDomainException {
  public readonly errorCode = 'DUPLICATE_USER_CREDENTIALS';

  /**
   * @param field Tên trường bị trùng (email, phone, username)
   * @param value Giá trị bị trùng
   */
  constructor(field: string, value: string) {
    super(`Thông tin '${field}' với giá trị '${value}' đã tồn tại trong hệ thống.`);
  }
}

/**
 * Ngoại lệ thông tin đăng nhập không chính xác hoặc không đủ quyền truy cập.
 */
export class InvalidCredentialsException extends BaseDomainException {
  public readonly errorCode = 'INVALID_CREDENTIALS';

  constructor(message = 'Tên đăng nhập hoặc mật khẩu không chính xác.') {
    super(message);
  }
}
