/**
 * @file client.ts
 * @description Khởi tạo và quản lý PrismaClient Singleton cho toàn bộ hệ thống.
 * @module infrastructure/database/prisma
 *
 * =============================================================================
 * HƯỚNG DẪN CÁC LỆNH TẮT TERMINAL CHO DATABASE (CHẠY TẠI THƯ MỤC GỐC):
 * =============================================================================
 * 1. Sinh lại mã Prisma Client khi sửa schema:
 *    $ npm run db:generate
 *
 * 2. Đẩy trực tiếp schema lên PostgreSQL (dùng khi prototype / dev nhanh):
 *    $ npm run db:push
 *
 * 3. Tạo file migration chính thức (dùng khi chốt cấu trúc CSDL):
 *    $ npm run db:migrate
 *
 * 4. Nạp dữ liệu mẫu ban đầu (Admin, Hubs, Shippers, Đơn hàng demo):
 *    $ npm run db:seed
 *
 * 5. Mở giao diện trực quan quản lý CSDL (Prisma Studio):
 *    $ npm run db:studio
 * =============================================================================
 */

import { PrismaClient } from '@prisma/client';

/**
 * Khai báo kiểu mở rộng cho biến môi trường toàn cục (globalThis).
 * Mục đích: Lưu trữ instance của PrismaClient vào global scope trong môi trường Node.js.
 */
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * Hàm khởi tạo đối tượng PrismaClient với cấu hình logging.
 * - Trong môi trường 'development': Bật log 'query', 'error', 'warn' để lập trình viên dễ debug câu lệnh SQL.
 * - Trong môi trường 'production': Chỉ bật log 'error' để tối ưu hiệu năng và tránh rò rỉ dữ liệu nhạy cảm.
 *
 * @returns {PrismaClient} Đối tượng PrismaClient đã cấu hình
 */
function createPrismaClient(): PrismaClient {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return new PrismaClient({
    log: isDevelopment
      ? [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ]
      : [{ emit: 'stdout', level: 'error' }],
  });
}

/**
 * ÁP DỤNG MÔ HÌNH SINGLETON PATTERN:
 * 
 * Vấn đề trong Next.js:
 * Khi phát triển (development), cơ chế Fast Refresh (Hot Module Replacement) của Next.js
 * sẽ biên dịch lại code mỗi khi bạn lưu file. Nếu khởi tạo `new PrismaClient()` thông thường,
 * mỗi lần reload sẽ mở một Connection Pool mới tới PostgreSQL -> Rất nhanh chóng làm cạn kiệt
 * số lượng kết nối tối đa của CSDL (lỗi: "FATAL: too many connections for role").
 *
 * Giải pháp:
 * Lưu PrismaClient vào `globalThis.prismaGlobal`. Nếu biến toàn cục này đã tồn tại,
 * ta tái sử dụng lại; nếu chưa có thì mới tạo mới.
 */
export const prisma: PrismaClient = globalThis.prismaGlobal ?? createPrismaClient();

// Trong môi trường development, gán instance vào biến global để tái sử dụng qua các lần reload
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Hàm hỗ trợ ngắt kết nối an toàn khi server tắt (Graceful Shutdown).
 * Có thể gọi trong các script test hoặc khi nhận tín hiệu SIGTERM/SIGINT.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
