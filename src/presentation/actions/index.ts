/**
 * @file index.ts
 * @description Điểm tập kết xuất khẩu toàn bộ Server Actions của Tầng Presentation.
 * Đóng vai trò là Cổng giao tiếp máy chủ giữa UI (Next.js App Router) và Tầng Application Use Cases.
 * @module presentation/actions
 */

// Helper Quản trị Phiên & Input
export * from './session.helper';
export * from './form-parser.helper';
export * from './action-utils.helper';

// Phân hệ 1: Xác thực & Quản lý Tài khoản (UC01 - UC03)
export * from './auth.actions';

// Phân hệ 2: Quản lý Nhân sự & Phân quyền (UC04 - UC08)
export * from './staff.actions';

// Phân hệ 3: Quản lý Đơn hàng (UC09 - UC14)
export * from './order.actions';

// Phân hệ 4: Điều phối & Vòng đời Vận chuyển (UC15 - UC20)
export * from './shipment.actions';

// Phân hệ 5: Báo cáo & Quản lý Đối soát COD (UC21 - UC22)
export * from './cod.actions';

// Phân hệ 6: Tra cứu Công khai (UC23)
export * from './tracking.actions';
