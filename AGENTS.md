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

---

### 4. QUY CHUẨN GIAO DIỆN KIOTVIET DESIGN SYSTEM (BẮT BUỘC)

1. **BỐ CỤC ĐIỀU HƯỚNG TỔNG THỂ (GLOBAL LAYOUT):**
   * **Thanh Topbar Ngang:** Màu xanh thương hiệu KiotViet `#0066CC`, thương hiệu `DeliveryHub`, Hub Selector, Dropdown Menus phân hệ (`Tổng quan`, `Đơn hàng`, `Vận chuyển & Kho`, `Sổ quỹ & Đối soát`, `Nhân sự`, `Tra cứu`), và Nút hành động nổi bật màu xanh lá KiotViet `+ Tạo đơn` (`bg-[#16A34A] hover:bg-[#15803D]`).
   * **Bảo vệ phiên đăng nhập (Session Security):** Tuyệt đối không điều hướng làm mất HTTP-Only cookie hay chuyển hướng vô cớ sang các trang công khai. Khi xem chi tiết đơn hàng hoặc đổi trạng thái, thực thi in-place.

2. **MÀN HÌNH TÁC NGHIỆP 2 CỘT (HIGH DENSITY & ROW EXPANSION):**
   * **Cột trái:** Khung bộ lọc Accordion (260px) gồm khoảng thời gian, trạng thái đơn, shipper phụ trách, tiền COD.
   * **Cột phải:** Bảng dữ liệu nén cao (High-Density Table, font 12-13px, padding gọn `py-2 px-3`, border mỏng `border-slate-200`).
   * **Row Expansion (Phương án A):** Bấm vào dòng đơn hàng để trượt mở rộng (Slide-down) xem thông tin người gửi/nhận, tiền COD, và Timeline lịch sử kiểm vết ngay bên dưới mà không rời khỏi trang.
   * **Sticky Summary Footer:** Thanh tổng kết cố định ở đáy hiển thị Tổng số lượng bản ghi, Tổng tiền COD, và bộ phân trang.

3. **MÀN HÌNH POS BÁN LẺ & VẬN HÀNH KHO:**
   * Màn hình Tạo đơn `/orders/create` áp dụng giao diện POS 2 cột: Cột trái nhập thông tin bưu gửi, Cột phải là Phiếu bưu gửi tính cước tự động & Nút `Tạo đơn` màu xanh lá to bản.
   * Màn hình Vận hành kho `/shipments/*` tập trung ô quét Barcode to rõ, phản hồi âm thanh beep và danh sách xử lý theo đợt.


<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
