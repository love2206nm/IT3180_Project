/**
 * @file result.interface.ts
 * @description Định nghĩa Result Pattern chuẩn mực để đóng gói kết quả phản hồi của Use Cases và Server Actions.
 * @module application/interfaces
 */

/**
 * Kiểu kết quả thành công chứa dữ liệu trả về.
 */
export interface SuccessResult<TData> {
  success: true;
  data: TData;
}

/**
 * Kiểu kết quả thất bại chứa thông điệp lỗi và chi tiết validation lỗi theo từng trường (nếu có).
 */
export interface FailureResult<TError = string> {
  success: false;
  error: TError;
  /**
   * Chi tiết lỗi theo từng trường (thường sinh ra từ Zod field errors)
   * Ví dụ: { receiverPhone: ["Số điện thoại không hợp lệ"], weightGram: ["Khối lượng phải lớn hơn 0"] }
   */
  fieldErrors?: Record<string, string[]>;
}

/**
 * Union Type đại diện cho kết quả thực thi của một nghiệp vụ (Result Pattern).
 *
 * @template TData Kiểu dữ liệu khi thành công
 * @template TError Kiểu dữ liệu của thông điệp lỗi khi thất bại (mặc định là chuỗi string)
 */
export type Result<TData, TError = string> = SuccessResult<TData> | FailureResult<TError>;

/**
 * Hàm tiện ích tạo kết quả thành công.
 *
 * @param data Dữ liệu kết quả
 */
export function success<TData>(data: TData): SuccessResult<TData> {
  return { success: true, data };
}

/**
 * Hàm tiện ích tạo kết quả thất bại.
 *
 * @param error Thông điệp lỗi
 * @param fieldErrors Chi tiết lỗi của các trường input (nếu có)
 */
export function failure<TError = string>(
  error: TError,
  fieldErrors?: Record<string, string[]>
): FailureResult<TError> {
  return { success: false, error, fieldErrors };
}

/**
 * Type guard kiểm tra kết quả thành công.
 */
export function isSuccess<TData, TError>(result: Result<TData, TError>): result is SuccessResult<TData> {
  return result.success === true;
}

/**
 * Type guard kiểm tra kết quả thất bại.
 */
export function isFailure<TData, TError>(result: Result<TData, TError>): result is FailureResult<TError> {
  return result.success === false;
}

