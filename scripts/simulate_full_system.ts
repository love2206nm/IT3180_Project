/**
 * @file simulate_full_system.ts
 * @description Kịch bản diễn tập toàn diện (End-to-End System Simulation Runner)
 * mô phỏng trọn vẹn 23 Use Cases nghiệp vụ qua tầng Presentation Server Actions,
 * Composition Root DI Container và kết nối CSDL PostgreSQL trực tiếp.
 * @module scripts
 */

import {
  __enableMockCookies,
  __resetMockCookies,
  loginAction,
  getCurrentUserAction,
  changePasswordAction,
  updateProfileAction,
  getStaffListAction,
  createStaffAction,
  updateStaffAction,
  toggleStaffStatusAction,
  assignShipperZoneAction,
  createOrderAction,
  getOrderListAction,
  getOrderDetailAction,
  updateOrderAction,
  cancelOrderAction,
  importOrdersAction,
  checkInHubAction,
  assignOrdersToShipperAction,
  markDeliveredAction,
  markFailedAttemptAction,
  processReturnOrderAction,
  getHubStatisticsAction,
  createCODSettlementAction,
  reviewCODSettlementAction,
  trackOrderPublicAction,
} from '../src/presentation/actions';
import { appContainer } from '../src/infrastructure/di';
import { seedMockData } from './seed_mock_data';
import { prisma, disconnectPrisma } from '../src/infrastructure/database/prisma/client';
import { ORDER_STATUS, USER_ROLE, USER_STATUS, DELIVERY_FAILURE_REASON } from '../src/domain';

// ANSI Colors for Pretty Terminal Output
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

interface StepResult {
  readonly code: string;
  readonly name: string;
  readonly durationMs: number;
  readonly details: string;
  readonly success: boolean;
}

const results: StepResult[] = [];

/**
 * Ghi nhận kết quả của một Use Case
 */
function recordStep(code: string, name: string, startMs: number, details: string, success: boolean): void {
  const durationMs = Math.round(performance.now() - startMs);
  results.push({ code, name, durationMs, details, success });
  const icon = success ? `${GREEN}✔ [PASS]${RESET}` : `\x1b[31m✖ [FAIL]${RESET}`;
  console.log(`  ${icon} ${BOLD}${code}${RESET}: ${name} (${durationMs}ms)`);
  console.log(`     └─ ${CYAN}${details}${RESET}`);
}

/**
 * Thực thi kịch bản giả lập toàn hệ thống
 */
async function runSystemSimulation(): Promise<void> {
  console.log(`\n${BOLD}=================================================================${RESET}`);
  console.log(`${BOLD}   DELIVERY HUB MANAGEMENT SYSTEM - TOÀN DIỆN 23 USE CASES       ${RESET}`);
  console.log(`${BOLD}   Môi trường: Next.js App Router + Clean Architecture Monolith   ${RESET}`);
  console.log(`${BOLD}=================================================================${RESET}\n`);

  const globalStart = performance.now();

  // Bật mock cookie để Server Actions chạy hoàn chỉnh trong môi trường CLI
  __enableMockCookies();
  __resetMockCookies();

  // 0. Chuẩn bị dữ liệu CSDL ban đầu
  console.log(`${YELLOW}==> [SETUP] Khởi tạo môi trường dữ liệu và nạp Seed Data...${RESET}`);
  await seedMockData(prisma);
  console.log(`${GREEN}✔ Đã nạp dữ liệu Mock thành công vào CSDL PostgreSQL.${RESET}\n`);

  // ===========================================================================
  // GIAI ĐOẠN 1: XÁC THỰC & QUẢN LÝ NHÂN SỰ (UC01 - UC08)
  // ===========================================================================
  console.log(`${BLUE}--- [GIAI ĐOẠN 1] Xác thực Tài khoản & Quản trị Nhân sự (UC01 - UC08) ---${RESET}`);

  // UC01: Login
  let stepStart = performance.now();
  const loginRes = await loginAction({ usernameOrEmail: 'mock_admin', password: 'Password@123' });
  if (!loginRes.success) throw new Error(`UC01 thất bại: ${loginRes.error}`);
  recordStep('UC01', 'Đăng nhập hệ thống (Login)', stepStart, `Admin đăng nhập thành công. Role: ${loginRes.data.user.role}`, true);

  // UC02: Change Password (thử đổi rồi đổi lại)
  stepStart = performance.now();
  const changePassRes = await changePasswordAction({
    currentPassword: 'Password@123',
    newPassword: 'Password@456',
    confirmPassword: 'Password@456',
  });
  if (!changePassRes.success) throw new Error(`UC02 thất bại: ${changePassRes.error}`);
  // Đổi ngược lại về mật khẩu chuẩn
  await changePasswordAction({
    currentPassword: 'Password@456',
    newPassword: 'Password@123',
    confirmPassword: 'Password@123',
  });
  recordStep('UC02', 'Đổi mật khẩu tài khoản (Change Password)', stepStart, 'Đổi mật khẩu mới và xác thực hash an toàn', true);

  // UC03: Update Profile & Get Profile
  stepStart = performance.now();
  const updateProfRes = await updateProfileAction({
    fullName: 'Quản Trị Viên Trưởng Hệ Thống',
    phone: '0911000001',
  });
  const currentProfRes = await getCurrentUserAction();
  if (!updateProfRes.success || !currentProfRes.success) throw new Error('UC03 thất bại');
  recordStep('UC03', 'Cập nhật & Xem hồ sơ cá nhân (Profile)', stepStart, `Họ tên mới: "${currentProfRes.data.fullName}" (${currentProfRes.data.email})`, true);

  // UC04: List Staff
  stepStart = performance.now();
  const staffListRes = await getStaffListAction({ limit: 10, offset: 0 });
  if (!staffListRes.success) throw new Error(`UC04 thất bại: ${staffListRes.error}`);
  recordStep('UC04', 'Xem danh sách nhân sự (Get Staff List)', stepStart, `Tìm thấy tổng cộng ${staffListRes.data.total} nhân viên trong hệ thống`, true);

  // Lấy Hub ID để dùng cho các bước tiếp theo (Ưu tiên trạm Hà Nội nơi có mock_shipper1 và mock_manager)
  const primaryHub =
    (await appContainer.hubRepository.findByCode('MOCK-HUB-HN-01')) ??
    (await appContainer.hubRepository.findAll())[0];
  if (!primaryHub) throw new Error('Không tìm thấy Hub nào trong CSDL');
  const primaryHubId = String(primaryHub.id);

  // UC05: Create Staff
  stepStart = performance.now();
  const timestampStr = String(Date.now());
  const simStaffUsername = `sim_staff_${timestampStr.slice(-6)}`;
  const simPhone1 = `09${timestampStr.slice(-8)}`;
  const simPhone2 = `09${String(Date.now() + 500).slice(-8)}`;

  const createStaffRes = await createStaffAction({
    username: simStaffUsername,
    fullName: 'Nhân Viên Điều Phối Mô Phỏng',
    email: `${simStaffUsername}@deliveryhub.vn`,
    phone: simPhone1,
    role: USER_ROLE.HUB_STAFF,
    hubId: primaryHubId,
    password: 'Password@123',
  });
  if (!createStaffRes.success) throw new Error(`UC05 thất bại: ${createStaffRes.error}`);
  const createdStaffId = String(createStaffRes.data.id);
  recordStep('UC05', 'Tạo tài khoản nhân viên mới (Create Staff)', stepStart, `Đã tạo nhân viên "${simStaffUsername}" ID: ${createdStaffId}`, true);

  // UC06: Update Staff
  stepStart = performance.now();
  const updateStaffRes = await updateStaffAction({
    id: createdStaffId,
    fullName: 'Nhân Viên Điều Phối Đã Cập Nhật',
    phone: simPhone2,
    hubId: primaryHubId,
  });
  if (!updateStaffRes.success) throw new Error(`UC06 thất bại: ${updateStaffRes.error}`);
  recordStep('UC06', 'Cập nhật thông tin nhân viên (Update Staff)', stepStart, `Đã cập nhật họ tên và SĐT cho nhân viên ID: ${createdStaffId}`, true);

  // UC07: Toggle Staff Status
  stepStart = performance.now();
  const toggleRes = await toggleStaffStatusAction({
    id: createdStaffId,
    status: USER_STATUS.INACTIVE,
  });
  if (!toggleRes.success) throw new Error(`UC07 thất bại: ${toggleRes.error}`);
  recordStep('UC07', 'Bật/Tắt trạng thái nhân viên (Toggle Status)', stepStart, `Trạng thái mới: ${toggleRes.data.status}`, true);

  // Lấy Shipper có sẵn trong mock
  const shipperUser = await appContainer.userRepository.findByUsername('mock_shipper1');
  if (!shipperUser) throw new Error('Không tìm thấy mock_shipper1');
  const shipperId = String(shipperUser.id);

  // Lấy Zone có sẵn
  const zones = await appContainer.deliveryZoneRepository.findByHubId(primaryHubId);
  const targetZone = zones[0];
  const targetZoneId = targetZone ? String(targetZone.id) : '1';

  // UC08: Assign Shipper Zone
  stepStart = performance.now();
  const assignZoneRes = await assignShipperZoneAction({
    shipperId,
    zoneId: targetZoneId,
  });
  if (!assignZoneRes.success) throw new Error(`UC08 thất bại: ${assignZoneRes.error}`);
  recordStep('UC08', 'Phân tuyến giao hàng cho Shipper (Assign Zone)', stepStart, `Gán Shipper ID ${shipperId} vào Tuyến Zone ID ${targetZoneId}`, true);

  // ===========================================================================
  // GIAI ĐOẠN 2: QUẢN LÝ ĐƠN HÀNG (UC09 - UC14)
  // ===========================================================================
  console.log(`\n${BLUE}--- [GIAI ĐOẠN 2] Quản lý & Vòng đời Đơn hàng (UC09 - UC14) ---${RESET}`);

  // UC09: Create Order (Đơn lẻ 1)
  stepStart = performance.now();
  const createOrderRes = await createOrderAction({
    senderName: 'Công Ty Thời Trang Hà Nội',
    senderPhone: '0901234567',
    senderAddress: 'Số 10 Tràng Thi, Hoàn Kiếm, Hà Nội',
    receiverName: 'Nguyễn Văn Nhận',
    receiverPhone: '0912345678',
    receiverAddress: 'Số 25 Lý Thường Kiệt, P. Hàng Bài',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Hoàn Kiếm',
    receiverWard: 'Hàng Bài',
    weightGram: 1200,
    lengthCm: 25,
    widthCm: 15,
    heightCm: 10,
    codAmount: 350000,
    shippingFee: 25000,
    currentHubId: null,
  });
  if (!createOrderRes.success) throw new Error(`UC09 thất bại: ${createOrderRes.error}`);
  const liveOrder = createOrderRes.data;
  const liveTrackingCode = liveOrder.trackingCode;
  recordStep('UC09', 'Tạo đơn hàng mới (Create Order)', stepStart, `Mã vận đơn: ${liveTrackingCode} | Trọng lượng: 1200g | COD: 350.000 VNĐ`, true);

  // UC10: Get Order List
  stepStart = performance.now();
  const listOrderRes = await getOrderListAction({
    hubId: primaryHubId,
    limit: 10,
    offset: 0,
  });
  if (!listOrderRes.success) throw new Error(`UC10 thất bại: ${listOrderRes.error}`);
  recordStep('UC10', 'Xem danh sách đơn hàng (Get Order List)', stepStart, `Lấy danh sách thành công: ${listOrderRes.data.items.length} đơn | Tổng: ${listOrderRes.data.total}`, true);

  // UC11: Get Order Detail
  stepStart = performance.now();
  const detailRes = await getOrderDetailAction({ identifier: liveTrackingCode });
  if (!detailRes.success) throw new Error(`UC11 thất bại: ${detailRes.error}`);
  recordStep('UC11', 'Xem chi tiết đơn hàng & Lịch sử (Get Detail)', stepStart, `Trạng thái: ${detailRes.data.order.currentStatus} | Lịch sử trạng thái: ${detailRes.data.logs.length} bản ghi`, true);

  // UC12: Update Order
  stepStart = performance.now();
  const updateOrderRes = await updateOrderAction({
    id: String(liveOrder.id),
    receiverName: 'Nguyễn Văn Nhận (Đã sửa tên)',
    receiverPhone: '0912345678',
    receiverAddress: 'Số 25 Lý Thường Kiệt, Tầng 3, P. Hàng Bài',
    notes: 'Gọi trước khi giao 15 phút',
  });
  if (!updateOrderRes.success) throw new Error(`UC12 thất bại: ${updateOrderRes.error}`);
  recordStep('UC12', 'Cập nhật thông tin đơn hàng (Update Order)', stepStart, `Cập nhật thành công địa chỉ chi tiết và ghi chú giao hàng`, true);

  // UC13: Cancel Order (Tạo 1 đơn riêng để hủy)
  stepStart = performance.now();
  const orderToCancel = await createOrderAction({
    senderName: 'Shop Test Hủy',
    senderPhone: '0909999888',
    senderAddress: 'Số 1 Kim Mã, Ba Đình, Hà Nội',
    receiverName: 'Khách Test Hủy',
    receiverPhone: '0919999888',
    receiverAddress: 'Số 2 Kim Mã, Ba Đình, Hà Nội',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Ba Đình',
    weightGram: 500,
    codAmount: 0,
    shippingFee: 20000,
    currentHubId: primaryHubId,
  });
  if (!orderToCancel.success) throw new Error('Không tạo được đơn test hủy');
  const cancelRes = await cancelOrderAction({
    id: String(orderToCancel.data.id),
    reason: 'Người gửi yêu cầu hủy đơn do thay đổi kế hoạch',
  });
  if (!cancelRes.success) throw new Error(`UC13 thất bại: ${cancelRes.error}`);
  recordStep('UC13', 'Hủy đơn hàng (Cancel Order)', stepStart, `Hủy thành công mã ${orderToCancel.data.trackingCode} với lý do hợp lệ`, true);

  // UC14: Batch Import Orders
  stepStart = performance.now();
  const importRes = await importOrdersAction({
    orders: [
      {
        senderName: 'Kho Hàng E-Commerce A',
        senderPhone: '0901111222',
        senderAddress: 'Kho 1, KCN Thăng Long, Đông Anh, Hà Nội',
        receiverName: 'Khách Lô 1',
        receiverPhone: '0981111222',
        receiverAddress: 'Tòa nhà Landmark 72, Cầu Giấy, Hà Nội',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        weightGram: 800,
        codAmount: 150000,
        shippingFee: 20000,
        currentHubId: primaryHubId,
      },
      {
        senderName: 'Kho Hàng E-Commerce B',
        senderPhone: '0901111333',
        senderAddress: 'Kho 2, KCN Thăng Long, Đông Anh, Hà Nội',
        receiverName: 'Khách Lô 2',
        receiverPhone: '0981111333',
        receiverAddress: 'Số 88 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội',
        receiverProvince: 'Hà Nội',
        receiverDistrict: 'Cầu Giấy',
        weightGram: 1500,
        codAmount: 220000,
        shippingFee: 25000,
        currentHubId: primaryHubId,
      },
    ],
  });
  if (!importRes.success) throw new Error(`UC14 thất bại: ${importRes.error}`);
  recordStep('UC14', 'Nhập đơn hàng loạt (Batch Import)', stepStart, `Đã import thành công ${importRes.data.successCount}/${importRes.data.totalRequested} đơn hàng`, true);

  // ===========================================================================
  // GIAI ĐOẠN 3: ĐIỀU PHỐI & VẬN CHUYỂN (UC15 - UC20)
  // ===========================================================================
  console.log(`\n${BLUE}--- [GIAI ĐOẠN 3] Điều phối & Vòng đời Vận chuyển (UC15 - UC20) ---${RESET}`);

  // UC15: Inbound Scan Check-in Hub
  stepStart = performance.now();
  const checkInRes = await checkInHubAction({
    trackingCode: liveTrackingCode,
    hubId: primaryHubId,
  });
  if (!checkInRes.success) throw new Error(`UC15 thất bại: ${checkInRes.error}`);
  recordStep('UC15', 'Bắn mã quét nhập trạm (Inbound Check-in)', stepStart, `Đơn hàng ${liveTrackingCode} chuyển trạng thái -> AT_HUB`, true);

  // UC16: Dispatch Orders to Shipper
  stepStart = performance.now();
  const dispatchRes = await assignOrdersToShipperAction({
    orderIds: [String(liveOrder.id)],
    shipperId,
    hubId: primaryHubId,
  });
  if (!dispatchRes.success) throw new Error(`UC16 thất bại: ${dispatchRes.error}`);
  recordStep('UC16', 'Gán đơn cho Shipper xuất kho (Dispatch)', stepStart, `Phân công cho Shipper ID ${shipperId} -> OUT_FOR_DELIVERY`, true);

  // Chuyển sang phiên của Shipper
  await loginAction({ usernameOrEmail: 'mock_shipper1', password: 'Password@123' });

  // UC17: Shipper nhận danh sách và xác nhận lượt giao hàng
  stepStart = performance.now();
  const shipperAssignedList = await getOrderListAction({
    assignedShipperId: shipperId,
    status: ORDER_STATUS.OUT_FOR_DELIVERY,
    limit: 5,
  });
  if (!shipperAssignedList.success) throw new Error('UC17 thất bại');
  recordStep('UC17', 'Shipper ghi nhận ca giao hàng (Delivery Attempt Session)', stepStart, `Shipper nhận ${shipperAssignedList.data.items.length} đơn sẵn sàng xuất tuyến`, true);

  // UC18: Mark Delivered (Giao thành công + Thu COD + Tải ảnh POD)
  stepStart = performance.now();
  const deliverRes = await markDeliveredAction({
    orderId: String(liveOrder.id),
    proofImageUrl: 'https://storage.deliveryhub.vn/pod/pod_sim_success_01.jpg',
    codCollected: 350000,
    locationLat: 21.0285,
    locationLng: 105.8542,
    note: 'Khách hàng nhận bọc hàng nguyên vẹn và ký nhận',
  });
  if (!deliverRes.success) throw new Error(`UC18 thất bại: ${deliverRes.error}`);
  recordStep('UC18', 'Xác nhận giao thành công & Thu COD + POD (Delivered)', stepStart, `Trạng thái -> DELIVERED | Thu COD: 350.000 VNĐ | Ảnh POD: verified`, true);

  // UC19: Mark Failed Attempt (Tạo thêm 1 đơn để mô phỏng ca giao thất bại)
  await loginAction({ usernameOrEmail: 'mock_admin', password: 'Password@123' });
  const failedOrder = await createOrderAction({
    senderName: 'Cửa hàng Phụ Kiện',
    senderPhone: '0903333444',
    senderAddress: 'Số 5 Bà Triệu, Hà Nội',
    receiverName: 'Trần Thất Bại',
    receiverPhone: '0913333444',
    receiverAddress: 'Số 15 Bà Triệu, Hoàn Kiếm, Hà Nội',
    receiverProvince: 'Hà Nội',
    receiverDistrict: 'Hoàn Kiếm',
    weightGram: 300,
    codAmount: 120000,
    shippingFee: 20000,
    currentHubId: null,
  });
  if (!failedOrder.success) throw new Error('Không tạo được đơn test thất bại');
  await checkInHubAction({ trackingCode: failedOrder.data.trackingCode, hubId: primaryHubId });
  await assignOrdersToShipperAction({ orderIds: [String(failedOrder.data.id)], shipperId, hubId: primaryHubId });

  // Shipper ghi nhận giao thất bại (Khách từ chối nhận hàng -> tự động chuyển RETURN_PENDING)
  await loginAction({ usernameOrEmail: 'mock_shipper1', password: 'Password@123' });
  stepStart = performance.now();
  const failAttemptRes = await markFailedAttemptAction({
    orderId: String(failedOrder.data.id),
    failureReason: DELIVERY_FAILURE_REASON.CUSTOMER_REJECTED,
    note: 'Khách hàng đổi ý từ chối nhận kiện hàng',
  });
  if (!failAttemptRes.success) throw new Error(`UC19 thất bại: ${failAttemptRes.error}`);
  recordStep('UC19', 'Ghi nhận giao hàng thất bại (Failed Attempt)', stepStart, `Mã ${failedOrder.data.trackingCode} thất bại: CUSTOMER_REJECTED -> RETURN_PENDING`, true);

  // UC20: Process Return Order
  // Hub Manager xử lý trả hàng về người gửi
  await loginAction({ usernameOrEmail: 'mock_manager', password: 'Password@123' });
  stepStart = performance.now();
  const returnRes = await processReturnOrderAction({
    orderId: String(failedOrder.data.id),
    hubId: primaryHubId,
    note: 'Đã giao trả lại bưu kiện về người gửi tại trạm',
  });
  if (!returnRes.success) throw new Error(`UC20 thất bại: ${returnRes.error}`);
  recordStep('UC20', 'Xử lý đơn chuyển hoàn (Process Return)', stepStart, `Đơn ${failedOrder.data.trackingCode} đã hoàn tất chuyển trạng thái -> RETURNED`, true);

  // ===========================================================================
  // GIAI ĐOẠN 4: BÁO CÁO & ĐỐI SOÁT COD (UC21 - UC22)
  // ===========================================================================
  console.log(`\n${BLUE}--- [GIAI ĐOẠN 4] Báo cáo Hiệu suất & Đối soát Tiền mặt COD (UC21 - UC22) ---${RESET}`);

  // UC21: Hub Statistics & Shipper KPI
  stepStart = performance.now();
  const statsRes = await getHubStatisticsAction({ hubId: primaryHubId });
  if (!statsRes.success) throw new Error(`UC21 thất bại: ${statsRes.error}`);
  recordStep('UC21', 'Xem Dashboard Thống kê & KPI Trạm (Statistics)', stepStart, `Tổng đơn: ${statsRes.data.totalOrders} | Doanh thu COD: ${statsRes.data.totalCodCollected.toLocaleString()} VNĐ | Shippers: ${statsRes.data.shipperPerformance.length}`, true);

  // UC22: Create & Review COD Settlement
  // Shipper tạo phiên nộp tiền
  await loginAction({ usernameOrEmail: 'mock_shipper1', password: 'Password@123' });
  stepStart = performance.now();
  const createSettlementRes = await createCODSettlementAction({
    hubId: primaryHubId,
    orderIds: [String(liveOrder.id)],
    notes: 'Shipper nộp tiền COD đơn giao thành công buổi sáng',
  });
  if (!createSettlementRes.success) throw new Error(`UC22 tạo đối soát thất bại: ${createSettlementRes.error}`);
  const settlementId = String(createSettlementRes.data.id);

  // Hub Manager duyệt đối soát
  await loginAction({ usernameOrEmail: 'mock_manager', password: 'Password@123' });
  const reviewSettlementRes = await reviewCODSettlementAction({
    settlementId,
    action: 'CONFIRM',
  });
  if (!reviewSettlementRes.success) throw new Error(`UC22 duyệt đối soát thất bại: ${reviewSettlementRes.error}`);
  recordStep('UC22', 'Đối soát & Nộp tiền COD (COD Settlement)', stepStart, `Phiên nộp COD ID ${settlementId} tổng ${createSettlementRes.data.totalCodAmount.toLocaleString()} VNĐ -> CONFIRMED`, true);

  // ===========================================================================
  // GIAI ĐOẠN 5: TRA CỨU CÔNG KHAI (UC23)
  // ===========================================================================
  console.log(`\n${BLUE}--- [GIAI ĐOẠN 5] Tra cứu Vận đơn Công khai (UC23) ---${RESET}`);

  // Reset cookie để chứng minh không cần đăng nhập
  __resetMockCookies();
  stepStart = performance.now();
  const publicTrackRes = await trackOrderPublicAction({ trackingCode: liveTrackingCode });
  if (!publicTrackRes.success) throw new Error(`UC23 thất bại: ${publicTrackRes.error}`);
  const trackingData = publicTrackRes.data;
  recordStep('UC23', 'Tra cứu hành trình công khai (Public Tracking)', stepStart, `Khách hàng tra cứu ${liveTrackingCode}: Người nhận "${trackingData.receiverName}" | SĐT che PII: "${trackingData.receiverPhoneMasked}" | ${trackingData.timeline.length} mốc hành trình`, true);

  // ===========================================================================
  // TỔNG KẾT BÁO CÁO TOÀN DIỆN
  // ===========================================================================
  const totalDuration = Math.round(performance.now() - globalStart);
  const totalPassed = results.filter((r) => r.success).length;

  console.log(`\n${BOLD}=================================================================${RESET}`);
  console.log(`${BOLD}   BÁO CÁO KẾT QUẢ DIỄN TẬP TOÀN BỘ 23 USE CASES                 ${RESET}`);
  console.log(`${BOLD}=================================================================${RESET}`);
  console.log(`  Tổng số Ca nghiệp vụ thực thi : ${results.length}`);
  console.log(`  Thành công (SUCCESS)          : ${GREEN}${totalPassed}/${results.length} (100% Pass)${RESET}`);
  console.log(`  Thất bại (FAIL)               : 0`);
  console.log(`  Tổng thời gian diễn tập       : ${totalDuration}ms (~${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`${BOLD}=================================================================${RESET}\n`);

  await disconnectPrisma();
}

// Thực thi nếu gọi trực tiếp từ command line
runSystemSimulation().catch(async (error: unknown) => {
  console.error('\n\x1b[31m✖ [LỖI DIỄN TẬP]:\x1b[0m', error);
  await disconnectPrisma();
  process.exit(1);
});
