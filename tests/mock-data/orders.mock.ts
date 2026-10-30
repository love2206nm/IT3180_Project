/**
 * @file orders.mock.ts
 * @description Dữ liệu mẫu giả lập cho Đơn hàng & Log hành trình bao quát các trạng thái (UC09 - UC20, UC23).
 * @module tests/mock-data
 */

import { OrderStatus, PaymentBy, PaymentStatus } from '@prisma/client';

export interface MockOrderData {
  trackingCode: string;
  currentHubCode: string | null;
  assignedShipperUsername: string | null;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverProvince: string;
  receiverDistrict: string;
  receiverWard: string;
  weightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  codAmount: number;
  shippingFee: number;
  paymentBy: PaymentBy;
  paymentStatus: PaymentStatus;
  currentStatus: OrderStatus;
  deliveryAttempts: number;
  maxAttempts: number;
  notes: string;
}

export const MOCK_ORDERS: MockOrderData[] = [
  {
    trackingCode: 'MOCK-TRK-CREATED-01',
    currentHubCode: null,
    assignedShipperUsername: null,
    senderName: 'Shop Quần Áo Nam Định',
    senderPhone: '0988000111',
    senderAddress: 'Số 1 Trần Hưng Đạo, TP Nam Định',
    receiverName: 'Hoàng Hải Nam',
    receiverPhone: '0912000111',
    receiverAddress: 'Số 10 Phố Duy Tân',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Cầu Giấy',
    receiverWard: 'Dịch Vọng Hậu',
    weightGram: 500,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 5,
    codAmount: 200000,
    shippingFee: 25000,
    paymentBy: PaymentBy.RECEIVER,
    paymentStatus: PaymentStatus.UNPAID,
    currentStatus: OrderStatus.CREATED,
    deliveryAttempts: 0,
    maxAttempts: 3,
    notes: 'Đơn mock mới tạo chưa nhập trạm',
  },
  {
    trackingCode: 'MOCK-TRK-ATHUB-01',
    currentHubCode: 'MOCK-HUB-HN-01',
    assignedShipperUsername: null,
    senderName: 'Nhà Sách Trí Tuệ',
    senderPhone: '0988000222',
    senderAddress: 'Số 50 Giải Phóng, Hai Bà Trưng, Hà Nội',
    receiverName: 'Nguyễn Văn Minh',
    receiverPhone: '0912000222',
    receiverAddress: 'Số 22 Xuân Thủy',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Cầu Giấy',
    receiverWard: 'Dịch Vọng Hậu',
    weightGram: 1000,
    lengthCm: 25,
    widthCm: 18,
    heightCm: 6,
    codAmount: 0,
    shippingFee: 20000,
    paymentBy: PaymentBy.SENDER,
    paymentStatus: PaymentStatus.PAID,
    currentStatus: OrderStatus.AT_HUB,
    deliveryAttempts: 0,
    maxAttempts: 3,
    notes: 'Đơn mock đang lưu kho trạm Cầu Giấy chờ gán shipper',
  },
  {
    trackingCode: 'MOCK-TRK-OUT-01',
    currentHubCode: 'MOCK-HUB-HN-01',
    assignedShipperUsername: 'mock_shipper1',
    senderName: 'Cửa hàng Phụ Kiện Điện Thoại',
    senderPhone: '0988000333',
    senderAddress: 'Số 15 Tây Sơn, Đống Đa, Hà Nội',
    receiverName: 'Lê Thu Trang',
    receiverPhone: '0912000333',
    receiverAddress: 'Số 33 Trần Thái Tông',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Cầu Giấy',
    receiverWard: 'Dịch Vọng Hậu',
    weightGram: 350,
    lengthCm: 15,
    widthCm: 10,
    heightCm: 4,
    codAmount: 150000,
    shippingFee: 18000,
    paymentBy: PaymentBy.RECEIVER,
    paymentStatus: PaymentStatus.UNPAID,
    currentStatus: OrderStatus.OUT_FOR_DELIVERY,
    deliveryAttempts: 0,
    maxAttempts: 3,
    notes: 'Đơn mock Shipper 1 đang đi phát',
  },
  {
    trackingCode: 'MOCK-TRK-DELIVERED-01',
    currentHubCode: 'MOCK-HUB-HN-01',
    assignedShipperUsername: 'mock_shipper1',
    senderName: 'Công Ty Dược Phẩm Hà Tây',
    senderPhone: '0988000444',
    senderAddress: 'Số 100 Quang Trung, Hà Đông, Hà Nội',
    receiverName: 'Đặng Ngọc Ánh',
    receiverPhone: '0912000444',
    receiverAddress: 'Tòa nhà HITC, 239 Xuân Thủy',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Cầu Giấy',
    receiverWard: 'Dịch Vọng Hậu',
    weightGram: 250,
    lengthCm: 10,
    widthCm: 8,
    heightCm: 5,
    codAmount: 300000,
    shippingFee: 22000,
    paymentBy: PaymentBy.RECEIVER,
    paymentStatus: PaymentStatus.PAID,
    currentStatus: OrderStatus.DELIVERED,
    deliveryAttempts: 1,
    maxAttempts: 3,
    notes: 'Đơn mock giao thành công đã thu tiền COD',
  },
  {
    trackingCode: 'MOCK-TRK-FAILED-01',
    currentHubCode: 'MOCK-HUB-HN-01',
    assignedShipperUsername: 'mock_shipper2',
    senderName: 'Giày Da Nam Cao Cấp',
    senderPhone: '0988000555',
    senderAddress: 'Số 80 Hàng Bông, Hoàn Kiếm, Hà Nội',
    receiverName: 'Vũ Quốc Huy',
    receiverPhone: '0912000555',
    receiverAddress: 'Số 5 Hồ Tùng Mậu',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Cầu Giấy',
    receiverWard: 'Mai Dịch',
    weightGram: 800,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 12,
    codAmount: 450000,
    shippingFee: 30000,
    paymentBy: PaymentBy.RECEIVER,
    paymentStatus: PaymentStatus.UNPAID,
    currentStatus: OrderStatus.FAILED_ATTEMPT,
    deliveryAttempts: 1,
    maxAttempts: 3,
    notes: 'Khách không nghe máy, hẹn giao lại ca sau',
  },
  {
    trackingCode: 'MOCK-TRK-RETURN-01',
    currentHubCode: 'MOCK-HUB-HN-01',
    assignedShipperUsername: null,
    senderName: 'Mỹ Phẩm Xách Tay Nhật',
    senderPhone: '0988000666',
    senderAddress: 'Số 12 Kim Mã, Ba Đình, Hà Nội',
    receiverName: 'Phạm Bảo Châu',
    receiverPhone: '0912000666',
    receiverAddress: 'Số 9 Doãn Kế Thiện',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Cầu Giấy',
    receiverWard: 'Mai Dịch',
    weightGram: 400,
    lengthCm: 15,
    widthCm: 10,
    heightCm: 8,
    codAmount: 500000,
    shippingFee: 25000,
    paymentBy: PaymentBy.RECEIVER,
    paymentStatus: PaymentStatus.UNPAID,
    currentStatus: OrderStatus.RETURN_PENDING,
    deliveryAttempts: 3,
    maxAttempts: 3,
    notes: 'Giao thất bại 3 lần, tự động chuyển hoàn về người gửi',
  },
  {
    trackingCode: 'MOCK-TRK-CANCEL-01',
    currentHubCode: 'MOCK-HUB-HN-01',
    assignedShipperUsername: null,
    senderName: 'Văn Phòng Phẩm Hồng Hà',
    senderPhone: '0988000777',
    senderAddress: 'Số 25 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
    receiverName: 'Trịnh Thúy Vy',
    receiverPhone: '0912000777',
    receiverAddress: 'Số 70 Cầu Giấy',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Cầu Giấy',
    receiverWard: 'Dịch Vọng Hậu',
    weightGram: 300,
    lengthCm: 20,
    widthCm: 10,
    heightCm: 5,
    codAmount: 120000,
    shippingFee: 15000,
    paymentBy: PaymentBy.SENDER,
    paymentStatus: PaymentStatus.UNPAID,
    currentStatus: OrderStatus.CANCELLED,
    deliveryAttempts: 0,
    maxAttempts: 3,
    notes: 'Người gửi yêu cầu hủy đơn hàng trước khi xuất kho',
  },
];

