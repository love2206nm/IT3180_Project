/**
 * @file phone-number.vo.ts
 * @description Value Object biểu diễn và chuẩn hóa Số điện thoại liên hệ tại Việt Nam.
 * @module domain/value-objects
 */

import { BaseDomainException } from '../exceptions/domain.exception';

export class InvalidPhoneNumberException extends BaseDomainException {
  public readonly errorCode = 'INVALID_PHONE_NUMBER';
  constructor(phone: string) {
    super(`Số điện thoại '${phone}' không hợp lệ. Phải là số điện thoại Việt Nam 10 chữ số hợp lệ.`);
  }
}

/**
 * Value Object bất biến đại diện cho Số điện thoại liên lạc.
 */
export class PhoneNumber {
  private readonly value: string;

  /**
   * Khởi tạo số điện thoại đã chuẩn hóa.
   * @param rawPhone Chuỗi số điện thoại thô
   * @throws {InvalidPhoneNumberException} Khi số điện thoại không hợp lệ
   */
  constructor(rawPhone: string) {
    // Loại bỏ dấu cách, dấu gạch nối, tiền tố +84 nếu có
    let sanitized = rawPhone.replace(/[\s-]/g, '');
    if (sanitized.startsWith('+84')) {
      sanitized = '0' + sanitized.substring(3);
    } else if (sanitized.startsWith('84') && sanitized.length === 11) {
      sanitized = '0' + sanitized.substring(2);
    }

    if (!PhoneNumber.isValid(sanitized)) {
      throw new InvalidPhoneNumberException(rawPhone);
    }
    this.value = sanitized;
  }

  /**
   * Kiểm tra định dạng số điện thoại Việt Nam:
   * - Di động 10 số (bắt đầu bằng 03, 05, 07, 08, 09)
   * - Điện thoại cố định bưu cục 11 số (bắt đầu bằng 02: 024, 028...)
   */
  public static isValid(phone: string): boolean {
    const vnPhoneRegex = /^(03|05|07|08|09)\d{8}$|^02\d{9}$/;
    return vnPhoneRegex.test(phone);
  }

  public getValue(): string {
    return this.value;
  }

  /**
   * Ẩn các số ở giữa để bảo vệ quyền riêng tư người dùng khi tra cứu công khai (UC23).
   * Ví dụ: '0912345678' -> '0912***678'
   */
  public toMaskedString(): string {
    if (this.value.length === 10) {
      return `${this.value.substring(0, 4)}***${this.value.substring(7)}`;
    }
    return this.value;
  }

  public equals(other: PhoneNumber): boolean {
    return this.value === other.getValue();
  }

  public toString(): string {
    return this.value;
  }
}
