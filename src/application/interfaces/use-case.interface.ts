/**
 * @file use-case.interface.ts
 * @description Hợp đồng chuẩn cho toàn bộ các Ca sử dụng (Use Cases) trong hệ thống.
 * @module application/interfaces
 */

import type { SecurityContext } from './security-context.interface';

/**
 * Interface trừu tượng cho một Use Case nghiệp vụ.
 * Áp dụng nguyên tắc Single Responsibility: mỗi Use Case chỉ có một phương thức `execute`.
 * Hỗ trợ tham số ngữ cảnh bảo mật `context` nhằm thực thi nguyên tắc Fail-Closed và Zero-Trust.
 *
 * @template TInput Kiểu dữ liệu đầu vào (DTO)
 * @template TOutput Kiểu dữ liệu trả về (DTO hoặc Result)
 * @template TContext Kiểu dữ liệu ngữ cảnh bảo mật (mặc định là SecurityContext)
 */
export interface IUseCase<TInput, TOutput, TContext = SecurityContext> {
  /**
   * Thực thi logic nghiệp vụ của Use Case.
   *
   * @param input Dữ liệu đầu vào đã được validate
   * @param context Ngữ cảnh bảo mật của phiên làm việc (nếu có hoặc bắt buộc)
   * @returns {Promise<TOutput>} Kết quả sau khi thực thi
   */
  execute(input: TInput, context?: TContext): Promise<TOutput>;
}
