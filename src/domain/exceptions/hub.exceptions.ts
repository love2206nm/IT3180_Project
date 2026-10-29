/**
 * @file hub.exceptions.ts
 * @description Các ngoại lệ nghiệp vụ liên quan đến Trạm giao nhận (Hub).
 * @module domain/exceptions
 */

import { BaseDomainException } from './domain.exception';

/**
 * Ngoại lệ không tìm thấy trạm giao nhận.
 */
export class HubNotFoundException extends BaseDomainException {
  public readonly errorCode = 'HUB_NOT_FOUND';

  /**
   * @param identifier ID hoặc Mã trạm
   */
  constructor(identifier: string | number) {
    super(`Không tìm thấy trạm giao nhận với thông tin: '${identifier}'`);
  }
}

/**
 * Ngoại lệ thao tác trên trạm đang tạm dừng hoạt động.
 */
export class HubInactiveException extends BaseDomainException {
  public readonly errorCode = 'HUB_INACTIVE';

  /**
   * @param hubCode Mã trạm
   */
  constructor(hubCode: string) {
    super(`Trạm giao nhận '${hubCode}' hiện đang tạm ngừng hoạt động.`);
  }
}
