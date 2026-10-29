/**
 * @file domain.exception.ts
 * @description Lớp cơ sở (Base Class) cho toàn bộ Domain Exceptions.
 * @module domain/exceptions
 */

/**
 * Lớp ngoại lệ cơ sở của tầng Domain.
 * Đóng gói thông điệp lỗi và mã lỗi nghiệp vụ chuẩn hóa.
 */
export abstract class BaseDomainException extends Error {
  /**
   * Mã lỗi nghiệp vụ duy nhất.
   */
  public abstract readonly errorCode: string;

  /**
   * Khởi tạo ngoại lệ tầng Domain.
   * @param message Thông điệp mô tả lỗi chi tiết
   */
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Khôi phục prototype chain khi kế thừa Error trong TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
