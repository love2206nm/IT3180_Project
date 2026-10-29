# QUY CHUẨN NEXT.JS APP ROUTER & SERVER ACTIONS (NEXTJS GUIDELINES)
**Áp dụng cho:** Thư mục `src/app/` và `src/presentation/`

---

## 1. Ranh giới Server Components (RSC) vs Client Components

Next.js App Router phân chia rõ rệt giữa Server Components và Client Components:

### Mặc định: Luôn là Server Components (RSC)
* Tất cả các file `page.tsx`, `layout.tsx` và components mặc định là Server Components.
* Fetch dữ liệu ban đầu, render HTML sẵn từ server, tốc độ tải nhanh, không làm nặng JavaScript gửi về trình duyệt.

### Chỉ dùng `"use client"` khi BẮT BUỘC:
Chỉ thêm chỉ thị `"use client"` ở **Component lá (Leaf Components)** khi:
1. Có lắng nghe sự kiện người dùng (`onClick`, `onChange`, `onSubmit`).
2. Sử dụng React Hooks (`useState`, `useEffect`, `useRef`, `useTransition`).
3. Tương tác với Browser APIs (Camera Barcode Scanner, Geolocation API, LocalStorage).

> [!CAUTION]
> **CẤM RÒ RỈ DATABASE TRONG CLIENT COMPONENTS:**
> Bất kỳ component nào có cờ `"use client"` **tuyệt đối không được import** `@prisma/client`, file repository, hoặc đọc các biến môi trường nhạy cảm (`DATABASE_URL`, `JWT_SECRET`).

---

## 2. Quy chuẩn Next.js Server Actions (`src/presentation/actions/`)

Server Actions đóng vai trò là "Controller" kết nối giao diện người dùng với các Use Cases tại `src/application/use-cases/`.

### Mẫu chuẩn cho Server Action:
```typescript
'use server';

import { z } from 'zod';
import { CreateOrderDTO, CreateOrderSchema } from '@/application/dtos/order.dto';
import { CreateOrderUseCase } from '@/application/use-cases/orders/create-order.use-case';
import { PrismaOrderRepository } from '@/infrastructure/database/repositories/prisma-order.repository';

// Khởi tạo instance (hoặc qua Container Dependency Injection)
const orderRepo = new PrismaOrderRepository();
const createOrderUseCase = new CreateOrderUseCase(orderRepo);

/**
 * Server Action tiếp nhận tạo mới đơn hàng từ UI.
 * @param rawInput Dữ liệu gửi lên từ form
 * @returns Result Object có type rõ ràng
 */
export async function createOrderAction(rawInput: unknown) {
  // 1. Validate Input bằng Zod Schema
  const parseResult = CreateOrderSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Dữ liệu đầu vào không hợp lệ',
      details: parseResult.error.flatten().fieldErrors,
    };
  }

  // 2. Triệu gọi Application Use Case
  try {
    const result = await createOrderUseCase.execute(parseResult.data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống khi tạo đơn';
    return {
      success: false,
      error: message,
    };
  }
}
```

---

## 3. Thiết kế Giao diện Phân quyền & Mobile-First cho Shipper

1. **Giao diện Shipper (`src/app/(dashboard)/shipper/`):**
   * Thiết kế theo chuẩn **Mobile-First Responsive** (tối ưu kích thước nút bấm lớn, dễ thao tác 1 tay khi đi xe máy, hỗ trợ quét mã vạch và tải ảnh POD nhanh).
2. **Giao diện Quản lý & Hub Staff (`src/app/(dashboard)/admin/`, `src/app/(dashboard)/staff/`):**
   * Thiết kế Dashboard Desktop hiển thị bảng dữ liệu (Data Table), bộ lọc trạng thái nhiều tiêu chí, và trang điều phối gán đơn hàng loạt.
3. **Trang Tra cứu Công khai (`src/app/tracking/`):**
   * Không yêu cầu đăng nhập, hiển thị Timeline trực quan, tự động ẩn bớt 3 số giữa của SĐT người gửi/nhận vì lý do bảo mật thông tin cá nhân.
