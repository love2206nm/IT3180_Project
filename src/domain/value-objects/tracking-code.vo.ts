/**
 * @file tracking-code.vo.ts
 * @description Value Object biểu diễn Mã vận đơn duy nhất tra cứu bưu kiện.
 * @module domain/value-objects
 */

import { BaseDomainException } from '../exceptions/domain.exception';

export class InvalidTrackingCodeException extends BaseDomainException {
  public readonly errorCode = 'INVALID_TRACKING_CODE';
  constructor(code: string) {
    super(`Mã vận đơn '${code}' không hợp lệ. Mã phải từ 8 đến 30 ký tự chữ và số.`);
  }
}

/**
 * Value Object bất biến đại diện cho Mã vận đơn (Tracking Code).
 */
export class TrackingCode {
  private readonly value: string;

  /**
   * Khởi tạo và kiểm tra tính hợp lệ của mã vận đơn.
   * @param rawCode Chuỗi mã vận đơn thô
   * @throws {InvalidTrackingCodeException} Nếu mã không đúng định dạng
   */
  constructor(rawCode: string) {
    const sanitized = rawCode.trim().toUpperCase();
    if (!TrackingCode.isValid(sanitized)) {
      throw new InvalidTrackingCodeException(rawCode);
    }
    this.value = sanitized;
  }

  /**
   * Kiểm tra chuỗi có phải mã vận đơn hợp lệ không.
   * @param code Chuỗi cần kiểm tra
   * @returns boolean
   */
  public static isValid(code: string): boolean {
    // Độ dài từ 8 đến 30 ký tự, chỉ gồm chữ cái, số và dấu gạch nối
    const regex = /^[A-Z0-9-]{8,30}$/;
    return regex.test(code);
  }

  /**
   * Sinh mã vận đơn tự động theo chuẩn bưu cục: TRK-YYYYMMDD-XXXX
   * @returns Instance TrackingCode mới
   */
  public static generate(): TrackingCode {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return new TrackingCode(`TRK-${year}${month}${day}-${randomHex}`);
  }

  /**
   * Lấy giá trị chuỗi mã vận đơn.
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * So sánh bằng giá trị với một TrackingCode khác.
   */
  public equals(other: TrackingCode): boolean {
    return this.value === other.getValue();
  }

  public toString(): string {
    return this.value;
  }
}
