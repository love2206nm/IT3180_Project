/**
 * @file env.ts
 * @description Nạp và kiểm định các biến môi trường hệ thống sử dụng Zod Schema (Fail-Fast).
 * Ngăn chặn lỗi khởi động do thiếu cấu hình hoặc sử dụng khóa bí mật không an toàn.
 * @module infrastructure/config
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Nạp file .env vào process.env nếu chưa nạp
dotenv.config();

const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Zod Schema định nghĩa và kiểm tra tính hợp lệ của toàn bộ biến môi trường.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL không được để trống'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET phải có độ dài tối thiểu 32 ký tự để đảm bảo an toàn mật mã')
    .default(
      isTestEnv
        ? 'ci-test-jwt-secret-key-delivery-hub-it3180-system-secure-32chars'
        : (undefined as unknown as string)
    ),
  JWT_EXPIRES_IN: z
    .string()
    .default('1d'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z
    .coerce
    .number()
    .default(3000),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Hàm phân tích và kiểm định cấu hình môi trường.
 * Sẽ ném ngoại lệ rõ ràng và dừng ứng dụng (Fail-Fast) nếu thiếu biến bắt buộc.
 */
function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => ` - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');

    console.error('❌ LỖI CẤU HÌNH BIẾN MÔI TRƯỜNG KHÔNG HỢP LỆ:\n' + errorDetails);
    throw new Error('Lỗi cấu hình biến môi trường hệ thống. Vui lòng kiểm tra lại file .env.');
  }

  return Object.freeze(result.data);
}

/**
 * Cấu hình môi trường đã được xác thực an toàn toàn cục.
 */
export const env: EnvConfig = parseEnv();
