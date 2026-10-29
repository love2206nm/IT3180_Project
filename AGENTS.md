# BỘ NGUYÊN TẮC TỐI CAO DÀNH CHO AI AGENT (AGENTS.MD)
## Dự án: Hệ Thống Quản Lý Delivery Hub (IT3180)
**Nền tảng:** TypeScript / Next.js (App Router) + Clean Architecture Monolith  
**Mục tiêu:** Phát triển nhanh (Vibe Coding) nhưng bảo đảm 100% kỷ luật kiến trúc, sạch sẽ và an toàn.

---

### 1. NGUYÊN TẮC BẤT BIẾN KHI VIBE CODING

1. **CẤM TUYỆT ĐỐI HARDCODE VÀ HARDVALUE (MAGIC STRINGS & NUMBERS):**
   * Mọi trạng thái vận chuyển (`CREATED`, `AT_HUB`, `DELIVERED`...), chức vụ (`ADMIN`, `SHIPPER`...), mã lỗi phải được định nghĩa trong `src/domain/constants/`.
   * Mọi số ma thuật (ví dụ: số lần giao tối đa `3`, đơn vị tiền tệ, dung lượng file upload) phải đưa vào hằng số cấu hình.
   * Mọi URL, Secret Key, chuỗi kết nối CSDL phải tải qua `src/infrastructure/config/` và đọc từ `.env`.

2. **BẮT BUỘC CHÚ THÍCH KIỂU DỮ LIỆU TƯỜNG MINH (STRICT TYPING & JSDOC):**
   * Mọi hàm (function), phương thức (method), tham số (parameter) và giá trị trả về (return type) PHẢI có kiểu dữ liệu tường minh.
   * **CẤM TUYỆT ĐỐI sử dụng `any`**. Dùng `unknown` kèm Type Guard hoặc Generic có ràng buộc.
   * Mọi hàm nghiệp vụ (Use Cases, Repository methods) bắt buộc có block JSDoc `@param`, `@returns`, `@throws`.

3. **TỰ ĐỘNG SỬ DỤNG MCP TOOLS ĐỂ KIỂM TRA:**
   * Sau khi tạo hoặc chỉnh sửa trang giao diện (UI) hoặc Route Handlers, Agent **chủ động sử dụng Chrome DevTools MCP** (`navigate_page`, `list_console_messages`, `take_screenshot`) để kiểm chứng trực tiếp màn hình render thực tế và bảo đảm không có lỗi đỏ trong console trình duyệt.

4. **LUÔN CHẠY `verify_loops` TRƯỚC KHI KẾT THÚC TASK:**
   * Trước khi thông báo hoàn thành nhiệm vụ cho người dùng, Agent bắt buộc phải thực thi lệnh:
     ```powershell
     node scripts/verify_loops.mjs
     ```
   * Chỉ khi toàn bộ Scorecard báo **100% PASS** thì nhiệm vụ mới được coi là hoàn tất.

---

### 2. PHÂN TẦNG CLEAN ARCHITECTURE TRONG `src/`

```text
src/
├── domain/            # 1. ĐỘC LẬP HOÀN TOÀN (Entities, Value Objects, Interfaces, Constants, Exceptions)
├── application/       # 2. CHỈ PHỤ THUỘC DOMAIN (Use Cases, DTOs với Zod, Application Interfaces)
├── infrastructure/    # 3. TRIỂN KHAI KỸ THUẬT (Database/Prisma, Repositories, Storage, Security, Config)
├── presentation/      # 4. GIAO DIỆN & ADAPTER (Next.js Server Actions, Components, Hooks)
└── app/               # 5. NEXT.JS APP ROUTER (Routes, Layouts, Route Handlers)
```

* **Luồng phụ thuộc một chiều:** `app` / `presentation` $\rightarrow$ `application` $\rightarrow$ `domain`.
* `src/domain` KHÔNG BAO GIỜ được phép import từ các tầng ngoài hoặc thư viện ngoài.
* `src/application` KHÔNG BAO GIỜ được import trực tiếp từ `src/infrastructure/database` (phải thông qua interface tại `src/domain/interface/repositories`).
* Client Components (`"use client"`) **tuyệt đối không được import** database client, Prisma hoặc secret keys.

---

### 3. VÒNG ĐỜI VẬN CHUYỂN & AUDIT TRAIL

* Mọi thay đổi trạng thái đơn hàng (`current_status`) bắt buộc phải:
  1. Sử dụng Database Transaction (ACID) khi có liên quan đến tiền COD.
  2. Tạo bản ghi lịch sử kiểm vết không thể sửa đổi (Immutable Audit Log) trong `order_status_logs`.
