/**
 * @file index.ts
 * @description Điểm tập kết xuất khẩu (Central Export) toàn bộ Zod Schemas và DTOs của tầng Application.
 * Phục vụ toàn diện cho tất cả 23 Use Cases của hệ thống Delivery Hub.
 * @module application/dtos
 */

// Validators bảo mật dùng chung
export * from './common-validators';

// Phân trang & Query cơ sở
export * from './pagination.dto';

// Phân hệ 1: Xác thực & Tài khoản (UC01 - UC03)
export * from './auth.dto';

// Phân hệ 2: Quản lý Nhân sự & Trạm (UC04 - UC08)
export * from './staff.dto';

// Phân hệ 3: Quản lý Đơn hàng (UC09 - UC14)
export * from './order.dto';

// Phân hệ 4: Trạng thái & Điều phối Vận chuyển (UC15 - UC20)
export * from './shipment.dto';

// Phân hệ 5: Báo cáo & Đối soát COD (UC21 - UC22)
export * from './cod.dto';

// Phân hệ 6: Tra cứu Vận đơn Công khai (UC23)
export * from './tracking.dto';
