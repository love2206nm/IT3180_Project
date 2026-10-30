/**
 * @file seed.ts
 * @description Script nạp dữ liệu mẫu ban đầu (Database Seeder) cho hệ thống Delivery Hub.
 * @module infrastructure/database/prisma
 *
 * =============================================================================
 * HƯỚNG DẪN THỰC THI SCRIPT SEED DỮ LIỆU:
 * =============================================================================
 * Chạy lệnh sau tại thư mục gốc của dự án:
 *   $ npm run db:seed
 *
 * Yêu cầu:
 *   Đã cấu hình DATABASE_URL hợp lệ trong file .env và đã chạy lệnh push schema:
 *   $ npm run db:push
 * =============================================================================
 */

import { PrismaClient, UserRole, UserStatus, HubStatus, PaymentBy, PaymentStatus, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Hàm thực thi nạp dữ liệu mẫu theo thứ tự phụ thuộc khóa ngoại.
 */
async function main() {
  console.log('🚀 [SEED] Bắt đầu quá trình nạp dữ liệu mẫu vào PostgreSQL...\n');

  // ---------------------------------------------------------------------------
  // BƯỚC 1: DỌN DẸP DỮ LIỆU CŨ (CLEAN SLATE)
  // Xóa theo thứ tự từ bảng con (chứa khóa ngoại) đến bảng cha để tránh vi phạm Foreign Key
  // ---------------------------------------------------------------------------
  console.log('🧹 [BƯỚC 1/6] Dọn dẹp dữ liệu cũ trong các bảng...');
  await prisma.cODSettlementDetail.deleteMany({});
  await prisma.cODSettlement.deleteMany({});
  await prisma.orderStatusLog.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.shipperZone.deleteMany({});
  await prisma.deliveryZone.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.hub.deleteMany({});
  console.log('   ✔ Đã làm sạch toàn bộ dữ liệu cũ.\n');

  // ---------------------------------------------------------------------------
  // BƯỚC 2: KHỞI TẠO CÁC TRẠM GIAO NHẬN (HUBS)
  // Tạo 2 trạm trung tâm: 1 tại Hà Nội (Cầu Giấy) và 1 tại TP.HCM (Quận 1)
  // ---------------------------------------------------------------------------
  console.log('🏢 [BƯỚC 2/6] Tạo danh sách Trạm giao nhận mẫu (Hubs)...');
  const hubHanoi = await prisma.hub.create({
    data: {
      code: 'HUB-HAN-01',
      name: 'Trạm Giao Nhận Cầu Giấy - Hà Nội',
      address: 'Số 144 Xuân Thủy, Phường Dịch Vọng Hậu',
      province: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      phone: '02437689999',
      status: HubStatus.ACTIVE,
    },
  });

  const hubSaigon = await prisma.hub.create({
    data: {
      code: 'HUB-SGN-01',
      name: 'Trạm Giao Nhận Bến Nghé - TP.HCM',
      address: 'Số 2 Nguyễn Bỉnh Khiêm, Phường Bến Nghé',
      province: 'Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Bến Nghé',
      phone: '02838291111',
      status: HubStatus.ACTIVE,
    },
  });
  console.log(`   ✔ Tạo thành công: [${hubHanoi.code}] ${hubHanoi.name}`);
  console.log(`   ✔ Tạo thành công: [${hubSaigon.code}] ${hubSaigon.name}\n`);

  // ---------------------------------------------------------------------------
  // BƯỚC 3: KHỞI TẠO TÀI KHOẢN NHÂN SỰ (USERS) VỚI CÁC VAI TRÒ
  // Mật khẩu mặc định chung cho toàn bộ tài khoản demo: '123456789'
  // ---------------------------------------------------------------------------
  console.log('👥 [BƯỚC 3/6] Tạo danh sách Tài khoản Nhân sự (Admin, Manager, Staff, Shipper)...');
  const saltRounds = 10;
  const defaultPasswordHash = await bcrypt.hash('123456789', saltRounds);

  // 3.1 Super Admin (Quản trị viên toàn hệ thống, không gán cố định trạm nào)
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: defaultPasswordHash,
      fullName: 'Nguyễn Hải Nam',
      email: 'love2206nm@gmail.com',
      phone: '0901000001',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // 3.2 Hub Manager (Quản lý trạm Cầu Giấy)
  const managerUser = await prisma.user.create({
    data: {
      hubId: hubHanoi.id,
      username: 'manager.cg',
      passwordHash: defaultPasswordHash,
      fullName: 'Nguyễn Văn Quản Lý (Hub Manager)',
      email: 'manager.cg@delivery.vn',
      phone: '0902000002',
      role: UserRole.HUB_MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  // 3.3 Hub Staff / Dispatcher (Nhân viên điều phối kho Cầu Giấy)
  const staffUser = await prisma.user.create({
    data: {
      hubId: hubHanoi.id,
      username: 'staff.cg',
      passwordHash: defaultPasswordHash,
      fullName: 'Lê Thị Điều Phối (Hub Staff)',
      email: 'staff.cg@delivery.vn',
      phone: '0903000003',
      role: UserRole.HUB_STAFF,
      status: UserStatus.ACTIVE,
    },
  });

  // 3.4 Shippers (Nhân viên giao hàng trạm Cầu Giấy)
  const shipper1 = await prisma.user.create({
    data: {
      hubId: hubHanoi.id,
      username: 'shipper01',
      passwordHash: defaultPasswordHash,
      fullName: 'Phạm Văn Giao Hàng (Shipper Tuyến 1)',
      email: 'shipper01@delivery.vn',
      phone: '0904000004',
      role: UserRole.SHIPPER,
      status: UserStatus.ACTIVE,
    },
  });

  const shipper2 = await prisma.user.create({
    data: {
      hubId: hubHanoi.id,
      username: 'shipper02',
      passwordHash: defaultPasswordHash,
      fullName: 'Hoàng Văn Vận Chuyển (Shipper Tuyến 2)',
      email: 'shipper02@delivery.vn',
      phone: '0905000005',
      role: UserRole.SHIPPER,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`   ✔ Admin     : ${adminUser.username} | ${adminUser.email}`);
  console.log(`   ✔ Manager   : ${managerUser.username} | ${managerUser.email}`);
  console.log(`   ✔ Staff     : ${staffUser.username} | ${staffUser.email}`);
  console.log(`   ✔ Shipper 1 : ${shipper1.username} | ${shipper1.phone}`);
  console.log(`   ✔ Shipper 2 : ${shipper2.username} | ${shipper2.phone}\n`);

  // ---------------------------------------------------------------------------
  // BƯỚC 4: KHỞI TẠO TUYẾN GIAO HÀNG (DELIVERY ZONES) & PHÂN TUYẾN SHIPPER
  // ---------------------------------------------------------------------------
  console.log('🗺️ [BƯỚC 4/6] Tạo tuyến đường địa bàn và phân công cho Shipper...');
  const zone1 = await prisma.deliveryZone.create({
    data: {
      hubId: hubHanoi.id,
      code: 'ZONE-CG-01',
      name: 'Tuyến Dịch Vọng Hậu - Trần Thái Tông',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      description: 'Bao gồm trục đường Xuân Thủy, Trần Thái Tông, Duy Tân',
    },
  });

  const zone2 = await prisma.deliveryZone.create({
    data: {
      hubId: hubHanoi.id,
      code: 'ZONE-CG-02',
      name: 'Tuyến Mai Dịch - Hồ Tùng Mậu',
      district: 'Cầu Giấy',
      ward: 'Mai Dịch',
      description: 'Bao gồm trục đường Hồ Tùng Mậu, Doãn Kế Thiện, Phạm Văn Đồng',
    },
  });

  // Gán Shipper 1 phụ trách Tuyến 1, Shipper 2 phụ trách Tuyến 2
  await prisma.shipperZone.createMany({
    data: [
      { shipperId: shipper1.id, zoneId: zone1.id, status: 'ACTIVE' },
      { shipperId: shipper2.id, zoneId: zone2.id, status: 'ACTIVE' },
    ],
  });
  console.log(`   ✔ Gán [${shipper1.username}] -> ${zone1.name}`);
  console.log(`   ✔ Gán [${shipper2.username}] -> ${zone2.name}\n`);

  // ---------------------------------------------------------------------------
  // BƯỚC 5: KHỞI TẠO ĐƠN HÀNG MẪU BAO QUÁT CÁC VÒNG ĐỜI TRẠNG THÁI
  // Giúp demo ngay lập tức các Use Cases: Quét Inbound, Gán đơn, Giao thành công, Giao thất bại
  // ---------------------------------------------------------------------------
  console.log('📦 [BƯỚC 5/6] Tạo 5 Đơn hàng mẫu ở các trạng thái khác nhau...');

  // 5.1 Đơn 1: Trạng thái CREATED (Vừa tạo, chưa nhập kho)
  const order1 = await prisma.order.create({
    data: {
      trackingCode: 'TRK-20261029-0001',
      senderName: 'Cửa hàng Quần áo Zara HN',
      senderPhone: '0988111222',
      senderAddress: 'Số 10 Tràng Tiền, Hoàn Kiếm, Hà Nội',
      receiverName: 'Đặng Thùy Linh',
      receiverPhone: '0912345678',
      receiverAddress: 'Phòng 502, Tòa nhà FPT, Phố Duy Tân',
      receiverProvince: 'Hà Nội',
      receiverDistrict: 'Cầu Giấy',
      receiverWard: 'Dịch Vọng Hậu',
      weightGram: 650,
      lengthCm: 25,
      widthCm: 20,
      heightCm: 10,
      codAmount: 350000,
      shippingFee: 30000,
      paymentBy: PaymentBy.RECEIVER,
      paymentStatus: PaymentStatus.UNPAID,
      currentStatus: OrderStatus.CREATED,
      notes: 'Hàng quần áo, cho khách xem hàng không cho thử',
    },
  });

  // 5.2 Đơn 2: Trạng thái AT_HUB (Đã quét mã nhập trạm Cầu Giấy, đang chờ gán shipper)
  const order2 = await prisma.order.create({
    data: {
      trackingCode: 'TRK-20261029-0002',
      currentHubId: hubHanoi.id,
      senderName: 'Công ty Cổ phần Sách Fahasa',
      senderPhone: '0977222333',
      senderAddress: 'Số 338 Phố Huế, Hai Bà Trưng, Hà Nội',
      receiverName: 'Nguyễn Tiến Dũng',
      receiverPhone: '0987654321',
      receiverAddress: 'Số 18 Ngõ 86, Đường Cầu Giấy',
      receiverProvince: 'Hà Nội',
      receiverDistrict: 'Cầu Giấy',
      receiverWard: 'Dịch Vọng Hậu',
      weightGram: 1200,
      lengthCm: 30,
      widthCm: 22,
      heightCm: 8,
      codAmount: 0, // Đã thanh toán trước, không thu COD
      shippingFee: 25000,
      paymentBy: PaymentBy.SENDER,
      paymentStatus: PaymentStatus.PAID,
      currentStatus: OrderStatus.AT_HUB,
      notes: 'Sách giáo trình, gọi trước khi giao 15 phút',
    },
  });

  // 5.3 Đơn 3: Trạng thái OUT_FOR_DELIVERY (Đang giao bởi Shipper 1)
  const order3 = await prisma.order.create({
    data: {
      trackingCode: 'TRK-20261029-0003',
      currentHubId: hubHanoi.id,
      assignedShipperId: shipper1.id,
      senderName: 'Shop Mỹ phẩm Hàn Quốc Glow',
      senderPhone: '0966333444',
      senderAddress: 'Số 85 Nguyễn Chí Thanh, Đống Đa, Hà Nội',
      receiverName: 'Lê Phương Thảo',
      receiverPhone: '0933445566',
      receiverAddress: 'Số 25 Phố Duy Tân',
      receiverProvince: 'Hà Nội',
      receiverDistrict: 'Cầu Giấy',
      receiverWard: 'Dịch Vọng Hậu',
      weightGram: 400,
      lengthCm: 15,
      widthCm: 10,
      heightCm: 5,
      codAmount: 480000,
      shippingFee: 20000,
      paymentBy: PaymentBy.RECEIVER,
      paymentStatus: PaymentStatus.UNPAID,
      currentStatus: OrderStatus.OUT_FOR_DELIVERY,
      notes: 'Hàng mỹ phẩm dễ vỡ, xin nhẹ tay',
    },
  });

  // 5.4 Đơn 4: Trạng thái DELIVERED (Đã giao thành công, thu đủ COD và có ảnh POD)
  const order4 = await prisma.order.create({
    data: {
      trackingCode: 'TRK-20261029-0004',
      currentHubId: hubHanoi.id,
      assignedShipperId: shipper1.id,
      senderName: 'Phụ kiện Điện tử Anker',
      senderPhone: '0944555666',
      senderAddress: 'Số 50 Thái Hà, Đống Đa, Hà Nội',
      receiverName: 'Vũ Đức Minh',
      receiverPhone: '0977889900',
      receiverAddress: 'Số 100 Đường Trần Thái Tông',
      receiverProvince: 'Hà Nội',
      receiverDistrict: 'Cầu Giấy',
      receiverWard: 'Dịch Vọng Hậu',
      weightGram: 300,
      lengthCm: 12,
      widthCm: 8,
      heightCm: 4,
      codAmount: 250000,
      shippingFee: 22000,
      paymentBy: PaymentBy.RECEIVER,
      paymentStatus: PaymentStatus.PAID,
      currentStatus: OrderStatus.DELIVERED,
      notes: 'Cục sạc nhanh Type-C',
    },
  });

  // 5.5 Đơn 5: Trạng thái FAILED_ATTEMPT (Giao thất bại lần 1, khách không nghe máy)
  const order5 = await prisma.order.create({
    data: {
      trackingCode: 'TRK-20261029-0005',
      currentHubId: hubHanoi.id,
      assignedShipperId: shipper2.id,
      senderName: 'Giày Thể Thao SneakerHub',
      senderPhone: '0911777888',
      senderAddress: 'Số 200 Chùa Bộc, Đống Đa, Hà Nội',
      receiverName: 'Trần Bảo Nam',
      receiverPhone: '0966778899',
      receiverAddress: 'Số 45 Đường Hồ Tùng Mậu',
      receiverProvince: 'Hà Nội',
      receiverDistrict: 'Cầu Giấy',
      receiverWard: 'Mai Dịch',
      weightGram: 900,
      lengthCm: 32,
      widthCm: 20,
      heightCm: 12,
      codAmount: 850000,
      shippingFee: 35000,
      paymentBy: PaymentBy.RECEIVER,
      paymentStatus: PaymentStatus.UNPAID,
      currentStatus: OrderStatus.FAILED_ATTEMPT,
      deliveryAttempts: 1,
      maxAttempts: 3,
      notes: 'Khách gọi 3 cuộc không bắt máy, hẹn giao lại ca sau',
    },
  });
  console.log(`   ✔ [${order1.trackingCode}] -> ${order1.currentStatus}`);
  console.log(`   ✔ [${order2.trackingCode}] -> ${order2.currentStatus} (Tại trạm Cầu Giấy)`);
  console.log(`   ✔ [${order3.trackingCode}] -> ${order3.currentStatus} (Shipper 01 đang giao)`);
  console.log(`   ✔ [${order4.trackingCode}] -> ${order4.currentStatus} (Đã thu COD 250.000đ)`);
  console.log(`   ✔ [${order5.trackingCode}] -> ${order5.currentStatus} (Lần 1 không liên lạc được)\n`);

  // ---------------------------------------------------------------------------
  // BƯỚC 6: KHỞI TẠO LỊCH SỬ KIỂM VẾT BẤT BIẾN (ORDER STATUS LOGS)
  // ---------------------------------------------------------------------------
  console.log('📜 [BƯỚC 6/6] Tạo bản ghi Kiểm vết lịch sử hành trình (OrderStatusLogs)...');
  await prisma.orderStatusLog.createMany({
    data: [
      // Logs cho Đơn 2
      {
        orderId: order2.id,
        hubId: hubHanoi.id,
        actorId: staffUser.id,
        previousStatus: OrderStatus.CREATED,
        newStatus: OrderStatus.AT_HUB,
        note: 'Quét mã Inbound nhập kho thành công tại Trạm Cầu Giấy',
      },
      // Logs cho Đơn 4 (Đã giao thành công)
      {
        orderId: order4.id,
        hubId: hubHanoi.id,
        actorId: staffUser.id,
        previousStatus: OrderStatus.AT_HUB,
        newStatus: OrderStatus.OUT_FOR_DELIVERY,
        note: 'Bàn giao cho Shipper Phạm Văn Giao Hàng đi phát',
      },
      {
        orderId: order4.id,
        hubId: hubHanoi.id,
        actorId: shipper1.id,
        previousStatus: OrderStatus.OUT_FOR_DELIVERY,
        newStatus: OrderStatus.DELIVERED,
        proofImageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
        locationLat: 21.033333,
        locationLng: 105.783333,
        note: 'Giao tận tay người nhận, đã thu đủ 250.000đ tiền COD',
      },
      // Logs cho Đơn 5 (Thất bại lần 1)
      {
        orderId: order5.id,
        hubId: hubHanoi.id,
        actorId: shipper2.id,
        previousStatus: OrderStatus.OUT_FOR_DELIVERY,
        newStatus: OrderStatus.FAILED_ATTEMPT,
        failureReason: 'CUSTOMER_UNREACHABLE',
        locationLat: 21.036667,
        locationLng: 105.775556,
        note: 'Gọi 3 cuộc liên tiếp vào lúc 14:30 nhưng thuê bao không liên lạc được',
      },
    ],
  });
  console.log('   ✔ Đã tạo 4 bản ghi kiểm vết mẫu cho Timeline tracking.\n');

  console.log('🎉 [HOÀN TẤT] Quá trình seed dữ liệu thành công 100%!');
  console.log('👉 Bây giờ bạn có thể mở giao diện quản lý bằng lệnh:');
  console.log('   $ npm run db:studio\n');
}

main()
  .catch((error) => {
    console.error('❌ [LỖI SEED]:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
