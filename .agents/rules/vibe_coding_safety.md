# QUY TẮC AN TOÀN KHI VIBE CODING (VIBE CODING SAFETY RULES)
**Mục tiêu:** Cho phép phát triển tốc độ cao với AI nhưng ngăn chặn tuyệt đối lỗi bảo mật, code rác, trôi dạt kiến trúc và nợ kỹ thuật.

---

## 1. CẤM TUYỆT ĐỐI HARDCODE & HARDVALUES

> [!CAUTION]
> **Không bao giờ được viết chuỗi thô (Magic Strings) hoặc số nguyên thô (Magic Numbers) trực tiếp vào logic xử lý!**

### Quy chuẩn xử lý:
1. **Trạng thái đơn hàng, chức vụ, mã lỗi:**
   * Bắt buộc khai báo tại `src/domain/constants/` dưới dạng TypeScript `enum` hoặc `as const`.
   ```typescript
   // ❌ SAI (Hardcode chuỗi trần):
   if (order.status === "DELIVERED") { ... }
   if (user.role === "SHIPPER") { ... }

   // ✅ ĐÚNG (Sử dụng Constants từ Domain):
   import { ORDER_STATUS, USER_ROLE } from "@/domain/constants";
   if (order.status === ORDER_STATUS.DELIVERED) { ... }
   if (user.role === USER_ROLE.SHIPPER) { ... }
   ```

2. **Số ma thuật (Magic Numbers):**
   * Số lần giao tối đa, kích thước tối đa file ảnh POD, tỷ lệ quy đổi cân nặng phải đưa vào hằng số cấu hình nghiệp vụ:
   ```typescript
   // ❌ SAI:
   if (order.deliveryAttempts >= 3) { ... }

   // ✅ ĐÚNG:
   import { DELIVERY_CONSTRAINTS } from "@/domain/constants";
   if (order.deliveryAttempts >= DELIVERY_CONSTRAINTS.MAX_DELIVERY_ATTEMPTS) { ... }
   ```

3. **Cấu hình môi trường & Secrets:**
   * CẤM viết cứng URL, API Key, JWT Secret, thông tin CSDL.
   * Tất cả phải nạp qua `src/infrastructure/config/env.config.ts` có Zod Schema validate lúc app khởi động.

---

## 2. BẮT BUỘC CHÚ THÍCH KIỂU DỮ LIỆU ĐẦY ĐỦ (STRICT TYPING & JSDOC)

> [!IMPORTANT]
> **Dự án kích hoạt Strict Mode. Mọi hàm và tham số đều phải có Type Annotation rõ ràng!**

### Quy chuẩn:
1. **Không sử dụng `any`:**
   * Cấm `: any`, `as any`, `<any>`.
   * Nếu kiểu dữ liệu chưa xác định từ bên ngoài, dùng `unknown` kết hợp Zod schema parser hoặc Type Guard.
2. **Khai báo kiểu trả về tường minh:**
   ```typescript
   // ❌ SAI (Không có kiểu dữ liệu tham số và giá trị trả về):
   export async function calculateFee(weight, distance) {
     return weight * 10 + distance * 5;
   }

   // ✅ ĐÚNG (Có JSDoc và strict typing):
   /**
    * Tính toán cước phí vận chuyển dựa trên khối lượng và khoảng cách.
    * @param weightGram Khối lượng bưu kiện (đơn vị: gram)
    * @param distanceKm Khoảng cách giao hàng (đơn vị: km)
    * @returns Tổng cước phí vận chuyển (VNĐ)
    */
   export function calculateShippingFee(weightGram: number, distanceKm: number): number {
     return weightGram * 10 + distanceKm * 5000;
   }
   ```
3. **Use Case Return Pattern:**
   * Các Use Case và Server Actions phải trả về Result Pattern chuẩn hóa:
   ```typescript
   export type Result<T, E = string> = 
     | { success: true; data: T }
     | { success: false; error: E };
   ```

---

## 3. TỰ ĐỘNG DÙNG MCP TOOLS ĐỂ KIỂM TRA (RUNTIME VERIFICATION)

Khi phát triển hoặc sửa đổi các trang giao diện (UI) hoặc API Route trong Next.js:
1. **Chủ động sử dụng Chrome DevTools MCP:**
   * Dùng `list_pages` và `navigate_page` để mở trang web cần test.
   * Dùng `list_console_messages` để kiểm tra có lỗi runtime, React hydration mismatch, hay 404/500 API calls hay không.
   * Dùng `take_screenshot` để trực tiếp kiểm tra bố cục hiển thị (responsive cho Shipper và Hub Staff).
2. **Không kết luận hoàn thành nếu chưa kiểm chứng trực tiếp:**
   * Tránh giả định "code viết xong là chạy được"; luôn đối soát log console trước khi trả lời.

---

## 4. BẮT BUỘC CHẠY `verify_loops` TRƯỚC KHI BÀN GIAO

* Bất kỳ khi nào kết thúc một tác vụ lập trình hoặc trước khi yêu cầu phản hồi từ người dùng, Agent **PHẢI** thực thi:
  ```powershell
  node scripts/verify_loops.mjs
  ```
* Nếu có bất kỳ cảnh báo hoặc lỗi vi phạm kiến trúc nào (Scorecard FAILED):
  1. Đọc kỹ thông báo lỗi chi tiết do script xuất ra.
  2. Tự động khắc phục triệt để.
  3. Chạy lại `verify_loops.mjs` cho đến khi đạt trạng thái **ALL PASSED (100% xanh)**.
