/**
 * @file clean_mock_data.ts
 * @description Script dọn dẹp và xóa sạch toàn bộ dữ liệu giả lập (Mock Data) khỏi PostgreSQL.
 * Nhận diện an toàn dựa trên tiền tố 'MOCK-' và 'mock_', không chạm vào dữ liệu thật hay seed gốc.
 * @module scripts
 */

import { PrismaClient } from '@prisma/client';

const defaultPrisma = new PrismaClient();

export interface CleanMockResult {
  detailsDeleted: number;
  settlementsDeleted: number;
  logsDeleted: number;
  ordersDeleted: number;
  shipperZonesDeleted: number;
  zonesDeleted: number;
  usersDeleted: number;
  hubsDeleted: number;
}

/**
 * Xóa sạch toàn bộ dữ liệu giả lập mang tiền tố MOCK theo thứ tự phụ thuộc khóa ngoại.
 * @param prismaClient Tùy chọn truyền instance PrismaClient
 */
export async function cleanMockData(prismaClient: PrismaClient = defaultPrisma): Promise<CleanMockResult> {
  console.log('🧹 [MOCK CLEAN] Bắt đầu dọn dẹp các bản ghi Mock Data...');

  // 1. Xóa chi tiết phiên đối soát COD mock
  const delDetails = await prismaClient.cODSettlementDetail.deleteMany({
    where: {
      OR: [
        { settlement: { settlementCode: { startsWith: 'MOCK-' } } },
        { settlement: { shipper: { username: { startsWith: 'mock_' } } } },
        { settlement: { hub: { code: { startsWith: 'MOCK-' } } } },
        { order: { trackingCode: { startsWith: 'MOCK-' } } },
        { order: { currentHub: { code: { startsWith: 'MOCK-' } } } },
      ],
    },
  });

  // 2. Xóa phiên đối soát COD mock
  const delSettlements = await prismaClient.cODSettlement.deleteMany({
    where: {
      OR: [
        { settlementCode: { startsWith: 'MOCK-' } },
        { shipper: { username: { startsWith: 'mock_' } } },
        { hub: { code: { startsWith: 'MOCK-' } } },
      ],
    },
  });

  // 3. Xóa log kiểm vết đơn hàng mock
  const delLogs = await prismaClient.orderStatusLog.deleteMany({
    where: {
      OR: [
        { order: { trackingCode: { startsWith: 'MOCK-' } } },
        { order: { currentHub: { code: { startsWith: 'MOCK-' } } } },
        { hub: { code: { startsWith: 'MOCK-' } } },
        { actor: { username: { startsWith: 'mock_' } } },
      ],
    },
  });

  // 4. Xóa đơn hàng mock
  const delOrders = await prismaClient.order.deleteMany({
    where: {
      OR: [
        { trackingCode: { startsWith: 'MOCK-' } },
        { currentHub: { code: { startsWith: 'MOCK-' } } },
        { assignedShipper: { username: { startsWith: 'mock_' } } },
      ],
    },
  });

  // 5. Xóa phân công tuyến cho Shipper mock
  const delShipperZones = await prismaClient.shipperZone.deleteMany({
    where: {
      OR: [
        { shipper: { username: { startsWith: 'mock_' } } },
        { zone: { code: { startsWith: 'MOCK-' } } },
      ],
    },
  });

  // 6. Xóa tuyến giao hàng mock
  const delZones = await prismaClient.deliveryZone.deleteMany({
    where: {
      code: { startsWith: 'MOCK-' },
    },
  });

  // 7. Xóa tài khoản nhân sự mock
  const delUsers = await prismaClient.user.deleteMany({
    where: {
      username: { startsWith: 'mock_' },
    },
  });

  // 8. Xóa trạm giao nhận mock
  const delHubs = await prismaClient.hub.deleteMany({
    where: {
      code: { startsWith: 'MOCK-' },
    },
  });

  console.log(`   ✔ Đã xóa ${delOrders.count} đơn hàng, ${delUsers.count} nhân sự, ${delHubs.count} trạm mock.`);
  console.log('✨ [MOCK CLEAN] Dọn dẹp Mock Data hoàn tất, CSDL đã được làm sạch!\n');

  return {
    detailsDeleted: delDetails.count,
    settlementsDeleted: delSettlements.count,
    logsDeleted: delLogs.count,
    ordersDeleted: delOrders.count,
    shipperZonesDeleted: delShipperZones.count,
    zonesDeleted: delZones.count,
    usersDeleted: delUsers.count,
    hubsDeleted: delHubs.count,
  };
}

// Thực thi khi gọi trực tiếp qua CLI (node / tsx)
if (process.argv[1]?.includes('clean_mock_data')) {
  cleanMockData(defaultPrisma)
    .catch((err) => {
      console.error('❌ [LỖI CLEAN MOCK]:', err);
      process.exit(1);
    })
    .finally(async () => {
      await defaultPrisma.$disconnect();
    });
}

